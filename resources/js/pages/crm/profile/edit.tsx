import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import profile from '@/routes/crm/profile';
import type { BreadcrumbItem } from '@/types';

type AdvisorData = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    username: string;
    team: { id: number; name: string } | null;
    level: { id: number; name: string } | null;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Mi perfil', href: '/crm/profile' }];

export default function CrmProfileEdit({ advisor }: { advisor: AdvisorData }) {
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

    const submitPin = (e: FormEvent) => {
        e.preventDefault();
        pinForm.put(profile.pin.update().url, {
            onSuccess: () => pinForm.reset(),
        });
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Mi perfil" />

            <div className="flex flex-col gap-6 p-6">
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
                                </div>
                            </div>

                            <Button type="submit" disabled={pinForm.processing}>
                                Actualizar PIN
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </CrmLayout>
    );
}
