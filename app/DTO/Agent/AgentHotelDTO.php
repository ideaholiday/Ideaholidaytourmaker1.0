
<?php

namespace App\DTO\Agent;

use App\Models\HotelVersion;

class AgentHotelDTO
{
    public static function from(HotelVersion $v): array
    {
        return [
            'id' => $v->id,
            'name' => $v->name,
            'star_rating' => $v->star_rating,
            'city' => $v->hotel->city->name ?? 'Unknown',
            'description' => $v->description,
        ];
    }
}
