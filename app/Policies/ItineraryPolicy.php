
<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Itinerary;
use App\Enums\UserRole;

class ItineraryPolicy
{
    public function view(User $user, Itinerary $itinerary): bool
    {
        return match ($user->role) {
            UserRole::ADMIN => true,
            // Staff usually can see all, but adhering to requested logic logic:
            UserRole::AGENT, UserRole::STAFF => $itinerary->agent_id === $user->id,
            UserRole::OPERATOR => $itinerary->operator_id === $user->id, // Added operator visibility
            default => false,
        };
    }

    public function update(User $user, Itinerary $itinerary): bool
    {
        return $user->role === UserRole::AGENT
            && $itinerary->agent_id === $user->id
            && $itinerary->isEditable();
    }

    public function submit(User $user, Itinerary $itinerary): bool
    {
        return $this->update($user, $itinerary);
    }

    public function approve(User $user, Itinerary $itinerary): bool
    {
        return in_array($user->role, [UserRole::ADMIN, UserRole::OPERATOR]);
    }
}
