<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsAppLog extends Model
{
    protected $fillable = [
        'itinerary_id',
        'recipient_role',
        'phone',
        'template_name',
        'status',
        'error',
        'message_id'
    ];

    public function itinerary()
    {
        return $this->belongsTo(Itinerary::class);
    }
}
