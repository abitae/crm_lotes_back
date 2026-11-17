<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreTaskRequest;
use App\Http\Requests\Inmopro\UpdateTaskCompletionRequest;
use App\Http\Requests\Inmopro\UpdateTaskRequest;
use App\Models\Task;
use App\Models\User;
use App\Services\Interno\TaskCompletionNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(Request $request): Response
    {
        $tasks = Task::query()
            ->with(['creator:id,name', 'assignee:id,name', 'completer:id,name'])
            ->when($request->filled('created_by'), fn ($query) => $query->where('created_by', $request->integer('created_by')))
            ->when($request->filled('assigned_to'), fn ($query) => $query->where('assigned_to', $request->integer('assigned_to')))
            ->when($request->input('status') === 'pendiente', fn ($query) => $query->whereNull('completed_at'))
            ->when($request->input('status') === 'hecha', fn ($query) => $query->whereNotNull('completed_at'))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $term = (string) $request->input('search');
                $query->where(function ($nested) use ($term): void {
                    $nested->where('title', 'like', "%{$term}%")
                        ->orWhere('description', 'like', "%{$term}%");
                });
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('inmopro/tasks/index', [
            'tasks' => $tasks,
            'users' => User::query()->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['search', 'created_by', 'assigned_to', 'status']),
        ]);
    }

    public function store(StoreTaskRequest $request): RedirectResponse
    {
        Task::query()->create([
            'title' => $request->string('title')->toString(),
            'description' => $request->input('description'),
            'created_by' => $request->integer('created_by') ?: $request->user()->id,
            'assigned_to' => $request->integer('assigned_to'),
        ]);

        return redirect()->route('inmopro.tasks.index');
    }

    public function update(UpdateTaskRequest $request, Task $task): RedirectResponse
    {
        $task->update($request->validated());

        return redirect()->route('inmopro.tasks.index');
    }

    public function completion(UpdateTaskCompletionRequest $request, Task $task, TaskCompletionNotifier $notifier): RedirectResponse
    {
        $notifier->mark($task, $request->boolean('completed'), $request->user());

        return redirect()->route('inmopro.tasks.index');
    }

    public function destroy(Task $task): RedirectResponse
    {
        $task->delete();

        return redirect()->route('inmopro.tasks.index');
    }
}
