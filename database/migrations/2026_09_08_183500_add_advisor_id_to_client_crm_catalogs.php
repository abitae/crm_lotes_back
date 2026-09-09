<?php

use App\Models\Inmopro\Advisor;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_statuses', function (Blueprint $table): void {
            $table->unsignedBigInteger('advisor_id')->nullable()->after('id');
        });

        Schema::table('client_tags', function (Blueprint $table): void {
            $table->unsignedBigInteger('advisor_id')->nullable()->after('id');
        });

        Schema::table('client_statuses', function (Blueprint $table): void {
            $table->dropUnique(['code']);
        });

        Schema::table('client_tags', function (Blueprint $table): void {
            $table->dropUnique(['code']);
        });

        $this->cloneCatalogsForAdvisors();

        DB::table('client_statuses')->whereNull('advisor_id')->delete();
        DB::table('client_tags')->whereNull('advisor_id')->delete();

        Schema::table('client_statuses', function (Blueprint $table): void {
            $table->foreign('advisor_id')->references('id')->on('advisors')->cascadeOnDelete();
            $table->unique(['advisor_id', 'code']);
        });

        Schema::table('client_tags', function (Blueprint $table): void {
            $table->foreign('advisor_id')->references('id')->on('advisors')->cascadeOnDelete();
            $table->unique(['advisor_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::table('client_statuses', function (Blueprint $table): void {
            $table->dropUnique(['advisor_id', 'code']);
            $table->dropForeign(['advisor_id']);
            $table->dropColumn('advisor_id');
            $table->unique('code');
        });

        Schema::table('client_tags', function (Blueprint $table): void {
            $table->dropUnique(['advisor_id', 'code']);
            $table->dropForeign(['advisor_id']);
            $table->dropColumn('advisor_id');
            $table->unique('code');
        });
    }

    private function cloneCatalogsForAdvisors(): void
    {
        $advisorIds = Advisor::query()->pluck('id');

        if ($advisorIds->isEmpty()) {
            return;
        }

        $globalStatuses = DB::table('client_statuses')->whereNull('advisor_id')->get();
        $globalTags = DB::table('client_tags')->whereNull('advisor_id')->get();

        /** @var array<int, array<int, int>> $statusMap oldId => [advisorId => newId] */
        $statusMap = [];
        /** @var array<int, array<int, int>> $tagMap */
        $tagMap = [];

        foreach ($advisorIds as $advisorId) {
            foreach ($globalStatuses as $status) {
                $newId = DB::table('client_statuses')->insertGetId([
                    'advisor_id' => $advisorId,
                    'name' => $status->name,
                    'code' => $status->code,
                    'description' => $status->description,
                    'color' => $status->color,
                    'sort_order' => $status->sort_order,
                    'is_active' => $status->is_active,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $statusMap[(int) $status->id][(int) $advisorId] = $newId;
            }

            foreach ($globalTags as $tag) {
                $newId = DB::table('client_tags')->insertGetId([
                    'advisor_id' => $advisorId,
                    'name' => $tag->name,
                    'code' => $tag->code,
                    'description' => $tag->description,
                    'color' => $tag->color,
                    'sort_order' => $tag->sort_order,
                    'is_active' => $tag->is_active,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $tagMap[(int) $tag->id][(int) $advisorId] = $newId;
            }
        }

        $clients = DB::table('clients')->select('id', 'advisor_id', 'client_status_id')->get();

        foreach ($clients as $client) {
            $advisorId = (int) $client->advisor_id;
            $updates = [];

            if ($client->client_status_id && isset($statusMap[(int) $client->client_status_id][$advisorId])) {
                $updates['client_status_id'] = $statusMap[(int) $client->client_status_id][$advisorId];
            } elseif ($client->client_status_id) {
                $updates['client_status_id'] = null;
            }

            if ($updates !== []) {
                DB::table('clients')->where('id', $client->id)->update($updates);
            }

            $pivots = DB::table('client_client_tag')->where('client_id', $client->id)->get();

            foreach ($pivots as $pivot) {
                $oldTagId = (int) $pivot->client_tag_id;
                $newTagId = $tagMap[$oldTagId][$advisorId] ?? null;

                if ($newTagId) {
                    DB::table('client_client_tag')->where('id', $pivot->id)->update(['client_tag_id' => $newTagId]);
                } else {
                    DB::table('client_client_tag')->where('id', $pivot->id)->delete();
                }
            }
        }

        $changes = DB::table('client_status_changes')->get();

        foreach ($changes as $change) {
            $advisorId = $change->advisor_id
                ? (int) $change->advisor_id
                : (int) (DB::table('clients')->where('id', $change->client_id)->value('advisor_id') ?? 0);

            $from = $change->from_status_id && isset($statusMap[(int) $change->from_status_id][$advisorId])
                ? $statusMap[(int) $change->from_status_id][$advisorId]
                : null;
            $to = $change->to_status_id && isset($statusMap[(int) $change->to_status_id][$advisorId])
                ? $statusMap[(int) $change->to_status_id][$advisorId]
                : null;

            DB::table('client_status_changes')->where('id', $change->id)->update([
                'from_status_id' => $from,
                'to_status_id' => $to,
            ]);
        }
    }
};
