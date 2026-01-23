
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'device_name' => 'required|string'
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        $user = User::where('email', $request->email)->firstOrFail();

        // 1. Role-Isolated Token Generation
        // We assign a capability to the token matching the user's role.
        // This adds a second layer of security beyond just the DB column.
        $token = $user->createToken($request->device_name, ["role:{$user->role}"])->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'user' => $user,
            // 2. Centralized Dashboard Resolution
            'dashboard_route' => $this->resolveDashboard($user->role)
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'user' => $user,
            'dashboard_route' => $this->resolveDashboard($user->role)
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    /**
     * The Single Source of Truth for Routing.
     * Mobile apps can map these string paths to native screens.
     */
    private function resolveDashboard(string $role): string
    {
        return match (strtoupper($role)) {
            'ADMIN', 'STAFF' => '/admin/dashboard',
            'AGENT' => '/agent/dashboard',
            'OPERATOR' => '/operator/dashboard',
            'HOTEL_PARTNER' => '/partner/dashboard',
            default => '/unauthorized',
        };
    }
}
