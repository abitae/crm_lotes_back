<?php

namespace App\Http\Controllers\Api\v1\Interno;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $notifications = $user->notifications()
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (DatabaseNotification $notification): array => [
                'id' => $notification->id,
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at?->toIso8601String(),
                'task_id' => $notification->data['task_id'] ?? null,
                'title' => $notification->data['title'] ?? null,
                'message' => $notification->data['message'] ?? null,
            ])
            ->values();

        return response()->json([
            'notifications' => $notifications,
        ]);
    }

    public function read(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $ids = $request->input('ids');
        $query = $user->unreadNotifications();

        if (is_array($ids) && $ids !== []) {
            $query->whereIn('id', $ids);
        }

        $query->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Avisos marcados como leídos.',
        ]);
    }
}
