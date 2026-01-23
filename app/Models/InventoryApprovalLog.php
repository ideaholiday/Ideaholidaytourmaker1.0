<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryApprovalLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'from_status',
        'to_status',
        'actor_id',
        'actor_role',
        'remarks',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
