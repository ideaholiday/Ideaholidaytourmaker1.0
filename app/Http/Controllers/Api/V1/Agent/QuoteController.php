<?php

namespace App\Http\Controllers\Api\V1\Agent;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\Pricing\PricingEngine;
use App\Models\Quote;
use App\Http\Resources\QuoteResource;

class QuoteController extends Controller
{
    protected $pricingEngine;

    public function __construct(PricingEngine $pricingEngine)
    {
        $this->pricingEngine = $pricingEngine;
    }

    public function store(Request $request)
    {
        // 1. Validate Input
        // Updated to require structure for Hotel/Transfer calculation
        $validated = $request->validate([
            'destination' => 'required|string',
            'travel_date' => 'required|date',
            'pax' => 'required|integer|min:1',
            'itinerary' => 'required|array',
            'itinerary.*.id' => 'required', // Product ID
            'itinerary.*.type' => 'required|in:HOTEL,TRANSFER,ACTIVITY,SIGHTSEEING',
            'itinerary.*.nights' => 'sometimes|integer|min:1', // For Hotels
            'itinerary.*.rooms' => 'sometimes|integer|min:1',  // For Hotels
            'itinerary.*.vehicles' => 'sometimes|integer|min:1', // For Transfers
        ]);

        // 2. Calculate Pricing (The Brains)
        $pricingResult = $this->pricingEngine->calculateForAgent(
            $request->user(), 
            $validated['itinerary'],
            $validated['pax']
        );

        // 3. Store Data (The Persistence)
        $quote = Quote::create([
            'unique_ref_no' => 'QT-'.strtoupper(uniqid()),
            'agent_id' => $request->user()->id,
            'destination' => $validated['destination'],
            'travel_date' => $validated['travel_date'],
            'pax_count' => $validated['pax'],
            
            // Financials from Engine
            'net_cost' => $pricingResult->netCost, 
            'selling_price' => $pricingResult->sellingPrice,
            'currency' => $pricingResult->currency,
            
            'itinerary_snapshot' => $pricingResult->lineItems,
            'status' => 'DRAFT'
        ]);

        // 4. Return Response
        return new QuoteResource($quote);
    }
}
