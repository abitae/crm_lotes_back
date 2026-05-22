import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    ChevronRight,
    ContactRound,
    DollarSign,
    FileCheck,
    GitBranch,
    KeyRound,
    Landmark,
    Layers,
    LayoutGrid,
    MapPin,
    Palette,
    Percent,
    Receipt,
    Scale,
    Shield,
    ShieldCheck,
    Tag,
    Target,
    UserCheck,
    Users,
    WalletCards,
} from 'lucide-react';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl, type IsCurrentUrlFn } from '@/hooks/use-current-url';
import { dashboard } from '@/routes';
import legal from '@/routes/legal';
import type { NavItem } from '@/types';
import AppLogo from './app-logo';

type NavSection = {
    label: string;
    icon: NonNullable<NavItem['icon']>;
    items: NavItem[];
};

const principalNavItems: NavItem[] = [{ title: 'Dashboard', href: dashboard(), icon: LayoutGrid }];

const managementSections: NavSection[] = [
    {
        label: 'Inventario',
        icon: MapPin,
        items: [
            { title: 'Inventario de lotes', href: '/inmopro/lots', icon: MapPin },
            { title: 'Proyectos', href: '/inmopro/projects', icon: Building2 },
            { title: 'Tipos de proyecto', href: '/inmopro/project-types', icon: Layers },
        ],
    },
    {
        label: 'Ventas',
        icon: DollarSign,
        items: [
            { title: 'Control financiero', href: '/inmopro/financial', icon: DollarSign },
            { title: 'Cuentas por cobrar', href: '/inmopro/accounts-receivable', icon: WalletCards },
            { title: 'Comisiones', href: '/inmopro/commissions', icon: Percent },
            { title: 'Reportes', href: '/inmopro/reports', icon: LayoutGrid },
            { title: 'Meta general reportes', href: '/inmopro/report-settings', icon: Target },
        ],
    },
    {
        label: 'Comercial',
        icon: Users,
        items: [
            { title: 'Agenda', href: '/inmopro/agenda', icon: Calendar },
            { title: 'Clientes', href: '/inmopro/clients', icon: Users },
            { title: 'Tipos de cliente', href: '/inmopro/client-types', icon: Users },
            { title: 'Ciudades', href: '/inmopro/cities', icon: MapPin },
            { title: 'Vendedores', href: '/inmopro/advisors', icon: UserCheck },
            { title: 'Dateros', href: '/inmopro/dateros', icon: ContactRound },
            { title: 'Tipos de membresía', href: '/inmopro/membership-types', icon: Receipt },
            { title: 'Teams comerciales', href: '/inmopro/teams', icon: ShieldCheck },
            { title: 'Niveles de asesor', href: '/inmopro/advisor-levels', icon: Layers },
        ],
    },
    {
        label: 'Operación',
        icon: FileCheck,
        items: [
            { title: 'Tickets de atención', href: '/inmopro/attention-tickets', icon: FileCheck },
            { title: 'Pre-reservas', href: '/inmopro/lot-pre-reservations', icon: FileCheck },
            { title: 'Transferencias', href: '/inmopro/lot-transfer-confirmations', icon: FileCheck },
            { title: 'Caja y bancos', href: '/inmopro/cash-accounts', icon: Landmark },
            { title: 'Estados de lote', href: '/inmopro/lot-statuses', icon: Tag },
            { title: 'Estados de comisión', href: '/inmopro/commission-statuses', icon: Receipt },
        ],
    },
    {
        label: 'Documentación',
        icon: GitBranch,
        items: [
            { title: 'Procesos del sistema', href: '/inmopro/process-diagrams', icon: GitBranch },
        ],
    },
    {
        label: 'Sistema',
        icon: Palette,
        items: [{ title: 'Personalización', href: '/inmopro/branding', icon: Palette }],
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Términos y condiciones',
        href: legal.terms(),
        icon: Scale,
    },
    {
        title: 'Política de privacidad',
        href: legal.privacy(),
        icon: Shield,
    },
];

function NavSectionGroup({
    section,
    isCurrentUrl,
}: {
    section: NavSection;
    isCurrentUrl: IsCurrentUrlFn;
}) {
    const isOpen = section.items.some((item) => isCurrentUrl(item.href));

    return (
        <SidebarGroup className="px-2 py-0">
            <Collapsible defaultOpen={isOpen} className="group/collapsible">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={{ children: section.label }} className="font-semibold text-sidebar-foreground">
                                <section.icon />
                                <span>{section.label}</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {section.items.map((item) => (
                                    <SidebarMenuSubItem key={item.title}>
                                        <SidebarMenuSubButton asChild isActive={isCurrentUrl(item.href)}>
                                            <Link href={item.href} prefetch>
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </SidebarMenu>
            </Collapsible>
        </SidebarGroup>
    );
}

export function AppSidebar() {
    const { isCurrentUrl } = useCurrentUrl();
    const auth = usePage<{ auth: { user?: { roles?: string[] } | null } }>().props.auth;
    const isSuperAdmin = auth.user?.roles?.includes('super-admin') ?? false;

    const accessControlSection: NavSection = {
        label: 'Control de acceso',
        icon: ShieldCheck,
        items: [
            { title: 'Roles', href: '/inmopro/access-control/roles', icon: ShieldCheck },
            { title: 'Permisos', href: '/inmopro/access-control/permissions', icon: KeyRound },
            { title: 'Usuarios', href: '/inmopro/access-control/users', icon: Users },
        ],
    };

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>Principal</SidebarGroupLabel>
                    <SidebarMenu>
                        {principalNavItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild isActive={isCurrentUrl(item.href)} tooltip={{ children: item.title }}>
                                    <Link href={item.href} prefetch>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>Módulos</SidebarGroupLabel>
                </SidebarGroup>

                {managementSections.map((section) => (
                    <NavSectionGroup key={section.label} section={section} isCurrentUrl={isCurrentUrl} />
                ))}

                {isSuperAdmin ? (
                    <NavSectionGroup key={accessControlSection.label} section={accessControlSection} isCurrentUrl={isCurrentUrl} />
                ) : null}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
