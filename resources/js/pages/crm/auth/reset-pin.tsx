import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import CrmAuthLayout from '@/layouts/crm/crm-auth-layout';
import { store } from '@/routes/crm/reset-pin';

type Props = {
    token: string;
    email: string;
};

export default function CrmResetPin({ token, email }: Props) {
    return (
        <CrmAuthLayout
            title="Establece un nuevo PIN"
            description="Elige un PIN de 6 dígitos que usarás para ingresar al CRM."
        >
            <Head title="Establecer nuevo PIN" />

            <Form {...store.form()} resetOnSuccess={['pin', 'pin_confirmation']} className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <input type="hidden" name="token" value={token} />

                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <Input id="email" type="email" name="email" defaultValue={email} required autoComplete="email" />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="pin">Nuevo PIN</Label>
                            <Input
                                id="pin"
                                type="password"
                                name="pin"
                                required
                                autoFocus
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                autoComplete="new-password"
                                placeholder="••••••"
                            />
                            <InputError message={errors.pin} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="pin_confirmation">Confirmar PIN</Label>
                            <Input
                                id="pin_confirmation"
                                type="password"
                                name="pin_confirmation"
                                required
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                autoComplete="new-password"
                                placeholder="••••••"
                            />
                        </div>

                        <Button type="submit" className="w-full bg-[#1aa8b5] text-white hover:bg-[#1599a6]" disabled={processing}>
                            {processing && <Spinner />}
                            Guardar nuevo PIN
                        </Button>
                    </div>
                )}
            </Form>
        </CrmAuthLayout>
    );
}
