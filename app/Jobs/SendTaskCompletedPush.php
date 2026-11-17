<?php

namespace App\Jobs;

use App\Models\Task;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendTaskCompletedPush implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $taskId) {}

    public function handle(): void
    {
        $task = Task::query()->with(['creator.pushTokens', 'assignee'])->find($this->taskId);

        if (! $task || ! $task->isCompleted() || ! $task->assignedToSomeoneElse()) {
            return;
        }

        $tokens = $task->creator?->pushTokens?->pluck('expo_push_token')->filter()->values()->all() ?? [];

        if ($tokens === []) {
            return;
        }

        $assigneeName = $task->assignee?->name ?? 'Alguien';
        $messages = array_map(fn (string $token): array => [
            'to' => $token,
            'title' => 'Tarea completada',
            'body' => $assigneeName.' completó «'.$task->title.'».',
            'data' => [
                'task_id' => $task->id,
                'type' => 'task_completed',
            ],
        ], $tokens);

        $response = Http::acceptJson()
            ->post('https://exp.host/--/api/v2/push/send', $messages);

        if ($response->failed()) {
            Log::warning('No se pudo enviar el push de tarea completada.', [
                'task_id' => $task->id,
                'status' => $response->status(),
            ]);
        }
    }
}
