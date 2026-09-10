import { Head, Link, usePage } from '@inertiajs/react';
import { Building2, LayoutDashboard, LogIn, Users } from 'lucide-react';
import { dashboard, login } from '@/routes';
import { login as crmLogin } from '@/routes/crm';

type WelcomePageProps = {
    auth: { user: unknown | null };
    name: string;
    brandingTagline?: string | null;
    brandingPrimaryColor?: string;
};

export default function Welcome() {
    const { auth, name, brandingTagline, brandingPrimaryColor } = usePage<WelcomePageProps>().props;
    const accent = brandingPrimaryColor ?? '#059669';

    return (
        <>
            <Head title={`${name} — Inicio`} />
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50/80 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/40 dark:text-slate-100">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
                    style={{
                        backgroundImage: `radial-gradient(circle at 20% 20%, color-mix(in srgb, ${accent} 18%, transparent), transparent 45%),
                            radial-gradient(circle at 80% 10%, rgb(14 165 233 / 0.08), transparent 40%),
                            radial-gradient(circle at 50% 100%, color-mix(in srgb, ${accent} 15%, transparent), transparent 50%)`,
                    }}
                />
                <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 lg:px-10 lg:py-14">
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span
                                className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg"
                                style={{ backgroundColor: accent, boxShadow: `0 10px 15px -3px ${accent}40` }}
                            >
                                <Building2 className="h-6 w-6" aria-hidden />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                                    Panel corporativo
                                </p>
                                <p className="text-lg font-bold tracking-tight">{name}</p>
                                {brandingTagline ? (
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{brandingTagline}</p>
                                ) : null}
                            </div>
                        </div>
                        <nav className="flex flex-wrap items-center gap-2">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
                                    style={{ backgroundColor: accent }}
                                >
                                    <LayoutDashboard className="h-4 w-4" />
                                    Ir al panel
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-emerald-700"
                                    >
                                        <LogIn className="h-4 w-4" />
                                        Inmopro
                                    </Link>
                                    <Link
                                        href={crmLogin()}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#0c3d4d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a3342]"
                                    >
                                        <Users className="h-4 w-4" />
                                        CRM vendedores
                                    </Link>
                                </>
                            )}
                        </nav>
                    </header>

                    <main className="mt-16 flex flex-1 flex-col justify-center lg:mt-0">
                        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
                            <div className="space-y-8">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-4 py-1.5 text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Dos accesos independientes
                                </div>
                                <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem]">
                                    Gestión integral de{' '}
                                    <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400">
                                        proyectos y lotes
                                    </span>
                                </h1>
                                <p className="max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                                    El equipo interno entra por Inmopro. Los vendedores entran al CRM con usuario y PIN.
                                </p>
                                {!auth.user && (
                                    <div className="flex flex-wrap gap-3">
                                        <Link
                                            href={login()}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
                                            style={{ backgroundColor: accent, boxShadow: `0 10px 15px -3px ${accent}4d` }}
                                        >
                                            <LogIn className="h-4 w-4" />
                                            Acceder a Inmopro
                                        </Link>
                                        <Link
                                            href={crmLogin()}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-[#0c3d4d] shadow-sm transition hover:border-[#1aa8b5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                        >
                                            <Users className="h-4 w-4" />
                                            Acceder al CRM
                                        </Link>
                                    </div>
                                )}
                                <p className="max-w-md text-sm text-slate-500 dark:text-slate-500">
                                    Inmopro usa correo y contraseña. El CRM de vendedores usa usuario y PIN de Cazador.
                                </p>
                            </div>

                            <div className="relative">
                                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-sky-500/10 blur-2xl dark:from-emerald-500/5 dark:to-sky-500/5" />
                                <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/60 dark:shadow-none">
                                    <ul className="space-y-5">
                                        {[
                                            { t: 'Inmopro', d: 'Panel de backoffice interno. Correo y contraseña.' },
                                            { t: 'CRM vendedores', d: 'Cartera y seguimientos. Usuario y PIN de Cazador.' },
                                            { t: 'Apps móviles', d: 'Cazador y Datero vía API dedicada.' },
                                        ].map((item) => (
                                            <li
                                                key={item.t}
                                                className="flex gap-4 border-b border-slate-100 pb-5 last:border-0 last:pb-0 dark:border-slate-800"
                                            >
                                                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                    <Building2 className="h-4 w-4" />
                                                </span>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-slate-100">{item.t}</p>
                                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.d}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </main>

                    <footer className="mt-16 border-t border-slate-200/80 pt-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
                        © {new Date().getFullYear()} {name}. Todos los derechos reservados.
                    </footer>
                </div>
            </div>
        </>
    );
}
