<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureGuardRoleMatch
{
    /**
     * Handle an incoming request.
     * Enforces that the user is authenticated via the correct guard AND has the correct role.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $role  Expected role (e.g. 'agent', 'admin')
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        // 1. Check if user is authenticated via the specific guard
        // The 'auth:guard_name' middleware usually handles the user retrieval,
        // but we verify here against the specific guard instance.
        $user = auth($role)->user();

        if (!$user) {
            return response()->json(['message' => "Unauthenticated for {$role} scope."], 401);
        }

        // 2. Strict Role Check (Database Field)
        // Normalize role string to match Enum value (e.g. 'agent' -> 'AGENT')
        if ($user->role->value !== strtoupper($role)) {
            return response()->json(['message' => 'Forbidden: Role mismatch for this guard.'], 403);
        }

        // 3. Token Ability Check (Sanctum)
        // Ensure the token used was issued specifically for this role
        if (!$user->tokenCan("role:{$role}")) {
            return response()->json(['message' => 'Forbidden: Invalid token scope.'], 403);
        }

        return $next($request);
    }
}
