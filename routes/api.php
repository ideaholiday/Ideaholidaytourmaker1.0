
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CommonController;
use App\Http\Controllers\Api\V1\Agent\QuoteController as AgentQuoteController;
use App\Http\Controllers\Api\V1\Operator\TaskController as OperatorTaskController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\Admin\InventoryController as AdminInventoryController;
use App\Http\Controllers\Api\V1\Operator\InventoryController as OperatorInventoryController;
use App\Http\Controllers\Api\V1\Supplier\InventoryController as SupplierInventoryController;
// Builder Controllers
use App\Http\Controllers\Api\V1\Builder\BuilderConfigController;
use App\Http\Controllers\Api\V1\Builder\ItineraryController;
use App\Http\Controllers\Api\V1\Builder\DestinationController;
use App\Http\Controllers\Api\V1\Builder\InventoryController;
use App\Http\Controllers\Api\V1\Builder\HotelController;
use App\Http\Controllers\Api\V1\Builder\ItineraryServiceController;
use App\Http\Controllers\Api\V1\Builder\PricingController;
use App\Http\Controllers\Api\V1\Builder\ItineraryWorkflowController;
use App\Http\Controllers\Api\V1\Builder\ItineraryPdfController;

Route::prefix('v1')->group(function () {

    // ... (Existing Auth Routes) ...
    Route::post('/auth/{role}/login', [AuthController::class, 'login'])
        ->whereIn('role', ['admin', 'staff', 'agent', 'operator', 'supplier']);
    Route::post('/register-partner', [AuthController::class, 'register']);
    Route::post('/forgot-password', [AuthController::class, 'sendResetLink']);

    // Authenticated Session Check
    Route::middleware(['auth:sanctum'])->get('/auth/me', [AuthController::class, 'me']);

    // --- AGENT SPECIFIC ROUTES ---
    Route::middleware(['auth:sanctum', 'role:AGENT'])->prefix('agent')->group(function () {
        Route::post('/quotes', [AgentQuoteController::class, 'store']);
        Route::delete('/quotes/{id}', [AgentQuoteController::class, 'destroy']); // Delete Quote
        Route::post('/quotes/{id}/book', [AgentQuoteController::class, 'book']); // Book Quote
        Route::get('/bookings', [AgentQuoteController::class, 'history']); // Booked History
    });
    
    // --- ITINERARY BUILDER (Shared Access) ---
    Route::middleware(['auth:sanctum'])->prefix('builder')->group(function () {
        Route::get('/config', [BuilderConfigController::class, 'index']);
        Route::post('/itineraries', [ItineraryController::class, 'store']);
        Route::get('/itineraries/{itinerary}', [ItineraryController::class, 'show']);
        Route::post('/itineraries/{itinerary}/commit', [ItineraryController::class, 'commit']);
        Route::post('/itineraries/{itinerary}/destinations', [DestinationController::class, 'add']);
        Route::post('/itineraries/{itinerary}/destinations/reorder', [DestinationController::class, 'reorder']);
        
        // General Inventory Search
        Route::get('/inventory/search', [InventoryController::class, 'search']);

        // HOTEL SPECIFIC
        Route::get('/hotels/search', [HotelController::class, 'search']);
        Route::get('/hotels/{hotelId}/rates', [HotelController::class, 'rates']);
        Route::post('/itineraries/{itinerary}/hotel', [HotelController::class, 'addToItinerary']);

        // Generic Service Addition
        Route::post('/itineraries/{itinerary}/services', [ItineraryServiceController::class, 'add']);
        Route::delete('/itineraries/{itinerary}/services/{service}', [ItineraryServiceController::class, 'remove']);
        
        Route::post('/itineraries/{itinerary}/pricing/calculate', [PricingController::class, 'calculate']);
        Route::get('/itineraries/{itinerary}/pdf', [ItineraryPdfController::class, 'download']);
    });
    
});
