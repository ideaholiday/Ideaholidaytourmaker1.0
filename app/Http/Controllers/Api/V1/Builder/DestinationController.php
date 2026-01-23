<?php

namespace App\Http\Controllers\Api\V1\Builder;

use App\Http\Controllers\Controller;
use App\Models\Itinerary;
use Illuminate\Http\Request;
use App\Models\ItineraryDay;

class DestinationController extends Controller
{
    public function add(Request $request, Itinerary $itinerary)
    {
        $request->validate([
            'city_id' => 'required|string', // Assuming string IDs for now
            'nights' => 'required|integer|min:1',
        ]);

        // Logic to generate Day records based on nights
        // app(DestinationService::class)->addCity($itinerary, $request->city_id, $request->nights);
        
        // Simple implementation for demo:
        $startDay = $itinerary->days()->count() + 1;
        
        for ($i = 0; $i < $request->nights; $i++) {
            ItineraryDay::create([
                'itinerary_id' => $itinerary->id,
                'day_number' => $startDay + $i,
                'title' => 'Day ' . ($startDay + $i),
                'city' => $request->city_id
            ]);
        }

        return response()->json(['status' => 'added', 'days_generated' => $request->nights]);
    }
    
    public function reorder(Request $request, Itinerary $itinerary)
    {
        // Implementation for reordering city sequence and regenerating days
        return response()->json(['status' => 'reordered']);
    }
}
