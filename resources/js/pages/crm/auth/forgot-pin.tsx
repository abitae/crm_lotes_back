import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import CrmAuthLayout from '@/layouts/crm/crm-auth-layout';
import { login } from '@/routes/crm';
import { store } from '@/routes/crm/forgot-pin';

type Props = {
    status?: string | null;
};

export default function CrmForgotPin({ status }: Props) {
    return (
        <CrmAuthLayout
            title="¿Olvidaste tu PIN?"
            description="Ingresa tu correo registrado y te enviaremos un enlace para establecer un nuevo PIN."
        >
            <Head title="Recuperar PIN" />

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600 dark:text-green-500">
                    {status}
                </div>
            )}

            <Form {...store.form()} className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                autoComplete="email"
                                placeholder="tucorreo@ejemplo.com"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <Button type="submit" className="w-full bg-[#1aa8b5] text-white hover:bg-[#1599a6]" disabled={processing}>
                            {processing && <Spinner />}
                            Enviar enlace de recuperación
                        </Button>
                    </div>
                )}
            </Form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
                <TextLink href={login()}>Volver a iniciar sesión</TextLink>
            </div>
        </CrmAuthLayout>
    );
}
