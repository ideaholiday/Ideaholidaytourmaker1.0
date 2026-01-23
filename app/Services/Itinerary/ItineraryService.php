<?php

namespace App\Services\Itinerary;

use App\Models\Itinerary;
use App\Models\User;
use App\Models\Product;
use App\Enums\ItineraryStatus;
use App\Services\Pricing\PricingEngine;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\ItineraryDay;
use App\Models\ItineraryService as ItineraryServiceModel;

class ItineraryService
{
    public function __construct(
        protected ItineraryStateMachine $stateMachine,
        protected PricingEngine $pricingEngine
    ) {}

    /**
     * Create a brand new Itinerary shell.
     */
    public function create(User $agent, array $data): Itinerary
    {
        return DB::transaction(function () use ($agent, $data) {
            $reference = $this->generateReference();

            $itinerary = Itinerary::create([
                'id' => Str::uuid(),
                'agent_id' => $agent->id,
                'unique_ref_no' => $reference,
                'reference_code' => $reference, // redundancy based on schema evolution
                'version' => 1,
                'status' => ItineraryStatus::DRAFT,
                'is_locked' => false,
                'title' => $data['title'],
                'destination_summary' => $data['destination_summary'] ?? 'TBD',
                'travel_date' => $data['travel_date'] ?? null,
                'pax_count' => $data['pax_count'] ?? 2,
                'base_currency' => config('pricing.base_currency', 'USD'),
                'display_currency' => $data['currency'] ?? 'USD',
            ]);

            // Sync Structure (Days & Services) if provided
            if (!empty($data['days']) && is_array($data['days'])) {
                $this->syncStructure($itinerary, $data['days']);
            }

            // Create initial pricing snapshot (calculates based on services)
            $this->updatePricingSnapshot($itinerary);

            return $itinerary;
        });
    }

    /**
     * Update an existing itinerary (Header, Days, Services, and Price).
     * Strictly enforces that the itinerary must be editable (Draft/Submitted).
     */
    public function update(Itinerary $itinerary, array $data): Itinerary
    {
        if (!$itinerary->isEditable()) {
            throw new \Exception("Itinerary {$itinerary->reference_code} (v{$itinerary->version}) is locked and cannot be edited.");
        }

        return DB::transaction(function () use ($itinerary, $data) {
            // 1. Update Header
            $itinerary->update([
                'title' => $data['title'] ?? $itinerary->title,
                'destination_summary' => $data['destination_summary'] ?? $itinerary->destination_summary,
                'travel_date' => $data['travel_date'] ?? $itinerary->travel_date,
                'pax_count' => $data['pax_count'] ?? $itinerary->pax_count,
            ]);

            // 2. Sync Structure (Days & Services) if provided
            if (isset($data['days']) && is_array($data['days'])) {
                $this->syncStructure($itinerary, $data['days']);
            }

            // 3. Recalculate & Save Pricing Snapshot
            $this->updatePricingSnapshot($itinerary);

            return $itinerary->refresh();
        });
    }

    /**
     * Create a new Version (Draft) from a Locked Itinerary.
     * Performs a deep clone of the itinerary, its days, and its services.
     */
    public function createNextVersion(Itinerary $sourceItinerary, User $user): Itinerary
    {
        if (!$sourceItinerary->is_locked) {
            throw new \Exception("Cannot create a version from an unlocked draft. Edit the current version directly.");
        }

        return DB::transaction(function () use ($sourceItinerary, $user) {
            // 1. Replicate Header
            $newVersion = $sourceItinerary->replicate([
                'id', 'created_at', 'updated_at', 'submitted_at', 'approved_at', 
                'operator_id', 'legacy', 'pricing_snapshot'
            ]);

            $newVersion->id = Str::uuid();
            $newVersion->agent_id = $user->id; // The user creating the version becomes the owner
            $newVersion->version = $sourceItinerary->version + 1;
            $newVersion->status = ItineraryStatus::DRAFT;
            $newVersion->is_locked = false;
            $newVersion->reference_code = $sourceItinerary->reference_code;
            
            $newVersion->save();

            // 2. Deep Clone Relations
            $sourceItinerary->load(['days.services']);

            foreach ($sourceItinerary->days as $sourceDay) {
                $newDay = $newVersion->days()->create([
                    'day_number' => $sourceDay->day_number,
                    'title' => $sourceDay->title,
                    'description' => $sourceDay->description,
                    'city' => $sourceDay->city,
                ]);

                foreach ($sourceDay->services as $sourceService) {
                    // Replicate Service Model
                    $newService = $sourceService->replicate(['id', 'itinerary_id', 'day_id', 'created_at', 'updated_at']);
                    $newService->itinerary_id = $newVersion->id;
                    $newService->day_id = $newDay->id;
                    $newService->save();
                }
            }

            // 3. Initial Price Calc for new version
            $this->updatePricingSnapshot($newVersion);

            return $newVersion;
        });
    }

    /**
     * Orchestrate a Status Transition.
     */
    public function transitionStatus(Itinerary $itinerary, ItineraryStatus $status, User $user, ?string $note = null): Itinerary
    {
        return $this->stateMachine->transition($itinerary, $status, $user, $note);
    }

    /**
     * Hard Delete (or Soft Delete based on model).
     * Only allowed for Drafts.
     */
    public function delete(Itinerary $itinerary): void
    {
        if ($itinerary->is_locked || $itinerary->status === ItineraryStatus::BOOKED) {
            throw new \Exception("Cannot delete a locked or booked itinerary.");
        }
        $itinerary->delete();
    }

    // --- PROTECTED HELPERS ---

    protected function generateReference(): string
    {
        return 'IH-' . strtoupper(Str::random(2)) . date('y') . '-' . rand(1000, 9999);
    }

    protected function syncStructure(Itinerary $itinerary, array $daysPayload): void
    {
        // Full Replacement Strategy for simplicity and integrity
        $itinerary->services()->delete(); // Delete services first due to FK
        $itinerary->days()->delete();

        foreach ($daysPayload as $dayData) {
            $day = $itinerary->days()->create([
                'day_number' => $dayData['day_number'],
                'title' => $dayData['title'] ?? 'Day ' . $dayData['day_number'],
                'description' => $dayData['description'] ?? null,
                'city' => $dayData['city'] ?? $dayData['destination_id'] ?? null // Handle both formats
            ]);

            if (isset($dayData['services']) && is_array($dayData['services'])) {
                foreach ($dayData['services'] as $svcData) {
                    
                    // Cost Lookup Logic
                    $cost = 0;
                    $currency = 'USD';
                    $supplierId = null;

                    if (!empty($svcData['inventory_id'])) {
                        $product = Product::with('currentVersion')->find($svcData['inventory_id']);
                        if ($product && $product->currentVersion) {
                            $cost = $product->currentVersion->net_cost;
                            $currency = $product->currentVersion->currency;
                            $supplierId = $product->supplier_id;
                        }
                    } elseif (isset($svcData['cost'])) {
                        // Trust UI for custom/manual items
                        $cost = $svcData['cost'];
                        $currency = $svcData['currency'] ?? 'USD';
                    }

                    $itinerary->services()->create([
                        'day_id' => $day->id,
                        
                        // Inventory Link
                        'inventory_type' => $svcData['type'] ?? 'CUSTOM',
                        'inventory_id' => $svcData['inventory_id'] ?? null,
                        'supplier_id' => $supplierId,
                        
                        // Content Snapshot
                        'service_name' => $svcData['name'] ?? 'Service',
                        'description_snapshot' => $svcData['description'] ?? null,
                        
                        // Pricing (Stored)
                        'supplier_net' => $cost, 
                        'supplier_currency' => $currency,

                        // Config
                        'quantity' => $svcData['quantity'] ?? 1,
                        'duration_nights' => $svcData['nights'] ?? 1,
                        'meta_data' => $svcData['meta'] ?? [],
                    ]);
                }
            }
        }
    }

    protected function updatePricingSnapshot(Itinerary $itinerary): void
    {
        // Reload relations for accurate calc
        $itinerary->load('services');

        // Calculate
        $pricing = $this->pricingEngine->calculateForItinerary($itinerary);

        // Save to JSON column
        $itinerary->update([
            'pricing_snapshot' => [
                'base_total' => $pricing->base_total,
                'display_total' => $pricing->display_total,
                'rate_timestamp' => $pricing->rate_timestamp->toIso8601String(),
                'system_margin' => $pricing->breakdown['system_margin'] ?? 0, 
                'agent_markup' => $pricing->breakdown['agent_markup'] ?? 0,
                'tax' => $pricing->breakdown['tax'] ?? 0,
            ]
        ]);
    }
}
