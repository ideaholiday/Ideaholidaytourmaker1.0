
<?php

namespace App\DTO\Admin;

use App\DTO\Agent\AgentItineraryDTO;
use App\Models\Itinerary;

class AdminItineraryDTO extends AgentItineraryDTO
{
    public static function from(Itinerary $itinerary): array
    {
        $data = parent::from($itinerary);

        $snapshot = $itinerary->pricing_snapshot;

        if ($snapshot) {
            $data['internal'] = [
                'base_currency' => $itinerary->base_currency,
                'supplier_cost' => $snapshot['base_total'] ?? 0,
                'system_margin' => $snapshot['system_margin'] ?? 0,
                'agent_markup' => $snapshot['agent_markup'] ?? 0,
                'operator_adjustment' => $snapshot['operator_adjustment'] ?? 0,
                'tax' => $snapshot['tax'] ?? 0,
                'profit' => $snapshot['system_margin'] ?? 0,
            ];
        }

        $data['operator'] = $itinerary->operator ? [
            'id' => $itinerary->operator->id,
            'name' => $itinerary->operator->name
        ] : null;

        return $data;
    }
}
    