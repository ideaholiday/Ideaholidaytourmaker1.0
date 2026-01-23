<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Enums\InventoryStatus;

class Product extends Model
{
    use HasUuids, SoftDeletes;

    /**
     * Transient flag to allow status updates from the StateMachine service.
     */
    public bool $allowStatusUpdate = false;

    protected $guarded = [];

    // Relationships
    public function versions()
    {
        return $this->hasMany(ProductVersion::class)->orderBy('version_number', 'desc');
    }

    /**
     * Get the active version used for NEW itineraries.
     */
    public function currentVersion()
    {
        return $this->belongsTo(ProductVersion::class, 'current_version_id');
    }

    public function supplier()
    {
        return $this->belongsTo(User::class, 'supplier_id');
    }

    // --- DOMAIN RULES ---

    protected static function booted()
    {
        static::updating(function ($product) {
            // Block direct status manipulation outside of StateMachine
            if ($product->isDirty('status') && !$product->allowStatusUpdate) {
                throw new \Exception('Direct status update forbidden. Use InventoryStateMachine service.');
            }
        });
    }

    // --- SCOPES ---

    /**
     * Scope for Agents: Only show APPROVED and active inventory.
     */
    public function scopeApproved(Builder $query)
    {
        return $query->where('status', InventoryStatus::APPROVED->value);
    }

    /**
     * Scope for Operators: Show own inventory regardless of status.
     */
    public function scopeForOperator(Builder $query, string $operatorId)
    {
        return $query->where('supplier_id', $operatorId);
    }

    /**
     * Scope for Admin: Filter by status if needed.
     */
    public function scopePendingApproval(Builder $query)
    {
        return $query->where('status', InventoryStatus::SUBMITTED->value);
    }

    // Helpers
    public function getLatestNetCostAttribute()
    {
        return $this->currentVersion?->net_cost;
    }
    
    public function getLatestCurrencyAttribute()
    {
        return $this->currentVersion?->currency;
    }
}
