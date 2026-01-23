
<?php

namespace App\DTO\Admin;

use App\Models\HotelRoomRateVersion;

class AdminRoomRateDTO
{
    public static function from(HotelRoomRateVersion $v): array
    {
        return [
            'id' => $v->id,
            'version' => $v->version,
            'room_type' => $v->room_type,
            'meal_plan' => $v->meal_plan,
            'base_cost' => $v->base_cost,
            'currency' => $v->currency,
            'valid_from' => $v->valid_from,
            'valid_to' => $v->valid_to,
            'status' => $v->status,
            'blackout_dates' => $v->blackout_dates,
        ];
    }
}
