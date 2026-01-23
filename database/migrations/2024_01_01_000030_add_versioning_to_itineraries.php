<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('itineraries', function (Blueprint $table) {
            // Ensure versioning columns exist
            if (!Schema::hasColumn('itineraries', 'version')) {
                $table->integer('version')->default(1);
            }
            if (!Schema::hasColumn('itineraries', 'is_locked')) {
                $table->boolean('is_locked')->default(false);
            }
            
            // Ensure reference_code exists (fixing inconsistency between previous migrations)
            if (!Schema::hasColumn('itineraries', 'reference_code')) {
                $table->string('reference_code')->nullable();
            }
        });

        // Add composite unique index for version control
        // We wrap in a try-catch or check existence to prevent errors if already indexed
        try {
            Schema::table('itineraries', function (Blueprint $table) {
                $table->unique(['reference_code', 'version'], 'itineraries_ref_version_unique');
            });
        } catch (\Exception $e) {
            // Index likely exists
        }
    }

    public function down()
    {
        Schema::table('itineraries', function (Blueprint $table) {
            $table->dropUnique('itineraries_ref_version_unique');
            $table->dropColumn(['is_locked']);
        });
    }
};