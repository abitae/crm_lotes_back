<?php

namespace App\Http\Controllers\Api\v1\Cazador;

use App\Http\Controllers\Controller;
use App\Models\Inmopro\ProjectAsset;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SharedProjectAssetController extends Controller
{
    public function show(ProjectAsset $asset): StreamedResponse
    {
        $asset = ProjectAsset::query()->findOrFail($asset->id);

        abort_unless($asset->is_active, 404, 'Recurso no encontrado.');

        if (! Storage::disk($asset->disk)->exists($asset->path)) {
            Log::warning('cazador.shared_asset.file_missing', [
                'asset_id' => $asset->id,
                'project_id' => $asset->project_id,
                'disk' => $asset->disk,
                'path' => $asset->path,
            ]);

            abort(404, 'Archivo no encontrado en storage.');
        }

        return Storage::disk($asset->disk)->response(
            $asset->path,
            $asset->file_name,
            [
                'Content-Type' => $asset->mime_type,
                'Content-Disposition' => $this->contentDisposition($asset),
                'Cache-Control' => 'private, max-age=3600',
            ],
        );
    }

    private function contentDisposition(ProjectAsset $asset): string
    {
        $filename = addcslashes($asset->file_name, '"\\');
        $mime = strtolower((string) $asset->mime_type);

        $inline = $asset->kind === 'image'
            || $asset->kind === 'video'
            || str_starts_with($mime, 'image/')
            || str_starts_with($mime, 'video/')
            || $mime === 'application/pdf';

        $type = $inline ? 'inline' : 'attachment';

        return "{$type}; filename=\"{$filename}\"";
    }
}
