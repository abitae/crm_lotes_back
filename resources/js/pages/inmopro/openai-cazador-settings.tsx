import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    Download,
    FileText,
    Play,
    RefreshCw,
    Trash2,
    Upload,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { update } from '@/actions/App/Http/Controllers/Inmopro/OpenAiCazadorConfigController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Knowledge = {
    id: number;
    version: number;
    expert_name: string;
    original_name: string;
    file_size: number;
    sha256: string;
    status: 'processing' | 'ready' | 'failed';
    is_active: boolean;
    error_message: string | null;
    updated_at: string | null;
    evaluated_at: string | null;
    uploaded_by: string | null;
    chunks_count: number;
};

type Preview = {
    reply: string;
    matches: {
        version: number | null;
        results: Array<{
            document_id: number;
            expert_name: string;
            version: number;
            heading: string | null;
            content: string;
            score: number;
        }>;
    };
};

type OpenAiCazadorSettingsProps = {
    config: {
        enabled: boolean;
        model: string | null;
        max_message_length: number;
        rate_limit: number;
        knowledge_rate_limit: number;
        has_openai_api_key: boolean;
        openai_api_key_source: 'database' | 'env' | 'none';
    };
    knowledgeDocuments: Knowledge[];
    metrics: {
        runs: number;
        success_rate: number | null;
        average_duration_ms: number;
        prompt_tokens: number;
        completion_tokens: number;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inmopro', href: '/inmopro/dashboard' },
    { title: 'OpenAI Cazador', href: '/inmopro/openai-cazador' },
];

function getXsrfTokenFromCookie(): string {
    const token = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('XSRF-TOKEN='));

    return token ? decodeURIComponent(token.slice('XSRF-TOKEN='.length)) : '';
}

function formatBytes(bytes: number): string {
    return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
}

export default function OpenAiCazadorSettings({
    config,
    knowledgeDocuments,
    metrics,
}: OpenAiCazadorSettingsProps) {
    const { data, setData, put, processing, errors } = useForm({
        enabled: config.enabled,
        model: 'gpt-5.4',
        max_message_length: config.max_message_length,
        rate_limit: config.rate_limit,
        knowledge_rate_limit: config.knowledge_rate_limit,
        openai_api_key: '',
        remove_openai_api_key: false,
    });
    const [file, setFile] = useState<File | null>(null);
    const [expertName, setExpertName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedDocumentId, setSelectedDocumentId] = useState<number>(0);
    const [testing, setTesting] = useState(false);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const selectedKnowledge =
        knowledgeDocuments.find(
            (document) => document.id === selectedDocumentId,
        ) ?? knowledgeDocuments.find((document) => document.status === 'ready');

    const apiKeySourceLabel =
        config.openai_api_key_source === 'database'
            ? 'Configurada en esta pantalla'
            : config.openai_api_key_source === 'env'
              ? 'Definida en OPENAI_API_KEY del servidor'
              : 'No configurada';

    const submit = (event: FormEvent) => {
        event.preventDefault();
        put(update.url());
    };

    const uploadKnowledge = (event: FormEvent) => {
        event.preventDefault();
        if (!file || !expertName.trim()) return;
        setUploading(true);
        router.post(
            '/inmopro/openai-cazador/knowledge',
            { expert_name: expertName.trim(), knowledge_file: file },
            {
                forceFormData: true,
                onSuccess: () => {
                    setFile(null);
                    setExpertName('');
                },
                onFinish: () => setUploading(false),
            },
        );
    };

    const testKnowledge = async (knowledge: Knowledge) => {
        if (!query.trim() || knowledge.status !== 'ready') return;
        setTesting(true);
        setPreviewError(null);
        setPreview(null);
        try {
            const response = await fetch(
                '/inmopro/openai-cazador/knowledge/preview',
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': getXsrfTokenFromCookie(),
                    },
                    body: JSON.stringify({
                        query: query.trim(),
                        document_id: knowledge.id,
                    }),
                },
            );
            const body = (await response.json()) as Preview & {
                message?: string;
            };
            if (!response.ok)
                throw new Error(
                    body.message ?? 'No se pudo ejecutar la prueba.',
                );
            setPreview(body);
            router.reload({ only: ['knowledgeDocuments'] });
        } catch (error) {
            setPreviewError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo ejecutar la prueba.',
            );
        } finally {
            setTesting(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="OpenAI Cazador - Inmopro" />
            <div className="space-y-6 p-4 md:p-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        OpenAI Cazador
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
                        Configura el asistente y su conocimiento comercial
                        privado. El inventario, los precios y la disponibilidad
                        siempre se consultan desde el sistema.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                        ['Consultas (24 h)', metrics.runs],
                        [
                            'Éxito',
                            metrics.success_rate === null
                                ? '—'
                                : metrics.success_rate + '%',
                        ],
                        ['Latencia media', metrics.average_duration_ms + ' ms'],
                        ['Tokens entrada', metrics.prompt_tokens],
                        ['Tokens salida', metrics.completion_tokens],
                    ].map(([label, value]) => (
                        <Card key={String(label)}>
                            <CardContent className="pt-5">
                                <p className="text-xs text-slate-500">
                                    {label}
                                </p>
                                <p className="mt-1 text-xl font-bold">
                                    {value}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración</CardTitle>
                            <CardDescription>
                                Modelo fijo y límites aplicados a la app
                                Cazador.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-5">
                                <div className="flex items-start gap-3 rounded-lg border p-4">
                                    <Checkbox
                                        id="enabled"
                                        checked={data.enabled}
                                        onCheckedChange={(checked) =>
                                            setData('enabled', checked === true)
                                        }
                                    />
                                    <div>
                                        <Label htmlFor="enabled">
                                            Módulo habilitado
                                        </Label>
                                        <p className="text-xs text-slate-500">
                                            Controla el acceso al chat desde
                                            Cazador.
                                        </p>
                                        <InputError message={errors.enabled} />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="model">Modelo</Label>
                                    <Input
                                        id="model"
                                        value="gpt-5.4"
                                        readOnly
                                        className="mt-1 bg-slate-50"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Fijo para mantener una ejecución
                                        consistente.
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="max_message_length">
                                        Longitud máxima del mensaje
                                    </Label>
                                    <Input
                                        id="max_message_length"
                                        type="number"
                                        min={100}
                                        max={10000}
                                        value={data.max_message_length}
                                        onChange={(event) =>
                                            setData(
                                                'max_message_length',
                                                Number(event.target.value),
                                            )
                                        }
                                        className="mt-1"
                                    />
                                    <InputError
                                        message={errors.max_message_length}
                                    />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label htmlFor="rate_limit">
                                            Chat (req/min por asesor)
                                        </Label>
                                        <Input
                                            id="rate_limit"
                                            type="number"
                                            min={1}
                                            max={120}
                                            value={data.rate_limit}
                                            onChange={(event) =>
                                                setData(
                                                    'rate_limit',
                                                    Number(event.target.value),
                                                )
                                            }
                                            className="mt-1"
                                        />
                                        <InputError
                                            message={errors.rate_limit}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="knowledge_rate_limit">
                                            Catálogo (req/min)
                                        </Label>
                                        <Input
                                            id="knowledge_rate_limit"
                                            type="number"
                                            min={1}
                                            max={600}
                                            value={data.knowledge_rate_limit}
                                            onChange={(event) =>
                                                setData(
                                                    'knowledge_rate_limit',
                                                    Number(event.target.value),
                                                )
                                            }
                                            className="mt-1"
                                        />
                                        <InputError
                                            message={
                                                errors.knowledge_rate_limit
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3 rounded-lg border p-4">
                                    <div>
                                        <Label htmlFor="openai_api_key">
                                            Clave API de OpenAI
                                        </Label>
                                        <p className="text-xs text-slate-500">
                                            {apiKeySourceLabel}
                                            {config.has_openai_api_key
                                                ? ' (configurada)'
                                                : ''}
                                        </p>
                                    </div>
                                    <Input
                                        id="openai_api_key"
                                        type="password"
                                        value={data.openai_api_key}
                                        onChange={(event) =>
                                            setData(
                                                'openai_api_key',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="sk-… (vacío para conservar)"
                                        autoComplete="new-password"
                                    />
                                    <InputError
                                        message={errors.openai_api_key}
                                    />
                                    {config.openai_api_key_source ===
                                    'database' ? (
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="remove_openai_api_key"
                                                checked={
                                                    data.remove_openai_api_key
                                                }
                                                onCheckedChange={(checked) =>
                                                    setData(
                                                        'remove_openai_api_key',
                                                        checked === true,
                                                    )
                                                }
                                            />
                                            <Label
                                                htmlFor="remove_openai_api_key"
                                                className="font-normal"
                                            >
                                                Eliminar la clave guardada
                                            </Label>
                                        </div>
                                    ) : null}
                                </div>
                                <Button type="submit" disabled={processing}>
                                    Guardar configuración
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Conocimiento Markdown</CardTitle>
                                <CardDescription>
                                    Carga un archivo privado UTF-8 de hasta 1 MB
                                    por cada experto en ventas. Varios expertos
                                    pueden aportar conocimiento simultáneamente.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                    No incluyas precios, disponibilidad ni datos
                                    personales: esos datos deben provenir del
                                    sistema.
                                </div>
                                <form
                                    onSubmit={uploadKnowledge}
                                    className="space-y-2"
                                >
                                    <Label htmlFor="expert_name">
                                        Experto o personaje
                                    </Label>
                                    <Input
                                        id="expert_name"
                                        value={expertName}
                                        maxLength={120}
                                        placeholder="Ej. Tim Villafuerte"
                                        onChange={(event) =>
                                            setExpertName(event.target.value)
                                        }
                                    />
                                    <InputError
                                        message={
                                            (errors as Record<string, string>)
                                                .expert_name
                                        }
                                    />
                                    <Label htmlFor="knowledge_file">
                                        Archivo de conocimiento
                                    </Label>
                                    <Input
                                        id="knowledge_file"
                                        type="file"
                                        accept=".md,.markdown,text/markdown,text/plain"
                                        onChange={(event) =>
                                            setFile(
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={
                                            (errors as Record<string, string>)
                                                .knowledge_file
                                        }
                                    />
                                    <Button
                                        type="submit"
                                        disabled={
                                            !file ||
                                            !expertName.trim() ||
                                            uploading
                                        }
                                    >
                                        <Upload className="mr-2 size-4" />
                                        {uploading
                                            ? 'Cargando…'
                                            : 'Cargar e indexar'}
                                    </Button>
                                </form>

                                {knowledgeDocuments.length > 0 ? (
                                    <div className="space-y-3">
                                        {knowledgeDocuments.map((knowledge) => (
                                            <div
                                                key={knowledge.id}
                                                className="space-y-3 rounded-lg border p-4 text-sm"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex gap-2">
                                                        <FileText className="mt-0.5 size-5 text-emerald-600" />
                                                        <div>
                                                            <p className="font-bold text-emerald-700">
                                                                {
                                                                    knowledge.expert_name
                                                                }
                                                            </p>
                                                            <p className="font-semibold">
                                                                {
                                                                    knowledge.original_name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                v
                                                                {
                                                                    knowledge.version
                                                                }{' '}
                                                                ·{' '}
                                                                {formatBytes(
                                                                    knowledge.file_size,
                                                                )}{' '}
                                                                ·{' '}
                                                                {
                                                                    knowledge.chunks_count
                                                                }{' '}
                                                                fragmentos
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
                                                        {knowledge.status ===
                                                        'processing'
                                                            ? 'Procesando'
                                                            : knowledge.status ===
                                                                'ready'
                                                              ? knowledge.is_active
                                                                  ? 'Activo'
                                                                  : 'Listo para activar'
                                                              : 'Fallido'}
                                                    </span>
                                                </div>
                                                <div className="grid gap-1 text-xs text-slate-500">
                                                    <div>
                                                        Hash:{' '}
                                                        <span className="font-mono">
                                                            {knowledge.sha256.slice(
                                                                0,
                                                                16,
                                                            )}
                                                            …
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Responsable:{' '}
                                                        {knowledge.uploaded_by ??
                                                            'No disponible'}
                                                    </div>
                                                    <div>
                                                        Prueba previa:{' '}
                                                        {knowledge.evaluated_at
                                                            ? 'realizada'
                                                            : 'pendiente'}
                                                    </div>
                                                    <div>
                                                        Actualizado:{' '}
                                                        {knowledge.updated_at
                                                            ? new Date(
                                                                  knowledge.updated_at,
                                                              ).toLocaleString(
                                                                  'es-PE',
                                                              )
                                                            : '—'}
                                                    </div>
                                                </div>
                                                {knowledge.error_message ? (
                                                    <p className="rounded bg-red-50 p-2 text-xs text-red-700">
                                                        {
                                                            knowledge.error_message
                                                        }
                                                    </p>
                                                ) : null}
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <a
                                                            href={
                                                                '/inmopro/openai-cazador/knowledge/' +
                                                                knowledge.id +
                                                                '/download'
                                                            }
                                                        >
                                                            <Download className="mr-2 size-4" />{' '}
                                                            Descargar
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={
                                                            knowledge.status ===
                                                            'processing'
                                                        }
                                                        onClick={() =>
                                                            router.post(
                                                                '/inmopro/openai-cazador/knowledge/' +
                                                                    knowledge.id +
                                                                    '/reindex',
                                                            )
                                                        }
                                                    >
                                                        <RefreshCw className="mr-2 size-4" />{' '}
                                                        Reindexar
                                                    </Button>
                                                    {knowledge.status ===
                                                    'ready' ? (
                                                        <Button
                                                            variant={
                                                                knowledge.is_active
                                                                    ? 'outline'
                                                                    : 'default'
                                                            }
                                                            size="sm"
                                                            disabled={
                                                                !knowledge.is_active &&
                                                                !knowledge.evaluated_at
                                                            }
                                                            onClick={() =>
                                                                router.post(
                                                                    '/inmopro/openai-cazador/knowledge/' +
                                                                        knowledge.id +
                                                                        '/activate',
                                                                )
                                                            }
                                                        >
                                                            <CheckCircle2 className="mr-2 size-4" />{' '}
                                                            {knowledge.is_active
                                                                ? 'Desactivar'
                                                                : 'Activar conocimiento'}
                                                        </Button>
                                                    ) : null}
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (
                                                                window.confirm(
                                                                    '¿Eliminar este archivo y sus fragmentos?',
                                                                )
                                                            ) {
                                                                router.delete(
                                                                    '/inmopro/openai-cazador/knowledge/' +
                                                                        knowledge.id,
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 size-4" />{' '}
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">
                                        Todavía no hay conocimiento cargado.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Probar recuperación y respuesta
                                </CardTitle>
                                <CardDescription>
                                    Revisa los fragmentos encontrados y una
                                    respuesta antes de activar la versión.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Label htmlFor="preview_document">
                                        Experto a probar
                                    </Label>
                                    <select
                                        id="preview_document"
                                        className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                                        value={selectedKnowledge?.id ?? ''}
                                        onChange={(event) =>
                                            setSelectedDocumentId(
                                                Number(event.target.value),
                                            )
                                        }
                                    >
                                        {knowledgeDocuments
                                            .filter(
                                                (document) =>
                                                    document.status === 'ready',
                                            )
                                            .map((document) => (
                                                <option
                                                    key={document.id}
                                                    value={document.id}
                                                >
                                                    {document.expert_name} ·{' '}
                                                    {document.original_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <Input
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder="Ej. ¿Cómo funciona el financiamiento?"
                                    maxLength={500}
                                />
                                <Button
                                    type="button"
                                    onClick={() =>
                                        selectedKnowledge
                                            ? void testKnowledge(
                                                  selectedKnowledge,
                                              )
                                            : undefined
                                    }
                                    disabled={
                                        testing ||
                                        !query.trim() ||
                                        selectedKnowledge?.status !== 'ready'
                                    }
                                >
                                    <Play className="mr-2 size-4" />{' '}
                                    {testing ? 'Probando…' : 'Ejecutar prueba'}
                                </Button>
                                {previewError ? (
                                    <p className="text-sm text-red-600">
                                        {previewError}
                                    </p>
                                ) : null}
                                {preview ? (
                                    <div className="space-y-3">
                                        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">
                                            {preview.reply}
                                        </div>
                                        <div className="space-y-2">
                                            {preview.matches.results.map(
                                                (match, index) => (
                                                    <details
                                                        key={
                                                            (match.heading ??
                                                                'chunk') +
                                                            '-' +
                                                            index
                                                        }
                                                        className="rounded-lg border p-3"
                                                    >
                                                        <summary className="cursor-pointer text-sm font-semibold">
                                                            {match.expert_name}{' '}
                                                            ·{' '}
                                                            {match.heading ??
                                                                'Sin título'}{' '}
                                                            · similitud{' '}
                                                            {match.score.toFixed(
                                                                3,
                                                            )}
                                                        </summary>
                                                        <p className="mt-2 text-xs whitespace-pre-wrap text-slate-600">
                                                            {match.content}
                                                        </p>
                                                    </details>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
