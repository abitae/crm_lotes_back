<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AppVersionController extends Controller
{
    public function show(): JsonResponse
    {
        $androidLatest = max(0, (int) config('cazador.android_latest_version_code', 0));
        $androidMin = max(0, (int) config('cazador.android_min_version_code', 0));
        $iosLatest = max(0, (int) config('cazador.ios_latest_build_number', 0));
        $iosMin = max(0, (int) config('cazador.ios_min_build_number', 0));

        return response()->json([
            'android' => [
                'latest_version_code' => $androidLatest,
                'min_version_code' => min($androidMin, $androidLatest),
                'store_url' => (string) config('cazador.android_store_url', ''),
            ],
            'ios' => [
                'latest_build_number' => $iosLatest,
                'min_build_number' => min($iosMin, $iosLatest),
                'store_url' => (string) config('cazador.ios_store_url', ''),
            ],
        ]);
    }
}
