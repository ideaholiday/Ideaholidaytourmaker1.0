<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use App\Enums\UserRole;
use App\Models\Permission;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUlids;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'company_name',
        'status',
        'phone',
        'city'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'role' => UserRole::class,
        'credit_limit' => 'decimal:2',
        'bank_details' => 'array',
        'branding_config' => 'array',
        'assigned_destinations' => 'array',
        'linked_inventory_ids' => 'array',
        // 'permissions' array cast removed as we now use relational permissions
    ];

    /**
     * Get all permissions assigned to this user's role.
     * Cached for performance (1 hour).
     */
    public function permissions(): Collection
    {
        return Cache::remember(
            "permissions:user:{$this->id}",
            3600,
            fn () => Permission::whereIn(
                'id',
                DB::table('role_permissions')
                    ->where('role', $this->role->value)
                    ->pluck('permission_id')
            )->pluck('key')
        );
    }

    /**
     * Check if user has specific permission key.
     */
    public function hasPermission(string $permission): bool
    {
        // Admin Bypass (Optional, but safe for Super Admins)
        if ($this->role === UserRole::ADMIN) {
            return true;
        }

        return $this->permissions()->contains($permission);
    }

    /**
     * Clear permission cache (Call this when updating roles).
     */
    public function clearPermissionCache(): void
    {
        Cache::forget("permissions:user:{$this->id}");
    }
}
