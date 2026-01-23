
<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\OperatorInventoryItem;
use App\Models\Hotel;
use App\Models\HotelRoomRate;
use App\Models\Itinerary;
use App\Policies\OperatorInventoryPolicy;
use App\Policies\HotelPolicy;
use App\Policies\HotelRoomRatePolicy;
use App\Policies\ItineraryPolicy;
use App\Enums\UserRole;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        OperatorInventoryItem::class => OperatorInventoryPolicy::class,
        Hotel::class => HotelPolicy::class,
        HotelRoomRate::class => HotelRoomRatePolicy::class,
        Itinerary::class => ItineraryPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Global Admin Override (Super Admin)
        Gate::before(function ($user, $ability) {
            if ($user->role === UserRole::ADMIN) {
                return true;
            }
        });

        // Audit Logging for Authorization Failures
        Gate::after(function ($user, $ability, $result, $arguments) {
            if (!$result) {
                \Log::warning('Authorization denied', [
                    'user_id' => $user->id,
                    'role' => $user->role,
                    'ability' => $ability,
                    'arguments' => $arguments
                ]);
            }
        });
    }
}
