
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Hotel;
use App\Models\HotelVersion;
use Illuminate\Support\Facades\DB;
use App\Enums\HotelStatus; // Assuming enum exists or use string 'approved'

class MigrateHotels extends Command
{
    protected $signature = 'migrate:hotels';
    protected $description = 'Migrate hotels to versioned model';

    public function handle()
    {
        $this->info('Starting Hotel Migration...');

        DB::transaction(function () {
            Hotel::chunk(100, function ($hotels) {
                foreach ($hotels as $hotel) {
                    if ($hotel->current_version_id) {
                        continue;
                    }

                    $version = HotelVersion::create([
                        'hotel_id' => $hotel->id,
                        'version' => 1,
                        'name' => $hotel->name,
                        'description' => $hotel->description,
                        'star_rating' => $hotel->star_rating,
                        'status' => 'approved', // Legacy items are approved
                        'is_current' => true,
                        'approved_at' => now(),
                        'created_by' => $hotel->hotel_partner_id,
                        'created_at' => $hotel->created_at,
                    ]);

                    $hotel->updateQuietly([
                        'current_version_id' => $version->id,
                    ]);
                }
            });
        });

        $this->info('Hotel migration completed successfully.');
    }
}
