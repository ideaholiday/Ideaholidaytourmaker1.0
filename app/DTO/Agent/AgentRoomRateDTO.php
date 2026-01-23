
<?php

namespace App\DTO\Agent;

use App\Models\HotelRoomRateVersion;

class AgentRoomRateDTO
{
    public static function from(HotelRoomRateVersion $v): array
    {
        return [
            'id' => $v->id,
            'room_type' => $v->room_type,
            'meal_plan' => $v->meal_plan,
            'blackout_dates' => $v->blackout_dates,
        ];
    }
}
