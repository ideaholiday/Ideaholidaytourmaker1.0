
<?php

namespace App\DTO\Agent;

use App\Models\Itinerary;

class AgentItineraryDTO
{
    public static function from(Itinerary $itinerary): array
    {
        $snapshot = $itinerary->pricing_snapshot;

        return [
            'reference' => $itinerary->reference_code,
            'title' => $itinerary->title,
            'status' => $itinerary->status->value,
            'days' => $itinerary->days->map(fn ($day) => [
                'day_number' => $day->day_number,
                'title' => $day->title,
                'services' => $day->services->map(fn ($s) => [
                    'type' => $s->service_type,
                    'name' => $s->service_name,
                    'description' => $s->description_snapshot,
                    'inclusions' => $s->meta_data['inclusions'] ?? [],
                ]),
            ]),
            'pricing' => [
                'total' => $snapshot['display_total'] ?? 0,
                'currency' => $itinerary->display_currency,
            ],
            // Documents
            'vouchers' => $itinerary->isApproved() ? $itinerary->vouchers->map(fn($v) => $v->voucher_number) : [],
        ];
    }
}
    