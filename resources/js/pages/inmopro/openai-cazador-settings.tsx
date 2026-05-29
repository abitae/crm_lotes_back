import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { update } from '@/actions/App/Http/Controllers/Inmopro/OpenAiCazadorConfigController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

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
};

export default function OpenAiCazadorSettings({ config }: OpenAiCazadorSettingsProps) {
    const { data, setData, put, processing, errors } = useForm({
        enabled: config.enabled,
        model: config.model ?? '',
        max_message_length: config.max_message_length,
        rate_limit: config.rate_limit,
        knowledge_rate_limit: config.knowledge_rate_limit,
        openai_api_key: '',
        remove_openai_api_key: false,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inmopro', href: '/inmopro/dashboard' },
        { title: 'OpenAI Cazador', href: '/inmopro/openai-cazador' },
    ];

    const apiKeySourceLabel =
        config.openai_api_key_source === 'database'
            ? 'Configurada en esta pantalla'
            : config.openai_api_key_source === 'env'
              ? 'Definida en OPENAI_API_KEY del servidor'
              : 'No configurada';

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(update.url());
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="OpenAI Cazador - Inmopro" />
            <div className="p-4 md:p-6">
                <h2 className="mb-2 text-2xl font-black text-slate-800 dark:text-slate-100">OpenAI Cazador</h2>
                <p className="mb-6 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                    Configura el asistente de catálogo para la app móvil Cazador: disponibilidad del módulo, modelo,
                    límites de uso y clave API de OpenAI. Los cambios se aplican de inmediato en la API.
                </p>

                <form onSubmit={submit} className="max-w-lg space-y-6">
                    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                        <Checkbox
                            id="enabled"
                            checked={data.enabled}
                            onCheckedChange={(checked) => setData('enabled', checked === true)}
                        />
                        <div className="space-y-1">
                            <Label htmlFor="enabled" className="cursor-pointer font-semibold">
                                Módulo habilitado
                            </Label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Si está desactivado, la API de chat y conocimiento responde con error 503.
                            </p>
                            <InputError message={errors.enabled} />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="model">Modelo (opcional)</Label>
                        <Input
                            id="model"
                            type="text"
                            value={data.model}
                            onChange={(e) => setData('model', e.target.value)}
                            className="mt-1"
                            placeholder="Ej. gpt-4o-mini (vacío = predeterminado del SDK)"
                            maxLength={255}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Deja vacío para usar el modelo más económico configurado en Laravel AI.
                        </p>
                        <InputError message={errors.model} />
                    </div>

                    <div>
                        <Label htmlFor="max_message_length">Longitud máxima del mensaje (caracteres)</Label>
                        <Input
                            id="max_message_length"
                            type="number"
                            min={100}
                            max={10000}
                            value={data.max_message_length}
                            onChange={(e) => setData('max_message_length', Number(e.target.value))}
                            className="mt-1"
                        />
                        <InputError message={errors.max_message_length} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="rate_limit">Límite chat (req/min por asesor)</Label>
                            <Input
                                id="rate_limit"
                                type="number"
                                min={1}
                                max={120}
                                value={data.rate_limit}
                                onChange={(e) => setData('rate_limit', Number(e.target.value))}
                                className="mt-1"
                            />
                            <InputError message={errors.rate_limit} />
                        </div>
                        <div>
                            <Label htmlFor="knowledge_rate_limit">Límite conocimiento (req/min)</Label>
                            <Input
                                id="knowledge_rate_limit"
                                type="number"
                                min={1}
                                max={600}
                                value={data.knowledge_rate_limit}
                                onChange={(e) => setData('knowledge_rate_limit', Number(e.target.value))}
                                className="mt-1"
                            />
                            <InputError message={errors.knowledge_rate_limit} />
                        </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                        <div>
                            <Label htmlFor="openai_api_key">Clave API de OpenAI</Label>
                            <p className="mt-1 text-xs text-slate-500">
                                Estado actual: <span className="font-medium">{apiKeySourceLabel}</span>
                                {config.has_openai_api_key ? ' (configurada)' : ''}
                            </p>
                        </div>
                        <Input
                            id="openai_api_key"
                            type="password"
                            value={data.openai_api_key}
                            onChange={(e) => setData('openai_api_key', e.target.value)}
                            className="mt-1"
                            placeholder="sk-… (dejar vacío para no cambiar)"
                            autoComplete="new-password"
                        />
                        <InputError message={errors.openai_api_key} />
                        {config.openai_api_key_source === 'database' ? (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="remove_openai_api_key"
                                    checked={data.remove_openai_api_key}
                                    onCheckedChange={(checked) => setData('remove_openai_api_key', checked === true)}
                                />
                                <Label htmlFor="remove_openai_api_key" className="cursor-pointer text-sm font-normal">
                                    Eliminar clave guardada y usar OPENAI_API_KEY del servidor
                                </Label>
                            </div>
                        ) : null}
                    </div>

                    <Button type="submit" disabled={processing}>
                        Guardar configuración
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
