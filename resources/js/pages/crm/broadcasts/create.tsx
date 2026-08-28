import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import type { BreadcrumbItem } from '@/types';

type Template = { id: number; template_name: string; language: string; category: string | null };

type Props = {
    templates: Template[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Broadcasts', href: '/crm/broadcasts' },
    { title: 'Nueva campaña', href: '/crm/broadcasts/create' },
];

export default function CrmBroadcastsCreate({ templates }: Props) {
    const form = useForm({
        name: '',
        message_template_id: templates[0]?.id ?? '',
        segment_config: {} as Record<string, unknown>,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/crm/broadcasts');
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva campaña" />

            <div className="mx-auto max-w-xl p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Nueva campaña WhatsApp</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nombre</Label>
                                <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                                <InputError message={form.errors.name} />
                            </div>

                            <div>
                                <Label htmlFor="template">Plantilla aprobada</Label>
                                <select
                                    id="template"
                                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                                    value={form.data.message_template_id}
                                    onChange={(e) => form.setData('message_template_id', Number(e.target.value))}
                                >
                                    {templates.map((template) => (
                                        <option key={template.id} value={template.id}>
                                            {template.template_name} ({template.language})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.message_template_id} />
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={form.processing || templates.length === 0}>
                                    Enviar campaña
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/crm/broadcasts">Cancelar</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </CrmLayout>
    );
}
