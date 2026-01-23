<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItineraryTraveller extends Model
{
    protected $fillable = [
        'itinerary_id',
        'type',
        'count',
    ];

    public function itinerary()
    {
        return $this->belongsTo(Itinerary::class);
    }
}
