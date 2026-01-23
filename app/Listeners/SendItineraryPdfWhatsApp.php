<?php

namespace App\Listeners;

use App\Events\ItineraryApproved;
use App\Jobs\SendWhatsAppPdfJob;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendItineraryPdfWhatsApp implements ShouldQueue
{
    /**
     * Handle the event.
     */
    public function handle(ItineraryApproved $event): void
    {
        // Dispatch job to send PDF to the Agent
        SendWhatsAppPdfJob::dispatch(
            $event->itinerary->id,
            'agent'
        );
    }
}
