<?php

namespace App\Http\Controllers\Api\V1\Agent;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\Itinerary\BuilderPricingService;
use App\Models\Itinerary;
use App\Enums\ItineraryStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BuilderController extends Controller
{
    protected $pricingService;

    public function __construct(BuilderPricingService $pricingService)
    {
        $this->pricingService = $pricingService;
    }

    public function calculate(Request $request)
    {
        $validated = $request->validate([
            'days' => 'required|array',
            'pax' => 'required|integer|min:1',
            'currency' => 'sometimes|string|size:3'
        ]);

        $result = $this->pricingService->calculate(
            $request->user(), 
            $validated['days'],
            $validated['pax'],
            $request->input('currency', 'INR') // Default to INR if missing
        );

        return response()->json($result);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id' => 'nullable|uuid',
            'title' => 'required|string',
            'destination_summary' => 'required|string',
            'travel_date' => 'required|date',
            'days' => 'required|array',
            'pax' => 'required|integer|min:1',
            'currency' => 'sometimes|string|size:3'
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $agent = $request->user();
            $itinerary = null;
            $requestedCurrency = $request->input('currency', 'INR');

            // 1. Version Control Strategy
            if (!empty($validated['id'])) {
                $existing = Itinerary::find($validated['id']);
                if ($existing) {
                    if ($existing->is_locked) {
                        // CASE A: Locked/Approved -> Create NEXT Version
                        $itinerary = $existing->createNextVersion($agent);
                    } else {
                        // CASE B: Draft -> Update Existing
                        $itinerary = $existing;
                    }
                }
            }

            if (!$itinerary) {
                // CASE C: New Itinerary
                $itinerary = new Itinerary();
                $itinerary->id = Str::uuid();
                $itinerary->reference_code = 'QT-' . strtoupper(Str::random(6)) . date('my'); // Unique Ref
                $itinerary->agent_id = $agent->id;
                $itinerary->version = 1;
                $itinerary->status = ItineraryStatus::DRAFT;
                $itinerary->is_locked = false;
            }

            // 2. Calculate Final Pricing (Backend Authority)
            $pricing = $this->pricingService->calculate(
                $agent, 
                $validated['days'], 
                $validated['pax'],
                $requestedCurrency
            );

            // Update Header Information
            $itinerary->title = $validated['title'];
            $itinerary->destination_summary = $validated['destination_summary'];
            $itinerary->travel_date = $validated['travel_date'];
            $itinerary->pax_count = $validated['pax'];
            $itinerary->display_currency = $pricing['currency'];
            
            // 3. Save Pricing Snapshot (Immutable Financial Record for THIS version)
            $itinerary->pricing_snapshot = [
                'base_total' => $pricing['breakdown']['supplier_base'],
                'display_total' => $pricing['selling_price'],
                'system_margin' => $pricing['breakdown']['margin_base'],
                'agent_markup' => $pricing['breakdown']['markup_base'],
                'operator_adjustment' => 0,
                'tax' => 0,
                'rate_timestamp' => now()->toIso8601String()
            ];
            
            $itinerary->save();

            // 4. Persist Days & Services
            // For a new version or updated draft, we strictly overwrite the day structure 
            $itinerary->days()->delete(); 
            
            foreach ($validated['days'] as $dayData) {
                $day = $itinerary->days()->create([
                    'day_number' => $dayData['day_number'],
                    'title' => $dayData['title'] ?? 'Day ' . $dayData['day_number'],
                    'city' => $dayData['destination_id'] // Mapping destination_id to city column
                ]);

                if (!empty($dayData['services'])) {
                    foreach ($dayData['services'] as $svc) {
                        $day->services()->create([
                            'inventory_type' => $svc['type'],
                            'inventory_id' => $svc['inventory_id'] ?? null,
                            'service_name' => $svc['name'],
                            'description_snapshot' => $svc['description'] ?? '', 
                            
                            'supplier_net' => 0, // Should be populated from lookup logic
                            'supplier_currency' => 'USD', // Default
                            
                            'quantity' => $svc['quantity'] ?? 1,
                            'duration_nights' => $svc['nights'] ?? 1,
                            'meta_data' => $svc['meta'] ?? []
                        ]);
                    }
                }
            }

            return response()->json([
                'id' => $itinerary->id, 
                'version' => $itinerary->version,
                'reference' => $itinerary->reference_code,
                'message' => 'Itinerary saved successfully'
            ]);
        });
    }
}
