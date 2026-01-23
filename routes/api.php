
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\Agent\QuoteController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Version: v1
| Mobile-Ready: Yes
| Role-Isolated: Yes
|
*/

Route::prefix('v1')->group(function () {

    // --- PUBLIC AUTH ---
    // Universal login endpoint that resolves roles internally
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/forgot-password', [AuthController::class, 'sendResetLink']);

    // --- PROTECTED ROUTES ---
    Route::middleware('auth:sanctum')->group(function () {
        
        // Session Hydration (Frontend calls this on reload)
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // --- AGENT DOMAIN ---
        Route::middleware('role:AGENT')->prefix('agent')->group(function () {
            Route::get('/dashboard-stats', [QuoteController::class, 'dashboardStats']);
            Route::apiResource('quotes', QuoteController::class);
        });

        // --- OPERATOR DOMAIN ---
        Route::middleware('role:OPERATOR')->prefix('operator')->group(function () {
            // Operator specific routes
        });

        // --- ADMIN DOMAIN ---
        Route::middleware('role:ADMIN,STAFF')->prefix('admin')->group(function () {
            // Admin specific routes
        });
    });
});
