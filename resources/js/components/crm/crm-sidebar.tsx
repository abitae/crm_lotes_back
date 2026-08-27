import { Link } from '@inertiajs/react';
import {
    Calendar,
    FileCheck,
    LayoutGrid,
    LifeBuoy,
    MapPin,
    Percent,
    Users,
} from 'lucide-react';
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
import clients from '@/routes/crm/clients';
import preReservations from '@/routes/crm/pre-reservations';
import projects from '@/routes/crm/projects';
import type { NavItem } from '@/types';
import AppLogo from '@/components/app-logo';

const navItems: NavItem[] = [
    { title: 'Dashboard', href: crm.dashboard(), icon: LayoutGrid },
    { title: 'Clientes', href: clients.index(), icon: Users },
    { title: 'Proyectos', href: projects.index(), icon: MapPin },
    { title: 'Pre-reservas', href: preReservations.index(), icon: FileCheck },
    { title: 'Tickets', href: '/crm/attention-tickets', icon: LifeBuoy },
    { title: 'Recordatorios', href: '/crm/reminders', icon: Calendar },
    { title: 'Comisiones', href: '/crm/commissions', icon: Percent },
];

export function CrmSidebar() {
    const { isCurrentUrl } = useCurrentUrl();

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
