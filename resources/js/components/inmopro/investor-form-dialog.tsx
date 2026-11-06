import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { inputClass, labelClass } from '@/lib/investors';

export type InvestorFormValues = {
    person_type: string;
    name: string;
    document_type: string;
    document_number: string;
    phone: string;
    email: string;
    address: string;
    bank_name: string;
    bank_account: string;
    bank_cci: string;
    is_active: boolean;
    notes: string;
};

const EMPTY_INVESTOR: InvestorFormValues = {
    person_type: 'NATURAL',
    name: '',
    document_type: 'DNI',
    document_number: '',
    phone: '',
    email: '',
    address: '',
    bank_name: '',
    bank_account: '',
    bank_cci: '',
    is_active: true,
    notes: '',
};

const PERSON_TYPE_LABELS: Record<string, string> = {
    NATURAL: 'Persona natural',
    JURIDICA: 'Persona jurídica',
};

export function InvestorFormDialog({
    open,
    onOpenChange,
    investor,
    personTypes,
    documentTypes,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    investor?: (Partial<InvestorFormValues> & { id: number }) | null;
    personTypes: string[];
    documentTypes: string[];
}) {
    const form = useForm<InvestorFormValues>({ ...EMPTY_INVESTOR });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();
        form.setData({
            ...EMPTY_INVESTOR,
            ...Object.fromEntries(Object.entries(investor ?? {}).map(([key, value]) => [key, value ?? (key === 'is_active' ? true : '')])),
        } as InvestorFormValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, investor?.id]);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (investor) {
            form.put(`/inmopro/investors/${investor.id}`, options);
        } else {
            form.post('/inmopro/investors', options);
        }
    };

    const field = (name: keyof InvestorFormValues, label: string, type = 'text') => (
        <label className={labelClass}>
            {label}
            <input
                type={type}
                value={String(form.data[name] ?? '')}
                onChange={(event) => form.setData(name, event.target.value as never)}
                className={inputClass}
            />
            <InputError message={form.errors[name]} />
        </label>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{investor ? 'Editar inversionista' : 'Nuevo inversionista'}</DialogTitle>
                    <DialogDescription>Datos personales y la cuenta bancaria donde se le pagará.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
                    <label className={labelClass}>
                        Tipo de persona
                        <select value={form.data.person_type} onChange={(event) => form.setData('person_type', event.target.value)} className={inputClass}>
                            {personTypes.map((type) => (
                                <option key={type} value={type}>
                                    {PERSON_TYPE_LABELS[type] ?? type}
                                </option>
                            ))}
                        </select>
                    </label>
                    {field('name', form.data.person_type === 'JURIDICA' ? 'Razón social' : 'Nombre completo')}
                    <label className={labelClass}>
                        Tipo de documento
                        <select value={form.data.document_type} onChange={(event) => form.setData('document_type', event.target.value)} className={inputClass}>
                            {documentTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </label>
                    {field('document_number', 'Número de documento')}
                    {field('phone', 'Teléfono')}
                    {field('email', 'Correo', 'email')}
                    <div className="md:col-span-2">{field('address', 'Dirección')}</div>
                    {field('bank_name', 'Banco')}
                    {field('bank_account', 'Número de cuenta')}
                    {field('bank_cci', 'CCI')}
                    <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <input type="checkbox" checked={form.data.is_active} onChange={(event) => form.setData('is_active', event.target.checked)} />
                        Activo
                    </label>
                    <label className={`${labelClass} md:col-span-2`}>
                        Notas
                        <textarea value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} rows={2} className={inputClass} />
                        <InputError message={form.errors.notes} />
                    </label>
                    <DialogFooter className="md:col-span-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
