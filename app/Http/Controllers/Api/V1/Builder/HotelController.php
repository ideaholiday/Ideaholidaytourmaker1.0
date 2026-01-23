<?php

namespace App\Http\Controllers\Api\V1\Builder;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Hotel;
use App\Models\HotelRoomRate;
use App\Models\Itinerary;
use App\Services\Itinerary\ItineraryHotelAdder;

class HotelController extends Controller
{
    /**
     * Search Approved Hotels (Read-Only for Agents)
     */
    public function search(Request $request)
    {
        $request->validate([
            'city_id' => 'required|string',
        ]);

        // STRICT: Only Approved and Active
        $hotels = Hotel::approved()
            ->active()
            ->where('city_id', $request->city_id)
            ->with(['city'])
            ->get()
            ->map(function ($hotel) {
                return [
                    'id' => $hotel->id,
                    'name' => $hotel->name,
                    'star_rating' => $hotel->star_rating,
                    'description' => $hotel->description,
                    'location' => $hotel->city->name ?? '',
                    'thumbnail' => null, // Placeholder for image logic
                ];
            });

        return response()->json($hotels);
    }

    /**
     * Get Approved Rates for a Hotel
     */
    public function rates(Request $request, $hotelId)
    {
        $request->validate([
            'start_date' => 'required|date',
        ]);

        // STRICT: Approved rates only, valid for the date
        $rates = HotelRoomRate::where('hotel_id', $hotelId)
            ->approved()
            ->validForDate($request->start_date)
            ->get()
            ->map(function ($rate) {
                return [
                    'id' => $rate->id,
                    'room_type' => $rate->room_type,
                    'meal_plan' => $rate->meal_plan,
                    // NO COST RETURNED HERE FOR AGENTS
                    // Unless we decide to show an "Estimated B2B Price" calculated on fly
                    // For now, secure by default: Agent selects blind or system calc happens later
                ];
            });

        return response()->json($rates);
    }

    /**
     * Add Hotel to Itinerary
     */
    public function addToItinerary(Request $request, Itinerary $itinerary)
    {
        $request->validate([
            'day_id' => 'required|exists:itinerary_days,id',
            'hotel_id' => 'required|exists:hotels,id',
            'rate_id' => 'required|exists:hotel_room_rates,id',
            'nights' => 'required|integer|min:1',
            'rooms' => 'required|integer|min:1',
        ]);

        try {
            app(ItineraryHotelAdder::class)->add(
                $itinerary,
                $request->day_id,
                $request->nights,
                $request->rooms,
                $request->hotel_id,
                $request->rate_id
            );

            return response()->json(['message' => 'Hotel added to itinerary']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
