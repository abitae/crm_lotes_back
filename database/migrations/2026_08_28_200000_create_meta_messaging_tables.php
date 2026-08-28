<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_connections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('advisor_id')->constrained('advisors')->cascadeOnDelete();
            $table->string('status', 32)->default('pending');
            $table->string('waba_id')->nullable();
            $table->string('phone_number_id')->nullable();
            $table->string('page_id')->nullable();
            $table->string('ig_user_id')->nullable();
            $table->text('access_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('connected_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique('phone_number_id');
            $table->unique('page_id');
            $table->index(['advisor_id', 'status']);
        });

        Schema::create('meta_webhook_events', function (Blueprint $table): void {
            $table->id();
            $table->string('event_hash', 64)->unique();
            $table->foreignId('meta_connection_id')->nullable()->constrained('meta_connections')->nullOnDelete();
            $table->string('object_type', 32)->nullable();
            $table->json('payload');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('meta_contact_identities', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('meta_connection_id')->constrained('meta_connections')->cascadeOnDelete();
            $table->foreignId('advisor_id')->constrained('advisors')->cascadeOnDelete();
            $table->string('channel', 32);
            $table->string('external_user_id');
            $table->string('phone')->nullable();
            $table->string('phone_normalized')->nullable();
            $table->string('profile_name')->nullable();
            $table->timestamps();

            $table->unique(['meta_connection_id', 'channel', 'external_user_id']);
            $table->index(['advisor_id', 'phone_normalized']);
        });

        Schema::create('meta_conversations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('meta_connection_id')->constrained('meta_connections')->cascadeOnDelete();
            $table->foreignId('advisor_id')->constrained('advisors')->cascadeOnDelete();
            $table->foreignId('contact_identity_id')->constrained('meta_contact_identities')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->string('channel', 32);
            $table->string('status', 32)->default('open');
            $table->boolean('bot_enabled')->default(true);
            $table->boolean('has_client_conflict')->default(false);
            $table->timestamp('last_message_at')->nullable();
            $table->timestamp('last_inbound_at')->nullable();
            $table->timestamps();

            $table->index(['advisor_id', 'last_message_at']);
            $table->index(['meta_connection_id', 'contact_identity_id']);
        });

        Schema::create('meta_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('meta_conversations')->cascadeOnDelete();
            $table->string('direction', 16);
            $table->string('content_type', 32)->default('text');
            $table->text('body')->nullable();
            $table->string('media_url')->nullable();
            $table->string('external_id')->unique();
            $table->string('status', 32)->default('received');
            $table->foreignId('sent_by_advisor_id')->nullable()->constrained('advisors')->nullOnDelete();
            $table->unsignedBigInteger('automation_step_id')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
        });

        Schema::create('meta_message_templates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('meta_connection_id')->constrained('meta_connections')->cascadeOnDelete();
            $table->string('template_name');
            $table->string('language', 16)->default('es');
            $table->string('status', 32)->default('APPROVED');
            $table->string('category')->nullable();
            $table->json('components')->nullable();
            $table->timestamps();

            $table->unique(['meta_connection_id', 'template_name', 'language']);
        });

        Schema::create('meta_automation_flows', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('advisor_id')->constrained('advisors')->cascadeOnDelete();
            $table->foreignId('cloned_from_flow_id')->nullable()->constrained('meta_automation_flows')->nullOnDelete();
            $table->string('name');
            $table->json('channels')->nullable();
            $table->string('trigger_type', 32)->default('welcome');
            $table->json('trigger_config')->nullable();
            $table->json('graph_json')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->boolean('is_published')->default(false);
            $table->boolean('is_active')->default(false);
            $table->boolean('is_corporate_template')->default(false);
            $table->timestamps();

            $table->index(['advisor_id', 'is_active']);
        });

        Schema::create('meta_automation_steps', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('flow_id')->constrained('meta_automation_flows')->cascadeOnDelete();
            $table->string('node_id', 64);
            $table->string('type', 32);
            $table->json('config')->nullable();
            $table->string('next_node_id', 64)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['flow_id', 'node_id']);
        });

        Schema::create('meta_automation_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('meta_conversations')->cascadeOnDelete();
            $table->foreignId('flow_id')->constrained('meta_automation_flows')->cascadeOnDelete();
            $table->string('current_node_id', 64)->nullable();
            $table->string('status', 32)->default('running');
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'status']);
        });

        Schema::create('meta_broadcasts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('advisor_id')->constrained('advisors')->cascadeOnDelete();
            $table->foreignId('meta_connection_id')->constrained('meta_connections')->cascadeOnDelete();
            $table->foreignId('message_template_id')->nullable()->constrained('meta_message_templates')->nullOnDelete();
            $table->string('name');
            $table->json('segment_config')->nullable();
            $table->string('status', 32)->default('draft');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->unsignedInteger('total_recipients')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('delivered_count')->default(0);
            $table->unsignedInteger('read_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->timestamps();

            $table->index(['advisor_id', 'status']);
        });

        Schema::create('meta_broadcast_recipients', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('broadcast_id')->constrained('meta_broadcasts')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained('meta_conversations')->nullOnDelete();
            $table->string('phone')->nullable();
            $table->string('status', 32)->default('pending');
            $table->string('external_message_id')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['broadcast_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_broadcast_recipients');
        Schema::dropIfExists('meta_broadcasts');
        Schema::dropIfExists('meta_automation_sessions');
        Schema::dropIfExists('meta_automation_steps');
        Schema::dropIfExists('meta_automation_flows');
        Schema::dropIfExists('meta_message_templates');
        Schema::dropIfExists('meta_messages');
        Schema::dropIfExists('meta_conversations');
        Schema::dropIfExists('meta_contact_identities');
        Schema::dropIfExists('meta_webhook_events');
        Schema::dropIfExists('meta_connections');
    }
};
