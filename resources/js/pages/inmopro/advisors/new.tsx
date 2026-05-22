import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InmoproMobileFormLayout from '@/layouts/inmopro/mobile-form-layout';
import { todayIsoDate } from '@/lib/date';
import { advisorsListingQuerySuffix } from '@/lib/inmopro-listing-query';
import { cn } from '@/lib/utils';

type AdvisorLevel = { id: number; name: string };
type Team = { id: number; name: string; color?: string };
type CityOption = { id: number; name: string; department?: string | null };
type MaterialTypeRow = { id: number; code: string; name: string };
type MaterialFormRow = { advisor_material_type_id: number; delivered_at: string; notes: string };

type AdvisorCreateForm = {
    dni: string;
    first_name: string;
    last_name: string;
    birth_date: string;
    joined_at: string;
    phone: string;
    email: string;
    city_id: number;
    team_id: number;
    advisor_level_id: number;
    superior_id: number | null;
    personal_quota: number;
    material_items: MaterialFormRow[];
    profile: {
        professional_profile: string;
        skills_strengths: string;
        availability: string;
        document_files: File[];
        document_titles: string[];
    };
};

const fieldClass = 'mt-1.5 h-11 w-full text-base';
const textareaClass = 'mt-1.5 min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base shadow-sm';

function buildMaterialFormRows(types: MaterialTypeRow[]): MaterialFormRow[] {
    return types.map((type) => ({
        advisor_material_type_id: type.id,
        delivered_at: '',
        notes: '',
    }));
}

function FormSection({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('rounded-2xl border border-border bg-card text-card-foreground p-4 shadow-sm', className)}>
            <div className="mb-4 space-y-1">
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                {description ? <p className="text-sm leading-snug text-slate-500">{description}</p> : null}
            </div>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

export default function AdvisorsNew({
    advisorLevels,
    advisorsList,
    teams,
    cities,
    materialTypes,
}: {
    advisorLevels: AdvisorLevel[];
    advisorsList: { id: number; name: string }[];
    teams: Team[];
    cities: CityOption[];
    materialTypes: MaterialTypeRow[];
}) {
    const listQs = advisorsListingQuerySuffix(usePage().url);
    const { data, setData, post, processing, errors } = useForm<AdvisorCreateForm>({
        dni: '',
        first_name: '',
        last_name: '',
        birth_date: '',
        joined_at: '',
        phone: '',
        email: '',
        city_id: cities[0]?.id ?? 0,
        team_id: teams[0]?.id ?? 0,
        advisor_level_id: advisorLevels[0]?.id ?? 0,
        superior_id: null,
        personal_quota: 0,
        material_items: buildMaterialFormRows(materialTypes),
        profile: {
            professional_profile: '',
            skills_strengths: '',
            availability: '',
            document_files: [],
            document_titles: [],
        },
    });

    const updateMaterialRow = (index: number, patch: Partial<MaterialFormRow>) => {
        const next = [...data.material_items];
        next[index] = { ...next[index], ...patch };
        setData('material_items', next);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(`/inmopro/advisors${listQs}`, { forceFormData: true });
    };

    return (
        <InmoproMobileFormLayout
            title="Registro completo"
            description="Complete identidad y contacto, perfil profesional y documentación."
            backHref={`/inmopro/advisors${listQs}`}
            backLabel="Volver a vendedores"
        >
            <Head title="Nuevo vendedor - Inmopro" />
            <form onSubmit={submit} className="space-y-4 pb-28">
                <FormSection title="Identidad y contacto" description="Datos personales y de contacto del vendedor.">
                    <div>
                        <Label htmlFor="dni">DNI (8 dígitos)</Label>
                        <Input
                            id="dni"
                            inputMode="numeric"
                            maxLength={8}
                            autoComplete="off"
                            value={data.dni}
                            onChange={(e) => setData('dni', e.target.value.replace(/\D/g, '').slice(0, 8))}
                            className={fieldClass}
                        />
                        <InputError message={errors.dni} />
                    </div>
                    <div>
                        <Label htmlFor="first_name">Nombres</Label>
                        <Input
                            id="first_name"
                            value={data.first_name}
                            onChange={(e) => setData('first_name', e.target.value)}
                            className={fieldClass}
                            autoComplete="given-name"
                        />
                        <InputError message={errors.first_name} />
                    </div>
                    <div>
                        <Label htmlFor="last_name">Apellidos</Label>
                        <Input
                            id="last_name"
                            value={data.last_name}
                            onChange={(e) => setData('last_name', e.target.value)}
                            className={fieldClass}
                            autoComplete="family-name"
                        />
                        <InputError message={errors.last_name} />
                    </div>
                    <div>
                        <Label htmlFor="birth_date">Nacimiento</Label>
                        <Input
                            id="birth_date"
                            type="date"
                            value={data.birth_date}
                            onChange={(e) => setData('birth_date', e.target.value)}
                            className={fieldClass}
                        />
                        <InputError message={errors.birth_date} />
                    </div>
                    <div>
                        <Label htmlFor="joined_at">Ingreso</Label>
                        <Input
                            id="joined_at"
                            type="date"
                            value={data.joined_at}
                            onChange={(e) => setData('joined_at', e.target.value)}
                            className={fieldClass}
                        />
                        <InputError message={errors.joined_at} />
                    </div>
                    <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            className={fieldClass}
                            inputMode="tel"
                            autoComplete="tel"
                        />
                        <InputError message={errors.phone} />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className={fieldClass}
                            autoComplete="email"
                        />
                        <InputError message={errors.email} />
                    </div>
                </FormSection>

                <FormSection title="Perfil profesional" description="Resumen comercial, fortalezas y disponibilidad del vendedor.">
                    <div>
                        <Label htmlFor="professional_profile">Perfil profesional</Label>
                        <textarea
                            id="professional_profile"
                            value={data.profile.professional_profile}
                            onChange={(e) => setData('profile', { ...data.profile, professional_profile: e.target.value })}
                            rows={4}
                            className={textareaClass}
                        />
                        <InputError message={errors['profile.professional_profile']} />
                    </div>
                    <div>
                        <Label htmlFor="skills_strengths">Habilidades y fortalezas</Label>
                        <textarea
                            id="skills_strengths"
                            value={data.profile.skills_strengths}
                            onChange={(e) => setData('profile', { ...data.profile, skills_strengths: e.target.value })}
                            rows={4}
                            className={textareaClass}
                        />
                        <InputError message={errors['profile.skills_strengths']} />
                    </div>
                    <div>
                        <Label htmlFor="availability">Disponibilidad</Label>
                        <textarea
                            id="availability"
                            value={data.profile.availability}
                            onChange={(e) => setData('profile', { ...data.profile, availability: e.target.value })}
                            rows={3}
                            className={textareaClass}
                        />
                        <InputError message={errors['profile.availability']} />
                    </div>
                </FormSection>

                <FormSection title="Documentación adjunta" description="CV, certificados u otros documentos de respaldo.">
                    <div>
                        <Label htmlFor="document_files">Archivos</Label>
                        <Input
                            id="document_files"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                                const files = Array.from(e.target.files ?? []);
                                setData('profile', {
                                    ...data.profile,
                                    document_files: files,
                                    document_titles: files.map((file) => file.name.replace(/\.[^.]+$/, '')),
                                });
                            }}
                            className="mt-1.5 h-auto min-h-11 w-full cursor-pointer py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-800"
                        />
                        <InputError message={errors['profile.document_files'] || errors['profile.document_files.0']} />
                    </div>
                </FormSection>

                <FormSection title="Material corporativo">
                    <div className="space-y-3">
                        {data.material_items.map((row, index) => (
                            <div key={row.advisor_material_type_id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <span className="text-sm font-semibold leading-snug text-slate-800">
                                        {materialTypes.find((type) => type.id === row.advisor_material_type_id)?.name ?? 'Material'}
                                    </span>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <Checkbox
                                            id={`material-${row.advisor_material_type_id}`}
                                            checked={Boolean(row.delivered_at)}
                                            onCheckedChange={(checked) => {
                                                updateMaterialRow(index, {
                                                    delivered_at: checked === true ? todayIsoDate() : '',
                                                });
                                            }}
                                        />
                                        <Label htmlFor={`material-${row.advisor_material_type_id}`} className="text-sm font-normal">
                                            Entregado
                                        </Label>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs text-slate-500">Fecha</Label>
                                        <Input
                                            type="date"
                                            value={row.delivered_at}
                                            onChange={(e) => updateMaterialRow(index, { delivered_at: e.target.value })}
                                            className="mt-1 h-11 text-base"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">Notas</Label>
                                        <Input
                                            value={row.notes}
                                            onChange={(e) => updateMaterialRow(index, { notes: e.target.value })}
                                            className="mt-1 h-11 text-base"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </FormSection>

                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
                        <Button type="submit" disabled={processing} className="h-11 w-full text-base">
                            Guardar vendedor
                        </Button>
                        <Button type="button" variant="outline" className="h-11 w-full text-base" asChild>
                            <Link href={`/inmopro/advisors${listQs}`}>Cancelar</Link>
                        </Button>
                    </div>
                </div>
            </form>
        </InmoproMobileFormLayout>
    );
}
