<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Builder;

class Quote extends Model
{
    use HasUlids;

    protected $guarded = [];

    protected $casts = [
        'travel_date' => 'date',
        'is_net_cost_visible_to_operator' => 'boolean',
        'itinerary_snapshot' => 'array',
    ];

    // Relationships
    public function agent() { return $this->belongsTo(User::class, 'agent_id'); }
    public function operator() { return $this->belongsTo(User::class, 'assigned_operator_id'); }
    public function messages() { return $this->morphMany(Message::class, 'commentable'); }

    /**
     * SCOPE: Enforce row-level security based on user role.
     */
    public function scopeForUser(Builder $query, User $user)
    {
        if ($user->role === 'ADMIN' || $user->role === 'STAFF') {
            return $query; // See all
        }

        if ($user->role === 'AGENT') {
            return $query->where('agent_id', $user->id);
        }

        if ($user->role === 'OPERATOR') {
            // Operator only sees quotes assigned to them
            return $query->where('assigned_operator_id', $user->id);
        }

        return $query->whereRaw('1 = 0'); // Deny others
    }

    /**
     * Logic to determine the price displayed to the assigned Operator.
     */
    public function getOperatorPayableAmountAttribute()
    {
        if ($this->operator_fixed_price) {
            return $this->operator_fixed_price;
        }
        
        if ($this->is_net_cost_visible_to_operator) {
            return $this->net_cost;
        }

        return null; // Price hidden
    }
}
