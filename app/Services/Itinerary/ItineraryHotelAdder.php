<?php

namespace App\Services\Itinerary;

use App\Models\Itinerary;
use App\Models\ItineraryService;
use App\Models\Hotel;
use App\Models\HotelRoomRate;

class ItineraryHotelAdder
{
    /**
     * Adds a hotel stay to the itinerary.
     * Creates an immutable snapshot of the hotel details and rate.
     */
    public function add(
        Itinerary $itinerary,
        int $checkInDayId, // ID of the ItineraryDay record
        int $nights,
        int $rooms,
        string $hotelId,
        string $roomRateId
    ): void {
        
        if (!$itinerary->isEditable()) {
            throw new \Exception('Itinerary is locked. Cannot add services.');
        }

        // 1. Fetch & Validate Data
        $hotel = Hotel::approved()->active()->findOrFail($hotelId);
        $rate = HotelRoomRate::approved()->where('hotel_id', $hotelId)->findOrFail($roomRateId);

        // (Optional: Add logic here to check blackout dates against itinerary dates)

        // 2. Calculate Internal Net Cost
        // Formula: Unit Cost * Nights * Rooms
        $totalNetCost = $rate->net_cost * $nights; // Note: 'quantity' in ItineraryService handles room count

        // 3. Create Snapshot
        ItineraryService::create([
            'itinerary_id' => $itinerary->id,
            'day_id' => $checkInDayId,
            'service_type' => 'HOTEL',

            // Linkage (For Admin reference)
            'inventory_type' => 'HOTEL',
            'inventory_id' => $hotel->id,
            'supplier_id' => $hotel->supplier_id,

            // Snapshot Data (What the Agent sees)
            'service_name' => $hotel->name,
            'description_snapshot' => $hotel->description, 
            'inclusions_snapshot' => $rate->meal_plan, // e.g. "Breakfast Included"

            // Metadata
            'meta_data' => [
                'room_type' => $rate->room_type,
                'meal_plan' => $rate->meal_plan,
                'star_rating' => $hotel->star_rating,
                'check_in_day_id' => $checkInDayId,
                'nights' => $nights,
                'city' => $hotel->city->name ?? 'Unknown',
            ],

            // Pricing Truth (Hidden from Agent)
            'supplier_net' => $totalNetCost,
            'supplier_currency' => $rate->currency,

            // Quantity (Rooms)
            'quantity' => $rooms,
            'duration_nights' => $nights,
        ]);
    }
}
