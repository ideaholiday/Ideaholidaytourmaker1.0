<?php

namespace App\Events;

use App\Models\Itinerary;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ItineraryApproved
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Itinerary $itinerary
    ) {}
}
