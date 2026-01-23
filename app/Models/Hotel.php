<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Hotel extends Model
{
    use HasUuids, SoftDeletes;

    protected $guarded = [];

    // Relationships
    public function supplier()
    {
        return $this->belongsTo(User::class, 'supplier_id');
    }

    public function roomRates()
    {
        return $this->hasMany(HotelRoomRate::class);
    }

    public function city()
    {
        return $this->belongsTo(Location::class, 'city_id');
    }

    // Scopes
    public function scopeApproved(Builder $query)
    {
        return $query->where('status', 'APPROVED');
    }

    public function scopeActive(Builder $query)
    {
        return $query->where('active', true);
    }

    public function scopeForSupplier(Builder $query, string $supplierId)
    {
        return $query->where('supplier_id', $supplierId);
    }
}
