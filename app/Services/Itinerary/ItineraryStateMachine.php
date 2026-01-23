<?php

namespace App\Services\Itinerary;

use App\Models\Itinerary;
use App\Models\ItineraryStatusLog;
use App\Enums\ItineraryStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class ItineraryStateMachine
{
    /**
     * Transition the itinerary to a new status.
     *
     * @param Itinerary $itinerary
     * @param ItineraryStatus $to
     * @param User $user
     * @param string|null $note
     * @return Itinerary
     * @throws ValidationException
     */
    public function transition(
        Itinerary $itinerary,
        ItineraryStatus $to,
        User $user,
        string $note = null
    ): Itinerary {

        $from = $itinerary->status;

        // 1. Validate Transition Logic
        if (!in_array($to, $from->canTransitionTo(), true)) {
            throw ValidationException::withMessages([
                'status' => "Invalid status transition: {$from->value} -> {$to->value}",
            ]);
        }

        // 2. Execute Transition Transaction
        DB::transaction(function () use ($itinerary, $from, $to, $user, $note) {

            // Enable update on the protected model
            $itinerary->allowStatusUpdate = true;

            // Perform Update
            $itinerary->update([
                'status' => $to,
                'submitted_at' => $to === ItineraryStatus::SUBMITTED ? now() : $itinerary->submitted_at,
                'approved_at' => $to === ItineraryStatus::APPROVED ? now() : $itinerary->approved_at,
            ]);

            // Create Audit Log
            ItineraryStatusLog::create([
                'itinerary_id' => $itinerary->id,
                'from_status' => $from->value,
                'to_status' => $to->value,
                'user_id' => $user->id,
                'role' => $user->role->value,
                'created_at' => now(),
            ]);
        });

        return $itinerary->refresh();
    }
}
