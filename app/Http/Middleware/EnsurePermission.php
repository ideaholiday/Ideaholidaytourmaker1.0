<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $permission  The permission key required (e.g. 'itinerary.approve')
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (!$user->hasPermission($permission)) {
            // Security Audit
            \Log::warning("Permission Violation: User {$user->id} attempted [{$permission}] without access.");

            return response()->json(['message' => 'Unauthorized: Insufficient Permissions.'], 403);
        }

        return $next($request);
    }
}
