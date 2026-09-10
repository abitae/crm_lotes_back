import { Link, usePage } from '@inertiajs/react';
import AppBrandingLogo from '@/components/app-branding-logo';
import FlashSwal from '@/components/flash-swal';
import { login as crmLogin } from '@/routes/crm';
import type { AuthLayoutProps } from '@/types';

export default function CrmAuthLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="grid min-h-svh lg:grid-cols-[minmax(280px,40%)_1fr]">
            <FlashSwal />
            <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0c3d4d] p-10 text-white lg:flex">
                <div
                    className="pointer-events-none absolute inset-0 opacity-40"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 20% 20%, rgb(26 168 181 / 0.35), transparent 42%), radial-gradient(circle at 90% 80%, rgb(20 184 196 / 0.2), transparent 40%)',
                    }}
                />
                <Link href={crmLogin()} className="relative z-10 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-white/10">
                        <AppBrandingLogo
                            iconClassName="size-7 fill-current text-white"
                            imageClassName="size-11 object-contain p-1"
                        />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7edce6]">
                            CRM vendedores
                        </p>
                        <p className="truncate text-sm font-semibold">{name}</p>
                    </div>
                </Link>
                <div className="relative z-10 max-w-sm space-y-3">
                    <h2 className="text-3xl font-bold tracking-tight">Tu cartera, en un solo lugar</h2>
                    <p className="text-sm leading-relaxed text-white/70">
                        Clientes, seguimientos y lotes. Acceso exclusivo para asesores con usuario y PIN.
                    </p>
                </div>
                <p className="relative z-10 text-xs text-white/45">Acceso de vendedores · {name}</p>
            </aside>

            <div className="flex items-center justify-center bg-[#eef3f6] p-6 dark:bg-background md:p-10">
                <div className="w-full max-w-sm">
                    <Link
                        href={crmLogin()}
                        className="mb-8 flex items-center gap-3 lg:hidden"
                    >
                        <div className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-[#0c3d4d]">
                            <AppBrandingLogo
                                iconClassName="size-6 fill-current text-white"
                                imageClassName="size-11 object-contain p-1"
                            />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1aa8b5]">
                                CRM vendedores
                            </p>
                            <p className="text-sm font-semibold text-[#0c3d4d] dark:text-foreground">{name}</p>
                        </div>
                    </Link>

                    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-card md:p-8">
                        <div className="mb-6 space-y-2">
                            <h1 className="text-xl font-semibold tracking-tight text-[#0c3d4d] dark:text-foreground">
                                {title}
                            </h1>
                            {description ? (
                                <p className="text-sm text-muted-foreground">{description}</p>
                            ) : null}
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
