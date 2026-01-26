<?php

namespace App\Services\Itinerary;

use App\Models\Itinerary;
use App\Models\User;
use App\Models\Product;
use App\Enums\ItineraryStatus;
use App\Services\Pricing\PricingEngine;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ItineraryService
{
    public function __construct(
        protected ItineraryStateMachine $stateMachine,
        protected PricingEngine $pricingEngine
    ) {}

    /**
     * Persist an Itinerary from the Builder UI (Header + Structure + Pricing).
     * Handles both New creation and Updates/Versioning.
     */
    public function saveFromBuilder(User $agent, array $data, array $pricingResult): Itinerary
    {
        return DB::transaction(function () use ($agent, $data, $pricingResult) {
            $itinerary = null;

            // 1. Version Control & Retrieval
            if (!empty($data['id'])) {
                $existing = Itinerary::find($data['id']);
                if ($existing) {
                    if ($existing->is_locked) {
                        // CASE A: Locked/Approved -> Create NEXT Version
                        $itinerary = $existing->createNextVersion($agent);
                    } else {
                        // CASE B: Draft/Approved(Editable) -> Update Existing
                        $itinerary = $existing;
                    }
                }
            }

            if (!$itinerary) {
                // CASE C: New Itinerary
                $itinerary = new Itinerary();
                $itinerary->id = Str::uuid();
                $itinerary->reference_code = 'QT-' . strtoupper(Str::random(6)) . date('my');
                $itinerary->agent_id = $agent->id;
                $itinerary->version = 1;
                $itinerary->is_locked = false;
            }

            // 2. Update Header
            $itinerary->allowStatusUpdate = true;
            $itinerary->fill([
                'title' => $data['title'],
                'destination_summary' => $data['destination_summary'],
                'travel_date' => $data['travel_date'],
                'pax_count' => $data['pax'],
                'display_currency' => $pricingResult['currency'],
                // Auto-approve for builder workflow
                'status' => ItineraryStatus::APPROVED,
                'approved_at' => now(),
            ]);

            // 3. Save Pricing Snapshot (Immutable Financial Record)
            $itinerary->pricing_snapshot = [
                'base_total' => $pricingResult['breakdown']['supplier_base'],
                'display_total' => $pricingResult['selling_price'],
                'net_cost' => $pricingResult['net_cost'],
                'system_margin' => $pricingResult['breakdown']['margin_base'],
                'agent_markup' => $pricingResult['breakdown']['markup_base'],
                'tax' => $pricingResult['breakdown']['tax_base'] ?? 0,
                'rate_timestamp' => now()->toIso8601String()
            ];

            $itinerary->save();

            // 4. Persist Structure (Days & Services)
            // Full replacement ensures clean state
            $itinerary->services()->delete(); 
            $itinerary->days()->delete(); 
            
            foreach ($data['days'] as $dayData) {
                $day = $itinerary->days()->create([
                    'day_number' => $dayData['day_number'],
                    'title' => $dayData['title'] ?? 'Day ' . $dayData['day_number'],
                    'description' => $dayData['description'] ?? null,
                    'city' => $dayData['destination_id'] ?? null // City Context
                ]);

                if (!empty($dayData['services'])) {
                    foreach ($dayData['services'] as $svc) {
                        $this->createItineraryService($itinerary, $day->id, $svc);
                    }
                }
            }

            return $itinerary->refresh();
        });
    }

    /**
     * Helper to Create Service Record
     */
    protected function createItineraryService(Itinerary $itinerary, int $dayId, array $svc): void
    {
        // Resolve Cost (Priority: DB > Input)
        $cost = 0;
        $currency = 'INR';
        $supplierId = null;

        if (!empty($svc['inventory_id'])) {
             // Try to find in DB to ensure integrity
             $product = Product::with('currentVersion')->find($svc['inventory_id']);
             if ($product && $product->currentVersion) {
                 $cost = $product->currentVersion->net_cost;
                 $currency = $product->currentVersion->currency;
                 $supplierId = $product->supplier_id;
             }
        }
        
        // Fallback for Custom Items or if DB lookup failed
        if ($cost == 0 && (isset($svc['cost']) || isset($svc['estimated_cost']))) {
            $cost = $svc['cost'] ?? $svc['estimated_cost'];
            $currency = $svc['currency'] ?? 'INR';
        }

        $itinerary->services()->create([
            'day_id' => $dayId,
            
            // Inventory Link
            'inventory_type' => $svc['type'],
            'inventory_id' => $svc['inventory_id'] ?? null,
            'supplier_id' => $supplierId,
            
            // Content Snapshot
            'service_name' => $svc['name'],
            'description_snapshot' => $svc['description'] ?? '', 
            
            // Pricing (Stored)
            'supplier_net' => is_numeric($cost) ? $cost : 0,
            'supplier_currency' => $currency,
            
            // Config
            'quantity' => $svc['quantity'] ?? 1,
            'duration_nights' => $svc['nights'] ?? 1,
            
            // JSON Meta Field (Persists rich structure like paxDetails, transferMode)
            'meta_data' => $svc['meta'] ?? []
        ]);
    }

    /**
     * Create a new Version from a Locked Itinerary.
     */
    public function createNextVersion(Itinerary $sourceItinerary, User $user): Itinerary
    {
        if (!$sourceItinerary->is_locked) {
            throw new \Exception("Cannot create a version from an unlocked draft. Edit the current version directly.");
        }

        return DB::transaction(function () use ($sourceItinerary, $user) {
            $newVersion = $sourceItinerary->replicate([
                'id', 'created_at', 'updated_at', 'submitted_at', 'approved_at', 
                'operator_id', 'legacy', 'pricing_snapshot'
            ]);

            $newVersion->id = Str::uuid();
            $newVersion->agent_id = $user->id;
            $newVersion->version = $sourceItinerary->version + 1;
            $newVersion->status = ItineraryStatus::APPROVED;
            $newVersion->approved_at = now();
            $newVersion->is_locked = false;
            $newVersion->reference_code = $sourceItinerary->reference_code;
            
            $newVersion->save();

            $sourceItinerary->load(['days.services']);

            foreach ($sourceItinerary->days as $sourceDay) {
                $newDay = $newVersion->days()->create([
                    'day_number' => $sourceDay->day_number,
                    'title' => $sourceDay->title,
                    'description' => $sourceDay->description,
                    'city' => $sourceDay->city,
                ]);

                foreach ($sourceDay->services as $sourceService) {
                    $newService = $sourceService->replicate(['id', 'itinerary_id', 'day_id', 'created_at', 'updated_at']);
                    $newService->itinerary_id = $newVersion->id;
                    $newService->day_id = $newDay->id;
                    $newService->save();
                }
            }

            return $newVersion;
        });
    }

    /**
     * Lock the itinerary to prevent further edits.
     */
    public function lock(Itinerary $itinerary): Itinerary
    {
        return DB::transaction(function () use ($itinerary) {
            $itinerary->allowStatusUpdate = true;
            $itinerary->update(['is_locked' => true]);
            return $itinerary;
        });
    }

    // ... (Keep existing methods like transitionStatus, delete, etc.)
    
    public function transitionStatus(Itinerary $itinerary, ItineraryStatus $status, User $user, ?string $note = null): Itinerary
    {
        return $this->stateMachine->transition($itinerary, $status, $user, $note);
    }

    public function delete(Itinerary $itinerary): void
    {
        if ($itinerary->is_locked || $itinerary->status === ItineraryStatus::BOOKED) {
            throw new \Exception("Cannot delete a locked or booked itinerary.");
        }
        $itinerary->delete();
    }
}
