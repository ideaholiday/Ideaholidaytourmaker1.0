<?php

namespace App\Http\Controllers\Api\V1\Builder;

use App\Http\Controllers\Controller;
use App\Models\Itinerary;
use App\Services\Itinerary\ItineraryService;
use Illuminate\Http\Request;

class ItineraryController extends Controller
{
    protected $service;

    public function __construct(ItineraryService $service)
    {
        $this->service = $service;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'destination' => 'required|string|max:255',
            'travel_date' => 'required|date',
            'pax' => 'required|integer|min:1',
            'currency' => 'required|string|size:3',
            'days' => 'nullable|array', // Allow days payload
            'days.*.day_number' => 'required_with:days|integer',
            'days.*.services' => 'nullable|array',
        ]);

        // Map request fields to service expected data
        $data = [
            'title' => $validated['title'],
            'destination_summary' => $validated['destination'],
            'travel_date' => $validated['travel_date'],
            'pax_count' => $validated['pax'],
            'currency' => $validated['currency'],
            'days' => $validated['days'] ?? [],
        ];

        $itinerary = $this->service->create(auth()->user(), $data);

        return response()->json($itinerary, 201);
    }

    public function show(Itinerary $itinerary)
    {
        // $this->authorize('view', $itinerary); // Policy check recommended
        
        return response()->json($itinerary->load(['days.services', 'travellers']));
    }

    public function commit(Itinerary $itinerary)
    {
        // $this->authorize('edit', $itinerary);

        // Logic to finalize draft, snapshot prices, and prepare for submission
        // app(ItineraryCommitService::class)->commit($itinerary);

        return response()->json(['status' => 'saved', 'version' => $itinerary->version]);
    }
}
