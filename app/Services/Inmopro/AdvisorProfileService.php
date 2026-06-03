<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorProfile;
use App\Models\Inmopro\AdvisorProfileDocument;
use App\Support\FileStorage;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

class AdvisorProfileService
{
    /**
     * @param  array<string, mixed>|null  $profileData
     */
    public function syncFromRequest(Advisor $advisor, ?array $profileData, Request $request): void
    {
        if ($profileData === null && ! $this->requestHasProfileDocuments($request)) {
            return;
        }

        $profileData ??= [];

        $textPayload = [
            'professional_profile' => $this->nullableString($profileData['professional_profile'] ?? null),
            'skills_strengths' => $this->nullableString($profileData['skills_strengths'] ?? null),
            'availability' => $this->nullableString($profileData['availability'] ?? null),
        ];

        $hasText = $textPayload['professional_profile'] !== null
            || $textPayload['skills_strengths'] !== null
            || $textPayload['availability'] !== null;

        $profile = $advisor->profile;

        if ($profile === null && ! $hasText && ! $this->requestHasProfileDocuments($request)) {
            return;
        }

        if ($profile === null) {
            $profile = AdvisorProfile::query()->create([
                'advisor_id' => $advisor->id,
                ...$textPayload,
            ]);
        } else {
            $profile->update($textPayload);
        }

        $this->storeDocuments($profile, $request, $profileData);
    }

    private function requestHasProfileDocuments(Request $request): bool
    {
        $files = $request->file('profile.document_files');

        if (is_array($files)) {
            foreach ($files as $file) {
                if ($file instanceof UploadedFile) {
                    return true;
                }
            }
        }

        return $request->file('profile.document_files') instanceof UploadedFile;
    }

    /**
     * @param  array<string, mixed>  $profileData
     */
    private function storeDocuments(AdvisorProfile $profile, Request $request, array $profileData): void
    {
        $files = $request->file('profile.document_files');
        if (! is_array($files)) {
            $files = $files instanceof UploadedFile ? [$files] : [];
        }

        if ($files === []) {
            return;
        }

        $titles = $profileData['document_titles'] ?? [];
        if (! is_array($titles)) {
            $titles = [];
        }

        $nextSortOrder = ((int) $profile->documents()->max('sort_order')) + 1;

        foreach ($files as $index => $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $directory = sprintf('advisors/%d/profile-documents', $profile->advisor_id);
            $storedPath = FileStorage::storeUploadedFile($file, $directory);
            $title = isset($titles[$index]) && is_string($titles[$index]) && trim($titles[$index]) !== ''
                ? trim($titles[$index])
                : pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

            AdvisorProfileDocument::query()->create([
                'advisor_profile_id' => $profile->id,
                'title' => $title,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $storedPath,
                'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
                'file_size' => $file->getSize() ?: 0,
                'sort_order' => $nextSortOrder++,
            ]);
        }
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
