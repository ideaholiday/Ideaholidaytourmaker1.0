
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HotelRoomRateVersion extends Model
{
    protected $guarded = [];

    protected $casts = [
        'valid_from' => 'date',
        'valid_to' => 'date',
        'blackout_dates' => 'array',
        'approved_at' => 'datetime',
        'base_cost' => 'decimal:2',
    ];

    public function roomRate()
    {
        return $this->belongsTo(HotelRoomRate::class, 'room_rate_id');
    }

    /**
     * SECURITY: Block direct array serialization.
     */
    public function toArray()
    {
        throw new \Exception('Direct serialization of Room Rate Version forbidden. Use DTOs.');
    }
}
