<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Enums\UserRole;

class EnsureUserHasRole
{
    /**
     * Handle an incoming request.
     * 
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string ...$roles  Expected roles (e.g. 'ADMIN', 'AGENT')
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // 1. Hard Auth Check
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // 2. Account Status Check (Global Kill Switch)
        if ($user->status !== 'ACTIVE') {
            return response()->json(['message' => 'Account suspended or inactive.'], 403);
        }

        // 3. Role Logic
        // We normalize input to match Enum values (Uppercase)
        $allowedRoles = array_map('strtoupper', $roles);
        
        // Use the Enum value for comparison
        if (!in_array($user->role->value, $allowedRoles, true)) {
            
            // Security Audit: Log unauthorized access attempts
            \Log::warning("Role Violation: User {$user->id} ({$user->role->value}) attempted to access protected route.", [
                'required_roles' => $allowedRoles,
                'path' => $request->path()
            ]);

            return response()->json(['message' => 'Unauthorized: Insufficient Access Rights.'], 403);
        }

        return $next($request);
    }
}
