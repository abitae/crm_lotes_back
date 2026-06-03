<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\UpdateAppBrandingRequest;
use App\Models\AppBranding;
use App\Support\AppBrandingResolver;
use App\Support\FileStorage;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AppBrandingController extends Controller
{
    public function edit(): Response
    {
        $branding = AppBranding::current();

        return Inertia::render('inmopro/branding', [
            'branding' => [
                'display_name' => $branding->display_name,
                'tagline' => $branding->tagline,
                'primary_color' => $branding->primary_color,
                'logo_url' => FileStorage::url($branding->logo_path),
                'favicon_url' => FileStorage::url($branding->favicon_path),
            ],
        ]);
    }

    public function update(UpdateAppBrandingRequest $request): RedirectResponse
    {
        $branding = AppBranding::current();
        $validated = $request->validated();

        if ($request->hasFile('logo')) {
            FileStorage::deleteIfExists($branding->logo_path);
            $branding->logo_path = FileStorage::storeUploadedFile(
                $request->file('logo'),
                'branding',
            );
        } elseif ($request->boolean('remove_logo')) {
            FileStorage::deleteIfExists($branding->logo_path);
            $branding->logo_path = null;
        }

        if ($request->hasFile('favicon')) {
            FileStorage::deleteIfExists($branding->favicon_path);
            $branding->favicon_path = FileStorage::storeUploadedFile(
                $request->file('favicon'),
                'branding/favicons',
            );
        } elseif ($request->boolean('remove_favicon')) {
            FileStorage::deleteIfExists($branding->favicon_path);
            $branding->favicon_path = null;
        }

        $branding->display_name = filled($validated['display_name'] ?? null)
            ? $validated['display_name']
            : null;

        $branding->tagline = filled($validated['tagline'] ?? null)
            ? $validated['tagline']
            : null;

        $branding->primary_color = filled($validated['primary_color'] ?? null)
            ? $validated['primary_color']
            : null;

        $branding->save();

        AppBrandingResolver::forgetCache();

        return redirect()->route('inmopro.branding.edit')
            ->with('success', 'Personalización actualizada.');
    }
}
