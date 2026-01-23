<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $fillable = [
        'itinerary_id',
        'type',
        'path',
        'filename',
        'mime_type',
        'size_bytes'
    ];

    public function itinerary()
    {
        return $this->belongsTo(Itinerary::class);
    }
}
