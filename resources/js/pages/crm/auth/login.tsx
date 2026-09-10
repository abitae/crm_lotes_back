import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import CrmAuthLayout from '@/layouts/crm/crm-auth-layout';
import { startOauthRedirect } from '@/lib/utils';
import { forgotPin } from '@/routes/crm';
import { store } from '@/routes/crm/login';

type Props = {
    status?: string | null;
};

export default function CrmLogin({ status }: Props) {
    return (
        <CrmAuthLayout
            title="Ingresar al CRM"
            description="Acceso para vendedores. Usa tu usuario y PIN de Cazador."
        >
            <Head title="CRM vendedores" />

            <Form
                {...store.form()}
                resetOnSuccess={['pin']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Usuario</Label>
                            <Input
                                id="username"
                                type="text"
                                name="username"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="username"
                                placeholder="usuario.cazador"
                            />
                            <InputError message={errors.username} />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="pin">PIN</Label>
                                <TextLink href={forgotPin()} tabIndex={4} className="text-sm">
                                    ¿Olvidaste tu PIN?
                                </TextLink>
                            </div>
                            <Input
                                id="pin"
                                type="password"
                                name="pin"
                                required
                                tabIndex={2}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                autoComplete="current-password"
                                placeholder="••••••"
                            />
                            <InputError message={errors.pin} />
                        </div>

                        <Button
                            type="submit"
                            className="mt-2 w-full bg-[#1aa8b5] text-white hover:bg-[#1599a6]"
                            tabIndex={3}
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Entrar al CRM
                        </Button>

                        <div className="relative my-1">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-muted-foreground dark:bg-card">o</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            tabIndex={5}
                            onClick={() => startOauthRedirect('/crm/auth/google')}
                        >
                            Continuar con Google
                        </Button>
                    </div>
                )}
            </Form>

            {status && (
                <div className="mt-4 text-center text-sm font-medium text-green-600 dark:text-green-500">
                    {status}
                </div>
            )}
        </CrmAuthLayout>
    );
}
