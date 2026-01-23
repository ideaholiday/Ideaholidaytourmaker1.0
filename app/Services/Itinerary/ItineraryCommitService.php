
<?php

namespace App\Services\Itinerary;

use App\Models\Itinerary;
use App\Services\Pricing\PricingEngine;
use Illuminate\Support\Facades\DB;

class ItineraryCommitService
{
    public function __construct(
        protected PricingEngine $pricing
    ) {}

    /**
     * Save itinerary + pricing snapshot
     */
    public function commit(Itinerary $itinerary): void
    {
        if (!$itinerary->isEditable()) {
            throw new \Exception('Cannot commit locked itinerary');
        }

        DB::transaction(function () use ($itinerary) {

            $price = $this->pricing->calculateForItinerary($itinerary);

            $itinerary->update([
                'pricing_snapshot' => [
                    'base_total'    => $price->base_total,
                    'display_total' => $price->display_total,
                    'rate_timestamp'=> $price->rate_timestamp,
                    'system_margin' => 0,
                    'agent_markup'  => 0,
                    'operator_adjustment' => 0,
                    'tax' => 0,
                ]
            ]);
        });
    }
}
    