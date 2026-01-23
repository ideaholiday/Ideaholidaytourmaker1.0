<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierVoucher extends Model
{
    protected $fillable = [
        'itinerary_id',
        'supplier_id',
        'voucher_number',
        'status',
        'confirmed_at',
    ];

    protected $casts = [
        'confirmed_at' => 'datetime',
    ];

    public function itinerary()
    {
        return $this->belongsTo(Itinerary::class);
    }

    public function supplier()
    {
        return $this->belongsTo(User::class, 'supplier_id');
    }
}
