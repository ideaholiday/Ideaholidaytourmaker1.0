
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Itinerary;

return new class extends Migration
{
    public function up()
    {
        Schema::table('itineraries', function (Blueprint $table) {
            $table->boolean('legacy')->default(false);
        });

        // Mark existing itineraries as legacy immediately
        // Use raw query for speed on large datasets if needed, or Eloquent for simplicity
        Itinerary::whereNotNull('created_at')->update(['legacy' => true]);
    }

    public function down()
    {
        Schema::table('itineraries', function (Blueprint $table) {
            $table->dropColumn('legacy');
        });
    }
};
