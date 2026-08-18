import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type City = { id: number; name: string; department?: string | null };

type PageProps = {
    token: string;
    capturerName: string;
    advisorName?: string | null;
    cities: City[];
    name: string;
    brandingPrimaryColor?: string;
    flash?: { success?: string; error?: string };
};

export default function DateroClientRegister() {
    const {
        token,
        capturerName,
        advisorName,
        cities,
        name,
        brandingPrimaryColor,
        flash,
    } = usePage<PageProps>().props;
    const accent = brandingPrimaryColor ?? '#059669';

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        dni: '',
        phone: '',
        email: '',
        referred_by: '',
        city_id: '' as string | number,
    });

    const successMessage = flash?.success;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(`/registro-datero/${token}`, { preserveScroll: true });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <Head title="Registro de cliente" />
            <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-4 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <span
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
                            style={{ backgroundColor: accent }}
                        >
                            <Building2 className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                            <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                                Registro
                            </p>
                            <p className="text-base font-bold tracking-tight">
                                {name}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/"
                        className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                        Inicio
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-xl px-6 py-10">
                {successMessage ? (
                    <Card className="border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40">
                        <CardHeader>
                            <CardTitle className="text-emerald-900 dark:text-emerald-100">
                                ¡Listo!
                            </CardTitle>
                            <CardDescription className="text-emerald-800 dark:text-emerald-200">
                                {successMessage}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ) : (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Registro de cliente
                            </h1>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                Estás registrándote con{' '}
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {capturerName}
                                </span>
                                {advisorName ? (
                                    <>
                                        {' '}
                                        (asesor:{' '}
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {advisorName}
                                        </span>
                                        )
                                    </>
                                ) : null}
                                . Completa tus datos para que el equipo pueda
                                contactarte.
                            </p>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Tus datos</CardTitle>
                                <CardDescription>
                                    Los campos marcados con * son obligatorios.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submit} className="space-y-4">
                                    <InputError
                                        message={
                                            (errors as Record<string, string>)
                                                .duplicate_registration
                                        }
                                        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
                                    />
                                    <div>
                                        <Label htmlFor="name">
                                            Nombre completo *
                                        </Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) =>
                                                setData('name', e.target.value)
                                            }
                                            className="mt-1"
                                            required
                                            autoComplete="name"
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label htmlFor="dni">DNI</Label>
                                            <Input
                                                id="dni"
                                                value={data.dni}
                                                onChange={(e) =>
                                                    setData(
                                                        'dni',
                                                        e.target.value,
                                                    )
                                                }
                                                className="mt-1"
                                                autoComplete="off"
                                            />
                                            <InputError message={errors.dni} />
                                        </div>
                                        <div>
                                            <Label htmlFor="phone">
                                                Teléfono *
                                            </Label>
                                            <Input
                                                id="phone"
                                                value={data.phone}
                                                onChange={(e) =>
                                                    setData(
                                                        'phone',
                                                        e.target.value,
                                                    )
                                                }
                                                className="mt-1"
                                                required
                                                inputMode="tel"
                                                autoComplete="tel"
                                            />
                                            <InputError
                                                message={errors.phone}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="email">
                                            Correo electrónico
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) =>
                                                setData('email', e.target.value)
                                            }
                                            className="mt-1"
                                            autoComplete="email"
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                    <div>
                                        <Label htmlFor="city_id">
                                            Ciudad *
                                        </Label>
                                        <select
                                            id="city_id"
                                            value={
                                                data.city_id === ''
                                                    ? ''
                                                    : String(data.city_id)
                                            }
                                            onChange={(e) =>
                                                setData(
                                                    'city_id',
                                                    e.target.value === ''
                                                        ? ''
                                                        : Number(
                                                              e.target.value,
                                                          ),
                                                )
                                            }
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                                            required
                                        >
                                            <option value="">
                                                Seleccionar…
                                            </option>
                                            {cities.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {[c.name, c.department]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.city_id} />
                                    </div>
                                    <div>
                                        <Label htmlFor="referred_by">
                                            ¿Cómo nos conociste?
                                        </Label>
                                        <Input
                                            id="referred_by"
                                            value={data.referred_by}
                                            onChange={(e) =>
                                                setData(
                                                    'referred_by',
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-1"
                                            placeholder="Opcional"
                                        />
                                        <InputError
                                            message={errors.referred_by}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full sm:w-auto"
                                    >
                                        Enviar registro
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </>
                )}
            </main>
        </div>
    );
}
