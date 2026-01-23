<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. Itinerary Header (Version Controlled)
        Schema::create('itineraries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUlid('agent_id')->constrained('users');
            $table->string('unique_ref_no'); // e.g. QT-2024-001
            $table->integer('version')->default(1);
            $table->boolean('is_locked')->default(false); // True if Booked/Approved. Triggers version increment on edit.
            
            $table->string('title');
            $table->text('destination_summary');
            $table->date('travel_date')->nullable();
            $table->integer('pax_count')->default(2);
            
            // Financials (Source of Truth is Pricing Snapshot, these are cached for index views)
            $table->string('currency', 3)->default('USD');
            
            $table->string('status')->default('DRAFT');
            $table->timestamps();
            $table->softDeletes();

            // Constraint: Unique ref_no + version combination
            $table->unique(['unique_ref_no', 'version']);
        });

        // 2. Itinerary Days
        Schema::create('itinerary_days', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('itinerary_id')->constrained('itineraries')->cascadeOnDelete();
            $table->integer('day_number');
            $table->string('title')->nullable(); 
            $table->string('destination_city')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 3. Itinerary Services (Inventory Links & Content Snapshots)
        Schema::create('itinerary_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('day_id')->constrained('itinerary_days')->cascadeOnDelete();
            
            // Inventory Source
            $table->string('inventory_type'); // 'HOTEL', 'ACTIVITY', 'TRANSFER', 'CUSTOM'
            $table->string('inventory_id')->nullable(); // Link to live inventory for reference
            
            // Snapshot Data (Immutable legal description)
            $table->string('service_name');
            $table->text('description_snapshot')->nullable(); 
            $table->text('inclusions_snapshot')->nullable();
            
            // Inputs
            $table->integer('quantity')->default(1);
            $table->integer('duration_nights')->default(1);
            $table->json('meta_data')->nullable(); // Room type, Vehicle type
            
            $table->timestamps();
        });

        // 4. Pricing Snapshots (The Financial Truth)
        Schema::create('pricing_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('itinerary_id')->constrained('itineraries')->cascadeOnDelete();
            $table->integer('version');
            
            // Base Currency Math (USD) - Internal Use
            $table->decimal('supplier_net_total', 12, 2);
            $table->decimal('platform_margin_total', 12, 2);
            $table->decimal('agent_markup_total', 12, 2);
            $table->decimal('tax_total', 12, 2);
            
            // Final Output (Agent/Client View)
            $table->decimal('final_selling_price', 12, 2);
            $table->string('display_currency', 3);
            $table->decimal('exchange_rate_used', 10, 6);
            
            $table->json('breakdown_json'); // Detailed line-item costings for audit
            $table->timestamp('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('pricing_snapshots');
        Schema::dropIfExists('itinerary_services');
        Schema::dropIfExists('itinerary_days');
        Schema::dropIfExists('itineraries');
    }
};
