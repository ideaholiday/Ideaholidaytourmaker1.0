
<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use App\Models\User;
use App\Enums\UserRole;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    /**
     * Helper to authenticate as a specific role.
     */
    protected function loginAs(string $role): User
    {
        // Map string to Enum if needed, or assume factory handles it
        // Depending on factory setup, 'role' might need to be the enum value
        $roleEnum = match(strtoupper($role)) {
            'ADMIN' => UserRole::ADMIN,
            'STAFF' => UserRole::STAFF,
            'AGENT' => UserRole::AGENT,
            'OPERATOR' => UserRole::OPERATOR,
            'HOTEL_PARTNER' => UserRole::HOTEL_PARTNER,
            default => UserRole::AGENT,
        };

        $user = User::factory()->create([
            'role' => $roleEnum,
            'status' => 'ACTIVE'
        ]);

        $this->actingAs($user);

        return $user;
    }
}
