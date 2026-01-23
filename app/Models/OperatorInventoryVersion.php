
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OperatorInventoryVersion extends Model
{
    protected $guarded = [];

    protected $casts = [
        'inclusions' => 'array',
        'exclusions' => 'array',
        'approved_at' => 'datetime',
    ];

    public function inventory()
    {
        return $this->belongsTo(OperatorInventoryItem::class, 'inventory_id');
    }
    
    public function city()
    {
        // Assuming city_id is on inventory parent or denormalized here. 
        // Based on previous structure, linking to Location via inventory relation usually.
        return $this->hasOneThrough(Location::class, OperatorInventoryItem::class, 'id', 'id', 'inventory_id', 'location_id');
    }

    /**
     * SECURITY: Block direct array serialization.
     * Forces developers to use DTOs.
     */
    public function toArray()
    {
        throw new \Exception('Direct serialization of Inventory Version forbidden. Use DTOs.');
    }
}
