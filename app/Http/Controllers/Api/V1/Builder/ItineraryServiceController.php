<?php

namespace App\Http\Controllers\Api\V1\Builder;

use App\Http\Controllers\Controller;
use App\Models\Itinerary;
use App\Models\ItineraryService;
use App\Services\Itinerary\ItineraryServiceAdder;
use Illuminate\Http\Request;

class ItineraryServiceController extends Controller
{
    public function add(Request $request, Itinerary $itinerary)
    {
        $request->validate([
            'day_id' => 'required|exists:itinerary_days,id',
            'inventory_id' => 'required|uuid', // ID of the Product
            'type' => 'required|in:HOTEL,ACTIVITY,TRANSFER' // Validation only, service uses Product type
        ]);

        try {
            app(ItineraryServiceAdder::class)
                ->addFromInventory(
                    itinerary: $itinerary,
                    dayId: $request->day_id,
                    inventoryId: $request->inventory_id
                );

            return response()->json(['status' => 'service_added', 'message' => 'Item added to itinerary.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function remove(Itinerary $itinerary, $serviceId)
    {
        if (!$itinerary->isEditable()) {
            return response()->json(['message' => 'Itinerary is locked.'], 403);
        }

        $service = ItineraryService::where('itinerary_id', $itinerary->id)
            ->where('id', $serviceId)
            ->firstOrFail();
            
        $service->delete();

        return response()->json(['status' => 'removed']);
    }
}
