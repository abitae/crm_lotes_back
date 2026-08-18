<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\UpdateOpenAiCazadorConfigRequest;
use App\Http\Requests\Inmopro\UploadOpenAiCazadorKnowledgeRequest;
use App\Jobs\OpenAi\IndexCazadorKnowledge;
use App\Models\Inmopro\OpenAiCazadorConfig;
use App\Models\Inmopro\OpenAiCazadorKnowledgeDocument;
use App\Models\Inmopro\OpenAiCazadorRun;
use App\OpenAi\Agents\CazadorCatalogAssistant;
use App\OpenAi\Services\MarkdownKnowledgeIndexer;
use App\OpenAi\Services\MarkdownKnowledgeSearch;
use App\Support\OpenAiCazadorConfigResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OpenAiCazadorConfigController extends Controller
{
    public function edit(): Response
    {
        $config = OpenAiCazadorConfig::current();
        $knowledgeDocuments = OpenAiCazadorKnowledgeDocument::query()
            ->with('uploader')
            ->withCount('chunks')
            ->latest('version')
            ->get();
        $runs = OpenAiCazadorRun::query()->where('created_at', '>=', now()->subDay());
        $runCount = (clone $runs)->count();

        return Inertia::render('inmopro/openai-cazador-settings', [
            'config' => [
                'enabled' => $config->enabled,
                'model' => $config->model,
                'max_message_length' => $config->max_message_length,
                'rate_limit' => $config->rate_limit,
                'knowledge_rate_limit' => $config->knowledge_rate_limit,
                'has_openai_api_key' => OpenAiCazadorConfigResolver::apiKeySource($config) !== 'none',
                'openai_api_key_source' => OpenAiCazadorConfigResolver::apiKeySource($config),
            ],
            'knowledgeDocuments' => $knowledgeDocuments->map(fn (OpenAiCazadorKnowledgeDocument $knowledge): array => [
                'id' => $knowledge->id,
                'version' => $knowledge->version,
                'expert_name' => $knowledge->expert_name,
                'original_name' => $knowledge->original_name,
                'file_size' => $knowledge->file_size,
                'sha256' => $knowledge->sha256,
                'status' => $knowledge->status,
                'is_active' => $knowledge->is_active,
                'error_message' => $knowledge->error_message,
                'updated_at' => $knowledge->updated_at?->toIso8601String(),
                'evaluated_at' => $knowledge->evaluated_at?->toIso8601String(),
                'uploaded_by' => $knowledge->uploader?->name,
                'chunks_count' => $knowledge->chunks_count,
            ])->all(),
            'metrics' => [
                'runs' => $runCount,
                'success_rate' => $runCount > 0 ? round(((clone $runs)->where('status', 'success')->count() / $runCount) * 100, 1) : null,
                'average_duration_ms' => (int) ((clone $runs)->avg('duration_ms') ?? 0),
                'prompt_tokens' => (int) (clone $runs)->sum('prompt_tokens'),
                'completion_tokens' => (int) (clone $runs)->sum('completion_tokens'),
            ],
        ]);
    }

    public function update(UpdateOpenAiCazadorConfigRequest $request): RedirectResponse
    {
        $config = OpenAiCazadorConfig::current();
        $validated = $request->validated();
        $validated['model'] = 'gpt-5.4';

        if ($request->boolean('remove_openai_api_key')) {
            $validated['openai_api_key'] = null;
        } elseif (! filled($request->input('openai_api_key'))) {
            unset($validated['openai_api_key']);
        }

        unset($validated['remove_openai_api_key']);

        $config->update($validated);

        OpenAiCazadorConfigResolver::forgetCache();
        OpenAiCazadorConfigResolver::applyRuntimeConfig();

        return redirect()->route('inmopro.openai-cazador.edit')
            ->with('success', 'Configuración de OpenAI Cazador actualizada.');
    }

    public function uploadKnowledge(UploadOpenAiCazadorKnowledgeRequest $request, MarkdownKnowledgeIndexer $indexer): RedirectResponse
    {
        $file = $request->file('knowledge_file');
        $content = (string) $file->get();
        if (! mb_check_encoding($content, 'UTF-8')) {
            throw ValidationException::withMessages(['knowledge_file' => 'El archivo debe estar codificado en UTF-8.']);
        }

        try {
            $indexer->split($content);
        } catch (\InvalidArgumentException $exception) {
            throw ValidationException::withMessages(['knowledge_file' => $exception->getMessage()]);
        }

        $version = ((int) OpenAiCazadorKnowledgeDocument::query()->max('version')) + 1;
        $path = 'openai-cazador/knowledge/v'.$version.'-'.Str::uuid().'.md';
        Storage::disk('local')->put($path, $content);

        $document = OpenAiCazadorKnowledgeDocument::query()->create([
            'version' => $version,
            'expert_name' => trim((string) $request->validated('expert_name')),
            'original_name' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'file_size' => strlen($content),
            'sha256' => hash('sha256', $content),
            'status' => 'processing',
            'uploaded_by' => $request->user()?->id,
        ]);

        IndexCazadorKnowledge::dispatch($document->id);

        return back()->with('success', 'El conocimiento del experto se está indexando. Los documentos activos seguirán disponibles.');
    }

    public function downloadKnowledge(OpenAiCazadorKnowledgeDocument $document): StreamedResponse
    {
        abort_unless(Storage::disk('local')->exists($document->storage_path), 404);

        return Storage::disk('local')->download($document->storage_path, $document->original_name);
    }

    public function destroyKnowledge(OpenAiCazadorKnowledgeDocument $document): RedirectResponse
    {
        Storage::disk('local')->delete($document->storage_path);
        $document->delete();

        return back()->with('success', 'Archivo de conocimiento eliminado.');
    }

    public function reindexKnowledge(OpenAiCazadorKnowledgeDocument $document): RedirectResponse
    {
        abort_unless(Storage::disk('local')->exists($document->storage_path), 404);
        abort_if($document->status === 'processing', 409, 'Este documento ya se está procesando.');
        $version = ((int) OpenAiCazadorKnowledgeDocument::query()->max('version')) + 1;
        $path = 'openai-cazador/knowledge/v'.$version.'-'.Str::uuid().'.md';
        Storage::disk('local')->copy($document->storage_path, $path);
        $replacement = OpenAiCazadorKnowledgeDocument::query()->create([
            'version' => $version,
            'expert_name' => $document->expert_name,
            'original_name' => $document->original_name,
            'storage_path' => $path,
            'file_size' => $document->file_size,
            'sha256' => $document->sha256,
            'status' => 'processing',
            'uploaded_by' => request()->user()?->id,
        ]);
        IndexCazadorKnowledge::dispatch($replacement->id);

        return back()->with('success', 'Reindexación iniciada.');
    }

    public function activateKnowledge(OpenAiCazadorKnowledgeDocument $document): RedirectResponse
    {
        abort_unless($document->status === 'ready', 422, 'Solo se puede activar una versión lista.');
        if (! $document->is_active) {
            abort_unless($document->evaluated_at !== null, 422, 'Prueba este documento antes de activarlo.');
        }

        $activating = ! $document->is_active;
        DB::transaction(function () use ($document, $activating): void {
            if ($activating) {
                OpenAiCazadorKnowledgeDocument::query()
                    ->whereKeyNot($document->id)
                    ->where('expert_name', $document->expert_name)
                    ->update(['is_active' => false]);
            }
            $document->update([
                'is_active' => $activating,
                'activated_at' => $activating ? now() : null,
            ]);
        });

        $message = $activating ? 'activado' : 'desactivado';

        return back()->with('success', "Conocimiento de {$document->expert_name} {$message} correctamente.");
    }

    public function previewKnowledge(Request $request, MarkdownKnowledgeSearch $search): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'max:500'],
            'document_id' => ['nullable', 'integer', 'exists:openai_cazador_knowledge_documents,id'],
        ]);
        $document = isset($validated['document_id'])
            ? OpenAiCazadorKnowledgeDocument::query()->where('status', 'ready')->findOrFail($validated['document_id'])
            : null;
        $matches = $search->search($validated['query'], 6, $document);
        $response = CazadorCatalogAssistant::make(previewKnowledge: $matches)
            ->prompt($validated['query'], model: 'gpt-5.4', timeout: 30);
        $document?->update(['evaluated_at' => now()]);

        return response()->json(['matches' => $matches, 'reply' => (string) $response]);
    }
}
