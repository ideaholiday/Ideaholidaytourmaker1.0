<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class HotelRoomRate extends Model
{
    use HasUuids, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'valid_from' => 'date',
        'valid_to' => 'date',
        'blackout_dates' => 'array',
        'net_cost' => 'decimal:2'
    ];

    public function hotel()
    {
        return $this->belongsTo(Hotel::class);
    }

    // Scopes
    public function scopeApproved(Builder $query)
    {
        return $query->where('status', 'APPROVED');
    }

    public function scopeValidForDate(Builder $query, string $date)
    {
        return $query->whereDate('valid_from', '<=', $date)
                     ->whereDate('valid_to', '>=', $date);
    }
}
