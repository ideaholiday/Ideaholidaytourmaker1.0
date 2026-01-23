<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. Users Table (Enhanced for B2B)
        Schema::create('users', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('unique_id')->unique(); // e.g. AG-IH-000123
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            
            // RBAC & Profiling
            $table->enum('role', ['ADMIN', 'STAFF', 'AGENT', 'OPERATOR', 'SUPPLIER'])->index();
            $table->string('company_name')->nullable();
            
            // Financials
            $table->decimal('credit_limit', 12, 2)->default(0);
            $table->json('bank_details')->nullable(); // For Suppliers
            $table->json('branding_config')->nullable(); // For Agents (Logo, Colors)
            
            // Operator Specific
            $table->json('assigned_destinations')->nullable(); 
            
            $table->timestamp('email_verified_at')->nullable();
            $table->string('status')->default('ACTIVE'); // ACTIVE, SUSPENDED
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Inventory / Products (Simplified for architecture overview)
        Schema::create('products', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('supplier_id')->constrained('users');
            $table->enum('type', ['HOTEL', 'ACTIVITY', 'TRANSFER']);
            $table->string('name');
            $table->decimal('net_cost', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 3. Quotes (The Core Aggregate)
        Schema::create('quotes', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('unique_ref_no')->unique(); // IHT-2024-XXXX
            
            // Trip Details
            $table->string('destination');
            $table->date('travel_date');
            $table->integer('pax_count');
            $table->string('lead_guest_name')->nullable();
            $table->text('service_details')->nullable(); // Summary text
            
            // Role Assignments
            $table->foreignUlid('agent_id')->constrained('users');
            $table->foreignUlid('staff_id')->nullable()->constrained('users');
            
            // Operator Assignment (The Privacy Wall Target)
            $table->foreignUlid('assigned_operator_id')->nullable()->constrained('users');
            $table->string('operator_status')->default('PENDING'); // ASSIGNED, ACCEPTED, DECLINED
            $table->decimal('operator_fixed_price', 10, 2)->nullable(); // If set, Operator sees this, not net_cost
            $table->boolean('is_net_cost_visible_to_operator')->default(false);

            // Financials (Source of Truth)
            $table->string('currency', 3)->default('USD');
            $table->decimal('net_cost', 12, 2)->default(0); // Admin/Staff view
            $table->decimal('platform_markup', 12, 2)->default(0);
            $table->decimal('agent_markup', 12, 2)->default(0); 
            $table->decimal('selling_price', 12, 2)->default(0); // Client view

            $table->string('status')->default('DRAFT'); // DRAFT, PENDING, BOOKED, CANCELLED
            $table->json('itinerary_snapshot')->nullable(); // Frozen JSON for history
            $table->timestamps();
        });

        // 4. Messages (Comments/Chat)
        Schema::create('messages', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->ulidMorphs('commentable'); // Links to Quote or Booking
            
            $table->foreignUlid('sender_id')->constrained('users');
            $table->enum('sender_role_snapshot', ['ADMIN', 'STAFF', 'AGENT', 'OPERATOR', 'SUPPLIER']);
            
            $table->text('content');
            $table->boolean('is_internal_note')->default(false); // Only visible to Staff/Admin
            $table->boolean('is_anonymous')->default(false); // If true, display as "Operator" or "Agent" in UI
            
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('messages');
        Schema::dropIfExists('quotes');
        Schema::dropIfExists('products');
        Schema::dropIfExists('users');
    }
};
