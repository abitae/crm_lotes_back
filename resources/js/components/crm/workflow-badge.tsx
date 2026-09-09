import { Badge } from '@/components/ui/badge';
import { humanizeStatus } from '@/lib/crm-format';

const VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PENDIENTE: 'secondary',
    APROBADA: 'default',
    RECHAZADA: 'destructive',
    EXPIRADA: 'outline',
    pendiente: 'secondary',
    realizado: 'default',
    cancelado: 'destructive',
    draft: 'secondary',
    queued: 'secondary',
    sending: 'outline',
    sent: 'default',
    failed: 'destructive',
    completed: 'default',
};

export function WorkflowBadge({ status }: { status: string }) {
    return <Badge variant={VARIANTS[status] ?? 'secondary'}>{humanizeStatus(status)}</Badge>;
}
