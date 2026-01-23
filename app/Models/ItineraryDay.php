<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItineraryDay extends Model
{
    protected $fillable = [
        'itinerary_id',
        'day_number',
        'title',
        'description',
        'city',
    ];

    public function itinerary()
    {
        return $this->belongsTo(Itinerary::class);
    }

    public function services()
    {
        return $this->hasMany(ItineraryService::class, 'day_id');
    }
}
