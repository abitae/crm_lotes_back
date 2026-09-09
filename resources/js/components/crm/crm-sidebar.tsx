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

const baseNavItems: NavItem[] = [
    { title: 'Dashboard', href: crm.dashboard(), icon: LayoutGrid },
    { title: 'Clientes', href: clients.index(), icon: Users },
    { title: 'Estados y etiquetas', href: pipeline.index(), icon: Tags },
    { title: 'Proyectos', href: projects.index(), icon: MapPin },
    { title: 'Mis lotes', href: myLots(), icon: LandPlot },
    { title: 'Pre-reservas', href: preReservations.index(), icon: FileCheck },
    { title: 'Tickets', href: attentionTickets.index(), icon: LifeBuoy },
    { title: 'Recordatorios', href: reminders.index(), icon: Bell },
    { title: 'Agenda', href: agenda.index(), icon: Calendar },
    { title: 'Comisiones', href: commissions.index(), icon: Percent },
];

const metaNavItems: NavItem[] = [
    { title: 'Inbox', href: '/crm/inbox', icon: MessageSquare },
    { title: 'Automatizaciones', href: '/crm/automations', icon: Workflow },
    { title: 'Broadcasts', href: '/crm/broadcasts', icon: Megaphone },
];

export function CrmSidebar() {
    const { isCurrentUrl } = useCurrentUrl();
    const { meta } = usePage<{ meta?: { connected?: boolean } }>().props;
    const navItems = meta?.connected ? [...baseNavItems.slice(0, 2), ...metaNavItems, ...baseNavItems.slice(2)] : baseNavItems;

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
                <SidebarMenu>
                    {navItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(item.href)}
                                tooltip={{ children: item.title }}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <CrmNavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
