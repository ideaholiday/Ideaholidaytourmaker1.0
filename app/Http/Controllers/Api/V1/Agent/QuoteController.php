<?php

namespace App\Http\Controllers\Api\V1\Agent;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Itinerary;
use App\Enums\ItineraryStatus;
use Illuminate\Support\Facades\DB;
// use App\Services\AuditLogService; // Assuming audit logging service exists or we log manually

class QuoteController extends Controller
{
    /**
     * List Agent's Active Quotes (Itineraries)
     */
    public function index(Request $request)
    {
        $quotes = Itinerary::where('agent_id', $request->user()->id)
            ->whereNotIn('status', [ItineraryStatus::BOOKED, ItineraryStatus::CANCELLED])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($quotes);
    }

    /**
     * Book an Itinerary
     */
    public function book(Request $request, $id)
    {
        $itinerary = Itinerary::where('agent_id', $request->user()->id)->findOrFail($id);

        if ($itinerary->status === ItineraryStatus::BOOKED) {
            return response()->json(['message' => 'Already booked.'], 400);
        }

        // Logic to convert to Booking or simply mark as BOOKED
        // For this architecture, we mark as BOOKED and notify Admin
        
        $itinerary->allowStatusUpdate = true;
        $itinerary->update([
            'status' => ItineraryStatus::BOOKED,
            'is_locked' => true,
        ]);

        // Create System Alert / Notification (Mocking Audit/Alert logic)
        // In real app: Notification::send(Admin::all(), new BookingRequested($itinerary));

        return response()->json([
            'message' => 'Booking requested successfully. Admin notified.',
            'status' => ItineraryStatus::BOOKED
        ]);
    }

    /**
     * Delete an Itinerary
     */
    public function destroy(Request $request, $id)
    {
        $itinerary = Itinerary::where('agent_id', $request->user()->id)->findOrFail($id);

        if ($itinerary->status === ItineraryStatus::BOOKED) {
            return response()->json(['message' => 'Cannot delete a booked itinerary.'], 403);
        }

        $itinerary->delete();

        return response()->json(['message' => 'Quote deleted successfully.']);
    }

    /**
     * Get Booked History
     */
    public function history(Request $request)
    {
        $history = Itinerary::where('agent_id', $request->user()->id)
            ->whereIn('status', [ItineraryStatus::BOOKED, ItineraryStatus::CANCELLED])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($history);
    }
}
