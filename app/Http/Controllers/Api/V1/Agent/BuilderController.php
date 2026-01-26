<?php

namespace App\Http\Controllers\Api\V1\Agent;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\Itinerary\BuilderPricingService;
use App\Services\Itinerary\ItineraryService;
use Illuminate\Support\Facades\DB;
use App\Models\Itinerary;

class BuilderController extends Controller
{
    protected $pricingService;
    protected $itineraryService;

    public function __construct(
        BuilderPricingService $pricingService,
        ItineraryService $itineraryService
    ) {
        $this->pricingService = $pricingService;
        $this->itineraryService = $itineraryService;
    }

    public function calculate(Request $request)
    {
        $validated = $request->validate([
            'days' => 'required|array',
            'pax' => 'required|integer|min:1',
            'currency' => 'sometimes|string|size:3',
            'markup' => 'sometimes|numeric|min:0'
        ]);

        $result = $this->pricingService->calculate(
            $request->user(), 
            $validated['days'],
            $validated['pax'],
            $request->input('currency', 'INR'),
            $request->input('markup')
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
            'currency' => 'sometimes|string|size:3',
            'markup' => 'sometimes|numeric|min:0'
        ]);

        $agent = $request->user();
        
        // 1. Calculate Pricing (Authority Check)
        $pricingResult = $this->pricingService->calculate(
            $agent, 
            $validated['days'], 
            $validated['pax'],
            $request->input('currency', 'INR'),
            $request->input('markup')
        );

        // 2. Delegate Persistence to Service
        // This ensures structure, metadata (JSON), and pricing are saved atomically
        $itinerary = $this->itineraryService->saveFromBuilder(
            $agent, 
            $validated, 
            $pricingResult
        );

        return response()->json([
            'id' => $itinerary->id, 
            'version' => $itinerary->version,
            'reference' => $itinerary->reference_code,
            'message' => 'Itinerary saved successfully.'
        ]);
    }

    public function lock(Request $request, $id)
    {
        $itinerary = Itinerary::where('agent_id', $request->user()->id)->findOrFail($id);
        
        $this->itineraryService->lock($itinerary);

        return response()->json([
            'id' => $itinerary->id,
            'is_locked' => true,
            'message' => 'Itinerary locked successfully.'
        ]);
    }
}
