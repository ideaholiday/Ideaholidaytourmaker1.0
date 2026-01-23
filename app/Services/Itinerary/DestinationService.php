<?php

namespace App\Services\Itinerary;

use App\Models\Itinerary;
use App\Models\ItineraryDay;
use Illuminate\Support\Facades\DB;

class DestinationService
{
    /**
     * Add a city with nights to an itinerary
     */
    public function addCity(Itinerary $itinerary, int $cityId, int $nights): void
    {
        if (!$itinerary->isEditable()) {
            throw new \Exception('Itinerary not editable');
        }

        DB::transaction(function () use ($itinerary, $cityId, $nights) {

            // Find last day number
            $startDay = $itinerary->days()->max('day_number') ?? 0;

            for ($i = 1; $i <= $nights; $i++) {
                ItineraryDay::create([
                    'itinerary_id' => $itinerary->id,
                    'day_number'   => $startDay + $i,
                    'city'         => $this->cityName($cityId),
                    'title'        => "Day " . ($startDay + $i),
                ]);
            }

            // Auto-insert inter-city transfer placeholder (if not first city)
            if ($startDay > 0) {
                $this->insertTransferPlaceholder($itinerary, $startDay + 1);
            }
        });
    }

    protected function cityName(int $cityId): string
    {
        return \DB::table('cities')->where('id', $cityId)->value('name') ?? 'Unknown City';
    }

    protected function insertTransferPlaceholder(Itinerary $itinerary, int $dayNumber): void
    {
        $dayId = $itinerary->days()->where('day_number', $dayNumber)->value('id');

        if ($dayId) {
            $itinerary->services()->create([
                'day_id'            => $dayId,
                'service_type'      => 'transfer',
                'name'              => 'Inter-city transfer (to be confirmed)',
                'city'              => '—',
                'supplier_net'      => 0,
                'supplier_currency' => $itinerary->base_currency,
                'meta'              => ['placeholder' => true],
            ]);
        }
    }
}
