<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItineraryPricingSnapshot extends Model
{
    protected $fillable = [
        'itinerary_id',
        'base_total',
        'display_total',
        'system_margin',
        'agent_markup',
        'operator_adjustment',
        'tax',
        'rate_timestamp',
    ];

    protected $casts = [
        'rate_timestamp' => 'datetime',
        'base_total' => 'decimal:4',
        'display_total' => 'decimal:4',
        'system_margin' => 'decimal:4',
        'agent_markup' => 'decimal:4',
        'operator_adjustment' => 'decimal:4',
        'tax' => 'decimal:4',
    ];

    public function itinerary()
    {
        return $this->belongsTo(Itinerary::class);
    }
}
