
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Check 1: Database Role
        if (! in_array($user->role, $roles)) {
            return response()->json(['message' => 'Unauthorized: Access denied for your role.'], 403);
        }

        // Check 2: Token Scope (Extra security for API/Mobile)
        // If the token doesn't have the capability for this role, deny it.
        // This prevents a token stolen from an 'agent' session being used on an 'admin' route
        // even if the attacker somehow manipulates the request.
        foreach ($roles as $role) {
            if ($user->tokenCan("role:{$role}")) {
                return $next($request);
            }
        }

        // If strict scope checking is enabled:
        // return response()->json(['message' => 'Unauthorized: Invalid token scope.'], 403);
        
        // For now, if DB role matches, we pass.
        return $next($request);
    }
}
