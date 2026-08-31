import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthSimpleLayout from '@/layouts/auth/auth-simple-layout';
import { startOauthRedirect } from '@/lib/utils';
import { forgotPin } from '@/routes/crm';
import { store } from '@/routes/crm/login';

type Props = {
    status?: string | null;
};

export default function CrmLogin({ status }: Props) {
    return (
        <AuthSimpleLayout
            title="CRM Vendedores"
            description="Ingresa con tu usuario y PIN de Cazador para acceder al CRM."
        >
            <Head title="Ingresar al CRM" />

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
                            className="mt-4 w-full"
                            tabIndex={3}
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Entrar
                        </Button>

                        <div className="relative my-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">o</span>
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
                <div className="mb-4 text-center text-sm font-medium text-green-600 dark:text-green-500">
                    {status}
                </div>
            )}
        </AuthSimpleLayout>
    );
}
