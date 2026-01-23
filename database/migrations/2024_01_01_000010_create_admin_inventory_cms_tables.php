<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. ADMINS & RBAC
        Schema::create('admins', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role'); // SUPER_ADMIN, INVENTORY_ADMIN, CONTENT_ADMIN, FINANCE_ADMIN, SUPPORT_ADMIN
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. AUDIT LOGS (Immutable)
        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('admin_id')->nullable(); // Nullable for system/operator actions
            $table->string('entity_type'); // Product, CMSPage, User
            $table->string('entity_id');
            $table->string('action'); // CREATE, SUBMIT, APPROVE, REJECT, UPDATE_VERSION
            $table->json('changes'); // { "field": {"old": "A", "new": "B"} }
            $table->string('ip_address')->nullable();
            $table->timestamp('created_at');
        });

        // 3. LOCATIONS (Reusable CMS Data)
        Schema::create('locations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type'); // COUNTRY, CITY
            $table->string('name');
            $table->string('code')->nullable(); // ISO code or IATA
            $table->uuid('parent_id')->nullable(); // For City -> Country
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 4. PRODUCT SHELL (Stable ID container with Workflow Status)
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUlid('supplier_id')->constrained('users'); // The Supplier/Operator Owner
            $table->string('type'); // HOTEL, ACTIVITY, TRANSFER
            
            // Workflow Status
            $table->enum('status', ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'INACTIVE'])->default('DRAFT');
            
            // Approval Metadata
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->boolean('is_legacy')->default(false); // Flag for migrated data
            $table->uuid('current_version_id')->nullable(); // Optimization for reads
            $table->timestamps();
            $table->softDeletes();
        });

        // 5. PRODUCT VERSIONS (The Data - Immutable Rows)
        Schema::create('product_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            
            $table->integer('version_number');
            $table->string('name');
            $table->uuid('location_id')->nullable(); // City
            
            // Content
            $table->text('description')->nullable();
            $table->json('inclusions')->nullable();
            $table->json('exclusions')->nullable();
            $table->text('important_notes')->nullable();
            
            // Financials (Source of Truth for this Version)
            $table->decimal('net_cost', 12, 2);
            $table->string('currency', 3);
            
            // Meta (Star rating, Duration, Vehicle Type)
            $table->json('meta_data')->nullable();
            
            $table->uuid('created_by_id')->nullable(); // Admin or Operator ID
            $table->timestamp('created_at');
            
            // Constraint: Unique version per product
            $table->unique(['product_id', 'version_number']);
        });

        // 6. CMS PAGES (Versioning Support)
        Schema::create('cms_pages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique();
            $table->uuid('current_version_id')->nullable();
            $table->timestamps();
        });

        Schema::create('cms_page_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cms_page_id')->constrained('cms_pages')->cascadeOnDelete();
            $table->integer('version_number');
            $table->string('title');
            $table->longText('content'); // HTML or Markdown
            $table->json('meta_tags')->nullable();
            $table->uuid('created_by_admin_id')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cms_page_versions');
        Schema::dropIfExists('cms_pages');
        Schema::dropIfExists('product_versions');
        Schema::dropIfExists('products');
        Schema::dropIfExists('locations');
        Schema::dropIfExists('admin_audit_logs');
        Schema::dropIfExists('admins');
    }
};
