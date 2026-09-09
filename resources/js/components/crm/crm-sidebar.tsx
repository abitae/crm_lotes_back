import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    Calendar,
    FileCheck,
    LandPlot,
    LayoutGrid,
    LifeBuoy,
    MapPin,
    Megaphone,
    MessageSquare,
    Percent,
    Tags,
    Users,
    Workflow,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { CrmNavUser } from '@/components/crm/crm-nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import crm from '@/routes/crm';
import agenda from '@/routes/crm/agenda';
import attentionTickets from '@/routes/crm/attention-tickets';
import clients from '@/routes/crm/clients';
import commissions from '@/routes/crm/commissions';
import { mine as myLots } from '@/routes/crm/lots';
import pipeline from '@/routes/crm/pipeline';
import preReservations from '@/routes/crm/pre-reservations';
import projects from '@/routes/crm/projects';
import reminders from '@/routes/crm/reminders';
import type { NavItem } from '@/types';

const principalItems: NavItem[] = [
    { title: 'Dashboard', href: crm.dashboard(), icon: LayoutGrid },
    { title: 'Clientes', href: clients.index(), icon: Users },
];

const inventoryItems: NavItem[] = [
    { title: 'Proyectos', href: projects.index(), icon: MapPin },
    { title: 'Mis lotes', href: myLots(), icon: LandPlot },
];

const followUpItems: NavItem[] = [
    { title: 'Pre-reservas', href: preReservations.index(), icon: FileCheck },
    { title: 'Tickets', href: attentionTickets.index(), icon: LifeBuoy },
    { title: 'Recordatorios', href: reminders.index(), icon: Bell },
    { title: 'Agenda', href: agenda.index(), icon: Calendar },
];

const moreItems: NavItem[] = [
    { title: 'Estados y etiquetas', href: pipeline.index(), icon: Tags },
    { title: 'Comisiones', href: commissions.index(), icon: Percent },
];

const metaItems: NavItem[] = [
    { title: 'Inbox', href: '/crm/inbox', icon: MessageSquare },
    { title: 'Automatizaciones', href: '/crm/automations', icon: Workflow },
    { title: 'Broadcasts', href: '/crm/broadcasts', icon: Megaphone },
];

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    if (items.length === 0) {
        return null;
    }

    return (
        <SidebarGroup className="px-2 py-1">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(item.href)}
                                tooltip={{ children: item.title }}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon ? <item.icon /> : null}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export function CrmSidebar() {
    const { meta } = usePage<{ meta?: { connected?: boolean } }>().props;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={crm.dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavGroup label="Principal" items={principalItems} />
                {meta?.connected ? <NavGroup label="Comunicación" items={metaItems} /> : null}
                <NavGroup label="Inventario" items={inventoryItems} />
                <NavGroup label="Seguimiento" items={followUpItems} />
                <NavGroup label="Más" items={moreItems} />
            </SidebarContent>

            <SidebarFooter>
                <CrmNavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
