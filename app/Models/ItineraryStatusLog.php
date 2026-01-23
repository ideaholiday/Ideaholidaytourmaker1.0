<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItineraryStatusLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'itinerary_id',
        'from_status',
        'to_status',
        'user_id',
        'role',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function itinerary()
    {
        return $this->belongsTo(Itinerary::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
