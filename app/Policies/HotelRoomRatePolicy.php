
<?php

namespace App\Policies;

use App\Models\User;
use App\Models\HotelRoomRate;
use App\Enums\HotelRoomRateStatus;
use App\Enums\UserRole;

class HotelRoomRatePolicy
{
    public function view(User $user, HotelRoomRate $rate): bool
    {
        return match ($user->role) {
            UserRole::ADMIN, UserRole::OPERATOR => true,
            UserRole::SUPPLIER => $rate->hotel->supplier_id === $user->id,
            UserRole::AGENT, UserRole::STAFF =>
                $rate->status === HotelRoomRateStatus::APPROVED->value,
            default => false,
        };
    }

    public function create(User $user): bool
    {
        return $user->role === UserRole::SUPPLIER;
    }

    public function update(User $user, HotelRoomRate $rate): bool
    {
        return $user->role === UserRole::SUPPLIER
            && $rate->hotel->supplier_id === $user->id
            && $rate->status !== HotelRoomRateStatus::APPROVED->value;
    }

    public function approve(User $user): bool
    {
        return in_array($user->role, [UserRole::ADMIN, UserRole::OPERATOR]);
    }
}
