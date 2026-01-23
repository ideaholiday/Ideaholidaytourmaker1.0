<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     * Usage: middleware('role:ADMIN,STAFF')
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Check if user's role is in the allowed list
        if (! in_array($request->user()->role, $roles)) {
            // Log this security event (Audit)
            \Log::warning("Unauthorized access attempt", [
                'user_id' => $request->user()->id,
                'role' => $request->user()->role,
                'required' => $roles,
                'url' => $request->url()
            ]);

            return response()->json(['message' => 'Unauthorized: Insufficient Permissions.'], 403);
        }

        return $next($request);
    }
}
