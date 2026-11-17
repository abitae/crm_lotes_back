<?php

namespace App\Http\Controllers\Api\v1\Interno;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\v1\Interno\StoreDeviceRequest;
use App\Models\User;
use App\Models\UserPushToken;
use Illuminate\Http\JsonResponse;

class DeviceController extends Controller
{
    public function update(StoreDeviceRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        UserPushToken::query()->updateOrCreate(
            ['expo_push_token' => $request->string('expo_push_token')->toString()],
            [
                'user_id' => $user->id,
                'platform' => $request->string('platform')->toString(),
            ],
        );

        return response()->json([
            'message' => 'Dispositivo registrado.',
        ]);
    }
}
