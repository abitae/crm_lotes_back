<?php

namespace Tests\Feature\OpenAi\Cazador;

use App\Jobs\OpenAi\IndexCazadorKnowledge;
use App\Models\Inmopro\OpenAiCazadorKnowledgeDocument;
use App\OpenAi\Services\MarkdownKnowledgeIndexer;
use App\OpenAi\Services\MarkdownKnowledgeSearch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Ai\Embeddings;
use Tests\TestCase;

class MarkdownKnowledgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_markdown_is_split_by_heading_with_bounded_overlap(): void
    {
        $markdown = "# Financiamiento\n".implode(' ', array_fill(0, 900, 'cuota'));
        $chunks = app(MarkdownKnowledgeIndexer::class)->split($markdown);

        $this->assertCount(3, $chunks);
        $this->assertSame('Financiamiento', $chunks[0]['heading']);
        $this->assertCount(450, preg_split('/\s+/', $chunks[0]['content']));
        $this->assertSame(
            array_slice(preg_split('/\s+/', $chunks[0]['content']), -60),
            array_slice(preg_split('/\s+/', $chunks[1]['content']), 0, 60),
        );
    }

    public function test_invalid_markdown_without_heading_is_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        app(MarkdownKnowledgeIndexer::class)->split('Texto sin estructura Markdown.');
    }

    public function test_replacement_stays_inactive_until_atomic_activation(): void
    {
        Embeddings::fake();
        $first = $this->document(1);
        app(MarkdownKnowledgeIndexer::class)->index($first, "# Empresa\nPrimera versión comercial.");

        $second = $this->document(2);
        app(MarkdownKnowledgeIndexer::class)->index($second, "# Empresa\nSegunda versión comercial.");

        $this->assertTrue($first->fresh()->is_active);
        $this->assertFalse($second->fresh()->is_active);
        $this->assertSame('ready', $second->fresh()->status);
    }

    public function test_semantic_search_returns_at_most_six_chunks_from_selected_version(): void
    {
        Embeddings::fake(fn ($prompt) => array_fill(0, count($prompt->inputs), array_fill(0, 1536, 1.0)));
        $active = $this->document(1);
        $active->update(['status' => 'ready', 'is_active' => true]);
        foreach (range(1, 8) as $position) {
            $active->chunks()->create([
                'position' => $position,
                'heading' => 'Sección '.$position,
                'content' => 'Contenido '.$position,
                'embedding' => array_fill(0, 1536, 1.0),
            ]);
        }
        $other = $this->document(2);
        $other->update(['status' => 'ready']);
        $other->chunks()->create([
            'position' => 1,
            'heading' => 'No visible',
            'content' => 'No pertenece a la versión activa',
            'embedding' => array_fill(0, 1536, 1.0),
        ]);

        $result = app(MarkdownKnowledgeSearch::class)->search('crédito para comprar', 20);

        $this->assertSame(1, $result['version']);
        $this->assertCount(6, $result['results']);
        $this->assertNotContains('No visible', collect($result['results'])->pluck('heading')->all());
    }

    public function test_semantic_search_combines_all_active_expert_documents(): void
    {
        Embeddings::fake(fn ($prompt) => array_fill(0, count($prompt->inputs), array_fill(0, 1536, 1.0)));
        $tim = $this->document(1, 'Tim Villafuerte');
        $tim->update(['status' => 'ready', 'is_active' => true]);
        $tim->chunks()->create([
            'position' => 1,
            'heading' => 'Cierre consultivo',
            'content' => 'Pregunta y escucha antes de proponer.',
            'embedding' => array_fill(0, 1536, 1.0),
        ]);
        $alex = $this->document(2, 'Alex Day');
        $alex->update(['status' => 'ready', 'is_active' => true]);
        $alex->chunks()->create([
            'position' => 1,
            'heading' => 'Manejo de objeciones',
            'content' => 'Valida la preocupación antes de responder.',
            'embedding' => array_fill(0, 1536, 1.0),
        ]);

        $result = app(MarkdownKnowledgeSearch::class)->search('¿Cómo cierro una venta?');

        $this->assertSame(2, $result['documents_count']);
        $this->assertSame([1, 2], $result['versions']);
        $this->assertEqualsCanonicalizing(
            ['Tim Villafuerte', 'Alex Day'],
            collect($result['results'])->pluck('expert_name')->all(),
        );
    }

    public function test_failed_indexing_keeps_previous_version_active(): void
    {
        Storage::fake('local');
        $active = $this->document(1);
        $active->update(['status' => 'ready', 'is_active' => true]);
        $replacement = $this->document(2);
        Storage::disk('local')->put($replacement->storage_path, "# Empresa\nContenido nuevo.");
        Embeddings::fake(fn () => throw new \RuntimeException('Proveedor no disponible'));

        try {
            app(IndexCazadorKnowledge::class, ['documentId' => $replacement->id])
                ->handle(app(MarkdownKnowledgeIndexer::class));
            $this->fail('La indexación debía fallar.');
        } catch (\RuntimeException) {
            // El job debe relanzar el error para que la cola aplique sus reintentos.
        }

        $this->assertTrue($active->fresh()->is_active);
        $this->assertSame('failed', $replacement->fresh()->status);
        $this->assertFalse($replacement->fresh()->is_active);
    }

    private function document(int $version, string $expertName = 'Conocimiento general'): OpenAiCazadorKnowledgeDocument
    {
        return OpenAiCazadorKnowledgeDocument::query()->create([
            'version' => $version,
            'expert_name' => $expertName,
            'original_name' => "conocimiento-v{$version}.md",
            'storage_path' => "openai-cazador/v{$version}.md",
            'file_size' => 100,
            'sha256' => hash('sha256', (string) $version),
            'status' => 'processing',
        ]);
    }
}
