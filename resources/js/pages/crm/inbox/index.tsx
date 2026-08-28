import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Bot, MessageSquare, Send, User } from 'lucide-react';
import type { FormEvent} from 'react';
import { useEffect } from 'react';
import Pagination, { type PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CrmLayout from '@/layouts/crm/crm-layout';
import type { BreadcrumbItem } from '@/types';

type ContactIdentity = {
    id: number;
    profile_name: string | null;
    phone: string | null;
    channel: string;
};

type ClientSummary = {
    id: number;
    name: string;
    phone: string;
    status: { id: number; name: string; color: string | null } | null;
    tags: { id: number; name: string; color: string | null }[];
};

type ConversationRow = {
    id: number;
    channel: string;
    status: string;
    bot_enabled: boolean;
    has_client_conflict: boolean;
    last_message_at: string | null;
    contact_identity: ContactIdentity;
    client: ClientSummary | null;
};

type MessageRow = {
    id: number;
    direction: string;
    body: string | null;
    content_type: string;
    created_at: string;
};

type Props = {
    conversations: { data: ConversationRow[]; links: PaginationLink[] };
    selectedConversation: ConversationRow | null;
    messages: MessageRow[];
    filters: { channel?: string; q?: string; conversation?: number | null };
    meta: { whatsapp: boolean; messenger: boolean; instagram: boolean };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inbox', href: '/crm/inbox' }];

const channelLabel: Record<string, string> = {
    whatsapp: 'WhatsApp',
    messenger: 'Messenger',
    instagram: 'Instagram',
};

export default function CrmInboxIndex({ conversations, selectedConversation, messages, filters, meta }: Props) {
    const form = useForm({ body: '' });

    useEffect(() => {
        const interval = setInterval(() => {
            if (selectedConversation) {
                router.reload({ only: ['messages', 'selectedConversation', 'conversations'] });
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [selectedConversation?.id]);

    const openConversation = (id: number) => {
        router.get('/crm/inbox', { ...filters, conversation: id }, { preserveState: true, replace: true });
    };

    const submitMessage = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedConversation) return;

        form.post(`/crm/inbox/conversations/${selectedConversation.id}/messages`, {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <CrmLayout breadcrumbs={breadcrumbs}>
            <Head title="Inbox" />

            <div className="grid gap-4 p-6 lg:grid-cols-[320px_1fr]">
                <Card className="h-[calc(100vh-8rem)] overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MessageSquare className="h-4 w-4" />
                            Conversaciones
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {meta.whatsapp && <Badge variant="outline">WhatsApp</Badge>}
                            {meta.messenger && <Badge variant="outline">Messenger</Badge>}
                            {meta.instagram && <Badge variant="outline">Instagram</Badge>}
                        </div>
                        <Input
                            placeholder="Buscar..."
                            defaultValue={filters.q}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    router.get('/crm/inbox', { ...filters, q: e.currentTarget.value });
                                }
                            }}
                            className="mt-2"
                        />
                    </CardHeader>
                    <CardContent className="space-y-2 overflow-y-auto p-3 pt-0">
                        {conversations.data.map((conversation) => (
                            <button
                                key={conversation.id}
                                type="button"
                                onClick={() => openConversation(conversation.id)}
                                className={`w-full rounded-lg border p-3 text-left transition hover:bg-muted/50 ${
                                    selectedConversation?.id === conversation.id ? 'border-primary bg-muted/40' : ''
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-medium">
                                        {conversation.client?.name ??
                                            conversation.contact_identity.profile_name ??
                                            conversation.contact_identity.phone ??
                                            'Contacto'}
                                    </span>
                                    <Badge variant="secondary">{channelLabel[conversation.channel] ?? conversation.channel}</Badge>
                                </div>
                                {conversation.has_client_conflict && (
                                    <p className="mt-1 text-xs text-destructive">Conflicto de lead con otro vendedor</p>
                                )}
                            </button>
                        ))}
                        <Pagination links={conversations.links} />
                    </CardContent>
                </Card>

                <Card className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden">
                    {selectedConversation ? (
                        <>
                            <CardHeader className="border-b pb-3">
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-base">
                                        {selectedConversation.client?.name ??
                                            selectedConversation.contact_identity.profile_name ??
                                            'Conversación'}
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                router.post(`/crm/inbox/conversations/${selectedConversation.id}/toggle-bot`)
                                            }
                                        >
                                            <Bot className="mr-1 h-4 w-4" />
                                            {selectedConversation.bot_enabled ? 'Bot ON' : 'Humano'}
                                        </Button>
                                        {selectedConversation.client && (
                                            <Button variant="secondary" size="sm" asChild>
                                                <Link href={`/crm/clients/${selectedConversation.client.id}`}>
                                                    <User className="mr-1 h-4 w-4" />
                                                    Lead
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {selectedConversation.client && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {selectedConversation.client.status && (
                                            <Badge style={{ backgroundColor: selectedConversation.client.status.color ?? undefined }}>
                                                {selectedConversation.client.status.name}
                                            </Badge>
                                        )}
                                        {selectedConversation.client.tags.map((tag) => (
                                            <Badge key={tag.id} variant="outline">
                                                {tag.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
                                <div className="flex-1 space-y-3 overflow-y-auto">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                                message.direction === 'outbound'
                                                    ? 'ml-auto bg-primary text-primary-foreground'
                                                    : 'bg-muted'
                                            }`}
                                        >
                                            {message.body ?? `[${message.content_type}]`}
                                            <p className="mt-1 text-[10px] opacity-70">{message.created_at}</p>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={submitMessage} className="flex gap-2 border-t pt-3">
                                    <Input
                                        value={form.data.body}
                                        onChange={(e) => form.setData('body', e.target.value)}
                                        placeholder="Escribe un mensaje..."
                                        disabled={form.processing}
                                    />
                                    <Button type="submit" disabled={form.processing || !form.data.body.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </CardContent>
                        </>
                    ) : (
                        <CardContent className="flex flex-1 items-center justify-center text-muted-foreground">
                            Selecciona una conversación
                        </CardContent>
                    )}
                </Card>
            </div>
        </CrmLayout>
    );
}
