
<?php

namespace App\DTO\Admin;

use App\Models\HotelVersion;

class AdminHotelDTO
{
    public static function from(HotelVersion $v): array
    {
        return [
            'id' => $v->id,
            'version' => $v->version,
            'name' => $v->name,
            'star_rating' => $v->star_rating,
            'description' => $v->description,
            'status' => $v->status,
            'approved_at' => $v->approved_at,
            'partner_id' => $v->hotel->hotel_partner_id,
            'partner_name' => $v->hotel->partner->name ?? 'Unknown',
        ];
    }
}
