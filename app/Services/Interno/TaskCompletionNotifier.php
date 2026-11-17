<?php

namespace App\Services\Interno;

use App\Jobs\SendTaskCompletedPush;
use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskCompletedNotification;

class TaskCompletionNotifier
{
    public function mark(Task $task, bool $completed, User $actor): Task
    {
        $wasCompleted = $task->isCompleted();

        $task->forceFill([
            'completed_at' => $completed ? now() : null,
            'completed_by' => $completed ? $actor->id : null,
        ])->save();

        if ($completed && ! $wasCompleted && $task->assignedToSomeoneElse() && $task->created_by !== $actor->id) {
            $task->loadMissing('creator', 'assignee');
            $task->creator?->notify(new TaskCompletedNotification($task));
            SendTaskCompletedPush::dispatch($task->id);
        }

        return $task->fresh(['creator', 'assignee', 'completer']);
    }
}
