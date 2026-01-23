
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Enums\UserRole;

class AuthController extends Controller
{
    /**
     * Role-Aware Login
     * POST /auth/{role}/login
     */
    public function login(Request $request, string $role)
    {
        // 1. Input Validation
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'device_name' => 'required'
        ]);

        // 2. Validate Requested Role is Valid Enum
        $normalizedRole = strtoupper($role);
        $validRoles = array_column(UserRole::cases(), 'value');
        
        if (!in_array($normalizedRole, $validRoles)) {
            return response()->json(['message' => 'Invalid role specified.'], 400);
        }

        // 3. Find User
        $user = User::where('email', $request->email)->first();

        // 4. Verify Credentials
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // 5. Verify Account Status
        if ($user->status !== 'ACTIVE') {
            return response()->json(['message' => 'Account is suspended or pending verification.'], 403);
        }

        // 6. STRICT ROLE CHECK
        // A user cannot login as 'agent' if their DB role is 'operator'
        if ($user->role->value !== $normalizedRole) {
            return response()->json(['message' => "Unauthorized. You are not a {$role}."], 403);
        }

        // 7. Token Management (Guard Isolation)
        // Delete previous tokens ONLY for this specific role/guard to prevent session leaks
        // while keeping other role sessions (if any) active.
        $user->tokens()->where('name', $role)->delete();

        // Create new token scoped to this role
        $token = $user->createToken(
            name: $role,
            abilities: ["role:{$role}"] // Scoped ability
        )->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar_url,
                'permissions' => $user->permissions(),
            ],
            'dashboard_route' => $this->getDashboardRoute($user->role->value)
        ]);
    }

    /**
     * Get authenticated user details and dynamic dashboard route.
     * Prevents frontend from caching stale role/permissions.
     * GET /auth/me
     */
    public function me(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->avatar_url,
                'permissions' => $user->permissions(),
            ],
            // Centralized logic: Backend decides where the user goes
            'dashboard_route' => $this->getDashboardRoute($user->role->value)
        ]);
    }

    private function getDashboardRoute($role)
    {
        return match($role) {
            'ADMIN', 'STAFF' => '/admin/dashboard',
            'OPERATOR' => '/operator/dashboard',
            'AGENT' => '/agent/dashboard',
            'SUPPLIER' => '/supplier/dashboard',
            default => '/'
        };
    }

    public function logout(Request $request)
    {
        // Only revoke the token used for the current request
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }
}
