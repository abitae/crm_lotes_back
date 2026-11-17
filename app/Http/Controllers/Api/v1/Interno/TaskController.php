<?php

namespace App\Http\Controllers\Api\v1\Interno;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Interno\StoreTaskRequest;
use App\Http\Requests\Api\v1\Interno\UpdateTaskCompletionRequest;
use App\Models\Task;
use App\Models\User;
use App\Services\Interno\TaskCompletionNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $scope = $request->string('scope')->toString();

        if (! in_array($scope, ['asignadas', 'creadas'], true)) {
            $scope = 'asignadas';
        }

        $tasks = Task::query()
            ->with(['creator', 'assignee', 'completer'])
            ->when($scope === 'asignadas', fn ($query) => $query->where('assigned_to', $user->id))
            ->when($scope === 'creadas', fn ($query) => $query->where('created_by', $user->id)->whereColumn('assigned_to', '!=', 'created_by'))
            ->orderByRaw('completed_at is null desc')
            ->latest()
            ->get()
            ->map(fn (Task $task): array => $task->toApiArray())
            ->values();

        return response()->json([
            'tasks' => $tasks,
        ]);
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $task = Task::query()->create([
            'title' => $request->string('title')->toString(),
            'description' => $request->input('description'),
            'created_by' => $user->id,
            'assigned_to' => $request->integer('assigned_to'),
        ]);

        $task->load(['creator', 'assignee', 'completer']);

        return response()->json([
            'task' => $task->toApiArray(),
        ], 201);
    }

    public function completion(UpdateTaskCompletionRequest $request, Task $task, TaskCompletionNotifier $notifier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($task->assigned_to !== $user->id) {
            return response()->json([
                'message' => 'Solo la persona asignada puede marcar la tarea.',
            ], 403);
        }

        $task = $notifier->mark($task, $request->boolean('completed'), $user);

        return response()->json([
            'task' => $task->toApiArray(),
        ]);
    }
}
