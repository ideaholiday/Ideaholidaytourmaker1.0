
<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Hotel;
use App\Enums\HotelStatus;
use App\Enums\UserRole;

class HotelPolicy
{
    public function view(User $user, Hotel $hotel): bool
    {
        return match ($user->role) {
            UserRole::ADMIN => true,
            UserRole::OPERATOR => true, // Operators need to see hotels to create itineraries/inventory
            UserRole::SUPPLIER => $hotel->supplier_id === $user->id, // Changed hotel_partner to SUPPLIER
            UserRole::AGENT, UserRole::STAFF =>
                $hotel->status === HotelStatus::APPROVED->value,
            default => false,
        };
    }

    public function create(User $user): bool
    {
        return $user->role === UserRole::SUPPLIER;
    }

    public function update(User $user, Hotel $hotel): bool
    {
        return $user->role === UserRole::SUPPLIER
            && $hotel->supplier_id === $user->id
            && $hotel->status !== HotelStatus::APPROVED->value;
    }

    public function approve(User $user): bool
    {
        return in_array($user->role, [UserRole::ADMIN, UserRole::OPERATOR]);
    }

    public function reject(User $user): bool
    {
        return $this->approve($user);
    }
}
