<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function (): void {
    $expiredIds = DB::table('openai_cazador_conversations')
        ->where('last_active_at', '<', now()->subMinutes((int) config('openai_cazador.conversation_ttl_minutes', 120)))
        ->pluck('id');

    DB::table('openai_cazador_conversation_messages')->whereIn('conversation_id', $expiredIds)->delete();
    DB::table('openai_cazador_conversations')->whereIn('id', $expiredIds)->delete();
    DB::table('openai_cazador_runs')->where('created_at', '<', now()->subDays(90))->delete();
})->hourly()->name('prune-openai-cazador-data')->withoutOverlapping();
