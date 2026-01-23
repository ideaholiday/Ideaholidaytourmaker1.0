<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PricingAuditLog extends Model
{
    protected $guarded = []; // Allow mass assignment for internal service usage

    protected $casts = [
        'rate_timestamp' => 'datetime',
        'supplier_net' => 'decimal:4',
        'base_net' => 'decimal:4',
        'final_price' => 'decimal:4',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
