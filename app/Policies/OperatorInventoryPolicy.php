
<?php

namespace App\Policies;

use App\Models\User;
use App\Models\OperatorInventoryItem;
use App\Enums\OperatorInventoryStatus;
use App\Enums\UserRole;

class OperatorInventoryPolicy
{
    public function view(User $user, OperatorInventoryItem $item): bool
    {
        return match ($user->role) {
            UserRole::ADMIN => true,
            UserRole::OPERATOR => $item->supplier_id === $user->id, // Changed created_by to supplier_id based on schema
            UserRole::AGENT, UserRole::STAFF =>
                $item->status === OperatorInventoryStatus::APPROVED->value, // Use shell status or version status
            default => false,
        };
    }

    public function create(User $user): bool
    {
        return $user->role === UserRole::OPERATOR;
    }

    public function update(User $user, OperatorInventoryItem $item): bool
    {
        return $user->role === UserRole::OPERATOR
            && $item->supplier_id === $user->id
            && $item->status !== OperatorInventoryStatus::APPROVED->value;
    }

    public function submit(User $user, OperatorInventoryItem $item): bool
    {
        return $this->update($user, $item);
    }

    public function approve(User $user, OperatorInventoryItem $item): bool
    {
        return $user->role === UserRole::ADMIN;
    }

    public function reject(User $user, OperatorInventoryItem $item): bool
    {
        return $user->role === UserRole::ADMIN;
    }
}
