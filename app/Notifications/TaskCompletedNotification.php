<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskCompletedNotification extends Notification
{
    use Queueable;

    public function __construct(public Task $task) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $this->task->loadMissing('assignee');

        return [
            'task_id' => $this->task->id,
            'title' => $this->task->title,
            'message' => ($this->task->assignee?->name ?? 'Alguien').' completó la tarea «'.$this->task->title.'».',
        ];
    }
}
