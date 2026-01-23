<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // 1. Permissions Definition Table
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();   // e.g. 'itinerary.approve'
            $table->string('label');           // e.g. 'Approve Itineraries'
            $table->timestamps();
        });

        // 2. Role -> Permission Mapping
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role'); // Matches UserRole Enum value (ADMIN, AGENT, etc.)
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            
            // Prevent duplicate assignments
            $table->unique(['role', 'permission_id']);
        });

        // 3. Seed Default Permissions (Bootstrap)
        $this->seedDefaults();
    }

    protected function seedDefaults()
    {
        // Insert Keys
        $perms = [
            ['key' => 'itinerary.create', 'label' => 'Create Itinerary'],
            ['key' => 'itinerary.edit', 'label' => 'Edit Itinerary'],
            ['key' => 'itinerary.approve', 'label' => 'Approve Itinerary'],
            ['key' => 'price.view_net', 'label' => 'View Net Costs'],
            ['key' => 'price.override', 'label' => 'Override Pricing'],
            ['key' => 'booking.create', 'label' => 'Create Booking'],
            ['key' => 'inventory.manage', 'label' => 'Manage Inventory'],
            ['key' => 'user.manage', 'label' => 'Manage Users'],
        ];
        
        DB::table('permissions')->insert($perms);

        // Get IDs
        $p = DB::table('permissions')->pluck('id', 'key');

        // Assign to Roles (Example Mapping)
        $maps = [
            // Admin gets everything (handled via logic usually, but explicit here for safety)
            ['role' => 'ADMIN', 'permission_id' => $p['user.manage']],
            ['role' => 'ADMIN', 'permission_id' => $p['price.override']],
            ['role' => 'ADMIN', 'permission_id' => $p['itinerary.approve']],
            
            // Operator
            ['role' => 'OPERATOR', 'permission_id' => $p['inventory.manage']],
            ['role' => 'OPERATOR', 'permission_id' => $p['itinerary.approve']], // Confirming execution
            
            // Agent
            ['role' => 'AGENT', 'permission_id' => $p['itinerary.create']],
            ['role' => 'AGENT', 'permission_id' => $p['booking.create']],
        ];

        DB::table('role_permissions')->insert($maps);
    }

    public function down()
    {
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
    }
};
