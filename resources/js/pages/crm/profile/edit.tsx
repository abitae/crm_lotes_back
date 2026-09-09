import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { CalendarSync, MessageCircle, ShieldAlert } from 'lucide-react';
import type { FormEvent } from 'react';
import { CrmPage, CrmPageHeader } from '@/components/crm/crm-page';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import { startOauthRedirect } from '@/lib/utils';
import profile from '@/routes/crm/profile';
import type { Auth, BreadcrumbItem } from '@/types';

type AdvisorData = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    username: string;
    must_change_pin: boolean;
    team: { id: number; name: string } | null;
    level: { id: number; name: string } | null;
};

type GoogleShared = {
    connected: boolean;
    calendar_connected: boolean;
    email?: string | null;
};

type MetaShared = {
    connected: boolean;
    whatsapp: boolean;
    messenger: boolean;
    instagram: boolean;
    display_phone?: string | null;
    page_name?: string | null;
    status?: string;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Mi perfil', href: '/crm/profile' }];

export default function CrmProfileEdit({ advisor }: { advisor: AdvisorData }) {
    const { google, meta, errors: pageErrors } = usePage<{
        google: GoogleShared;
        meta: MetaShared;
        auth: Auth;
        errors: Record<string, string>;
    }>().props;

    const profileForm = useForm({
        name: advisor.name,
        phone: advisor.phone ?? '',
        email: advisor.email ?? '',
        username: advisor.username,
    });

    const pinForm = useForm({
        current_pin: '',
        pin: '',
        pin_confirmation: '',
    });

    const submitProfile = (e: FormEvent) => {
        e.preventDefault();
        profileForm.patch(profile.update().url);
    };

    const pinMismatch =
        pinForm.data.pin_confirmation.length > 0 && pinForm.data.pin !== pinForm.data.pin_confirmation;

    const submitPin = (e: FormEvent) => {
        e.preventDefault();

        if (pinForm.data.pin !== pinForm.data.pin_confirmation) {
            return;
        }

        pinForm.put(profile.pin.update().url, {
            onSuccess: () => pinForm.reset(),
        });
    };

    const disconnectCalendar = () => {
        router.post('/crm/google/calendar/disconnect');
    };

    const disconnectMeta = () => {
        router.post('/crm/meta/disconnect');
    };

    const syncTemplates = () => {
        router.post('/crm/meta/whatsapp/sync-templates');
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Mi perfil" />

            <CrmPage>
                {advisor.must_change_pin && (
                    <Alert>
                        <ShieldAlert />
                        <AlertTitle>Debes establecer un nuevo PIN</AlertTitle>
                        <AlertDescription>
                            Tu cuenta tiene un PIN temporal. Cámbialo antes de seguir usando el CRM.
                        </AlertDescription>
                    </Alert>
                )}

                <CrmPageHeader
                    title="Mi perfil"
                    description="Conexiones, datos de contacto y PIN."
                />

                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarSync className="h-5 w-5" />
                            Google Calendar
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {google.connected && (
                            <p className="text-sm text-muted-foreground">
                                Cuenta Google vinculada:{' '}
                                <span className="font-medium text-foreground">{google.email}</span>
                            </p>
                        )}

                        {google.calendar_connected ? (
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" onClick={disconnectCalendar}>
                                    Desconectar Calendar
                                </Button>
                                <Button type="button" variant="secondary" asChild>
                                    <Link href="/crm/agenda">Ver agenda</Link>
                                </Button>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Te redirigiremos a Google para autorizar el acceso a tu calendario y sincronizar
                                    los recordatorios del CRM.
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => startOauthRedirect('/crm/google/calendar/connect')}
                                >
                                    Conectar Google Calendar
                                </Button>
                            </>
                        )}

                        <InputError message={pageErrors.google_calendar} />
                    </CardContent>
                </Card>

                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            Meta Business
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {meta.connected ? (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Canales: {meta.whatsapp ? 'WhatsApp ✓' : 'WhatsApp —'} ·{' '}
                                    {meta.messenger ? 'Messenger ✓' : 'Messenger —'} ·{' '}
                                    {meta.instagram ? 'Instagram ✓' : 'Instagram —'}
                                </p>
                                {meta.display_phone && (
                                    <p className="text-sm">
                                        WhatsApp: <span className="font-medium">{meta.display_phone}</span>
                                    </p>
                                )}
                                {meta.page_name && (
                                    <p className="text-sm">
                                        Página: <span className="font-medium">{meta.page_name}</span>
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" onClick={disconnectMeta}>
                                        Desconectar Meta
                                    </Button>
                                    {meta.whatsapp && (
                                        <Button type="button" variant="secondary" onClick={syncTemplates}>
                                            Sincronizar plantillas
                                        </Button>
                                    )}
                                    <Button type="button" asChild>
                                        <Link href="/crm/inbox">Abrir inbox</Link>
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Conecta tu cuenta Meta para recibir y enviar mensajes de WhatsApp, Messenger e Instagram desde el CRM.
                                </p>
                                <Button type="button" onClick={() => startOauthRedirect('/crm/meta/connect')}>
                                    Conectar Meta Business
                                </Button>
                            </>
                        )}
                        <InputError message={pageErrors.meta} />
                    </CardContent>
                </Card>

                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>Datos personales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitProfile} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nombre</Label>
                                <Input
                                    id="name"
                                    value={profileForm.data.name}
                                    onChange={(e) => profileForm.setData('name', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={profileForm.errors.name} />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input
                                        id="phone"
                                        value={profileForm.data.phone}
                                        onChange={(e) => profileForm.setData('phone', e.target.value)}
                                        className="mt-1"
                                    />
                                    <InputError message={profileForm.errors.phone} />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={profileForm.data.email}
                                        onChange={(e) => profileForm.setData('email', e.target.value)}
                                        className="mt-1"
                                    />
                                    <InputError message={profileForm.errors.email} />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="username">Usuario</Label>
                                <Input
                                    id="username"
                                    value={profileForm.data.username}
                                    onChange={(e) => profileForm.setData('username', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={profileForm.errors.username} />
                            </div>

                            <Button type="submit" disabled={profileForm.processing}>
                                Guardar cambios
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>Cambiar PIN</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitPin} className="space-y-4">
                            <div>
                                <Label htmlFor="current_pin">PIN actual</Label>
                                <Input
                                    id="current_pin"
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={pinForm.data.current_pin}
                                    onChange={(e) => pinForm.setData('current_pin', e.target.value)}
                                    className="mt-1"
                                />
                                <InputError message={pinForm.errors.current_pin} />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="pin">Nuevo PIN</Label>
                                    <Input
                                        id="pin"
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={pinForm.data.pin}
                                        onChange={(e) => pinForm.setData('pin', e.target.value)}
                                        className="mt-1"
                                    />
                                    <InputError message={pinForm.errors.pin} />
                                </div>
                                <div>
                                    <Label htmlFor="pin_confirmation">Confirmar PIN</Label>
                                    <Input
                                        id="pin_confirmation"
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={pinForm.data.pin_confirmation}
                                        onChange={(e) => pinForm.setData('pin_confirmation', e.target.value)}
                                        className="mt-1"
                                    />
                                    {pinMismatch && (
                                        <p className="mt-1 text-sm text-destructive">Los PIN no coinciden.</p>
                                    )}
                                </div>
                            </div>

                            <Button type="submit" disabled={pinForm.processing || pinMismatch}>
                                Actualizar PIN
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </CrmPage>
        </CrmLayout>
    );
}
