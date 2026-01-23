
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HotelVersion extends Model
{
    protected $guarded = [];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function hotel()
    {
        return $this->belongsTo(Hotel::class);
    }

    /**
     * SECURITY: Block direct array serialization.
     */
    public function toArray()
    {
        throw new \Exception('Direct serialization of Hotel Version forbidden. Use DTOs.');
    }
}
