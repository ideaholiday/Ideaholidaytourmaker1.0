
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\HotelRoomRate;
use App\Models\HotelRoomRateVersion;
use Illuminate\Support\Facades\DB;

class MigrateHotelRoomRates extends Command
{
    protected $signature = 'migrate:hotel-room-rates';
    protected $description = 'Migrate hotel room rates to versioned model';

    public function handle()
    {
        $this->info('Starting Hotel Room Rate Migration...');

        DB::transaction(function () {
            HotelRoomRate::chunk(100, function ($rates) {
                foreach ($rates as $rate) {
                    if ($rate->current_version_id) {
                        continue;
                    }

                    $version = HotelRoomRateVersion::create([
                        'room_rate_id' => $rate->id,
                        'version' => 1,
                        'room_type' => $rate->room_type,
                        'meal_plan' => $rate->meal_plan,
                        'base_cost' => $rate->base_cost,
                        'currency' => $rate->currency,
                        'valid_from' => $rate->valid_from,
                        'valid_to' => $rate->valid_to,
                        'blackout_dates' => $rate->blackout_dates,
                        'status' => 'approved', // Legacy items are approved
                        'is_current' => true,
                        'approved_at' => now(),
                        'created_by' => $rate->hotel_id, // Or infer from parent hotel
                        'created_at' => $rate->created_at,
                    ]);

                    $rate->updateQuietly([
                        'current_version_id' => $version->id,
                    ]);
                }
            });
        });

        $this->info('Hotel room-rate migration completed successfully.');
    }
}
