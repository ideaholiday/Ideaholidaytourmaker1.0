<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. HOTELS (The Property Entity)
        Schema::create('hotels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUlid('supplier_id')->constrained('users'); // The Hotel Partner
            
            $table->string('name');
            $table->uuid('city_id')->index(); // Links to locations table
            $table->string('star_rating'); // 3 Star, 4 Star, 5 Star, Luxury
            $table->text('description')->nullable();
            $table->string('address')->nullable();
            $table->string('contact_phone')->nullable();
            
            // Workflow Status
            $table->string('status')->default('DRAFT'); // DRAFT, SUBMITTED, APPROVED, REJECTED, INACTIVE
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. ROOM RATES ( The Sellable Inventory)
        Schema::create('hotel_room_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hotel_id')->constrained('hotels')->cascadeOnDelete();
            
            $table->string('room_type'); // e.g. "Deluxe Ocean View"
            $table->string('meal_plan'); // RO, BB, HB, FB, AI
            
            // Financials (B2B Net Cost)
            $table->decimal('net_cost', 12, 2);
            $table->string('currency', 3)->default('USD');
            
            // Validity
            $table->date('valid_from');
            $table->date('valid_to');
            $table->json('blackout_dates')->nullable(); // Array of dates or ranges
            
            // Workflow Status (Rates approve separately)
            $table->string('status')->default('DRAFT'); 
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('hotel_room_rates');
        Schema::dropIfExists('hotels');
    }
};
