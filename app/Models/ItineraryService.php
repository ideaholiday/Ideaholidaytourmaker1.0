<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItineraryService extends Model
{
    protected $fillable = [
        'itinerary_id',
        'day_id',
        
        // Inventory Link
        'inventory_type',
        'inventory_id',
        'supplier_id',
        
        // Snapshot Data
        'service_name',
        'description_snapshot',
        'inclusions_snapshot',
        
        // Pricing Snapshot
        'supplier_net',
        'supplier_currency',
        
        // Configuration
        'quantity',
        'duration_nights',
        'meta_data',
    ];

    protected $casts = [
        'meta_data' => 'array',
        'supplier_net' => 'decimal:4',
    ];

    public function itinerary()
    {
        return $this->belongsTo(Itinerary::class);
    }

    public function day()
    {
        return $this->belongsTo(ItineraryDay::class);
    }

    public function supplier()
    {
        return $this->belongsTo(User::class, 'supplier_id');
    }
}
