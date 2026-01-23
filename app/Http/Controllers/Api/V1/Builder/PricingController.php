
<?php

namespace App\Http\Controllers\Api\V1\Builder;

use App\Http\Controllers\Controller;
use App\Models\Itinerary;
use App\Services\Pricing\PricingEngine;

class PricingController extends Controller
{
    public function calculate(Itinerary $itinerary)
    {
        // Delegate to Pricing Engine to aggregate costs
        $price = app(PricingEngine::class)->calculateForItinerary($itinerary);
        
        return response()->json([
            'base_total' => $price->base_total,
            'final_price' => $price->display_total, 
            'currency' => $price->currency,
            'breakdown' => $price->breakdown
        ]);
    }
}
