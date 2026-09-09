<?php

namespace App\Automation;

use App\Models\Inmopro\ClientStatus;
use App\Models\Meta\MetaAutomationFlow;
use App\Models\Meta\MetaAutomationSession;
use App\Models\Meta\MetaAutomationStep;
use App\Models\Meta\MetaConversation;
use App\Models\Meta\MetaMessage;
use App\Services\Meta\MetaSendService;
use Illuminate\Support\Facades\Log;

class AutomationEngine
{
    public function __construct(
        private TriggerMatcher $triggerMatcher,
        private MetaSendService $sendService,
    ) {}

    public function handleInbound(MetaConversation $conversation, MetaMessage $message): void
    {
        if ($message->direction !== MetaMessage::DIRECTION_INBOUND || ! $conversation->bot_enabled) {
            return;
        }

        $session = $conversation->automationSession;

        if ($session && $session->status === MetaAutomationSession::STATUS_WAITING) {
            $this->continueSession($conversation, $session, $message);

            return;
        }

        $flow = $this->triggerMatcher->matchFlow($conversation, $message);

        if (! $flow) {
            return;
        }

        $this->startFlow($conversation, $flow);
    }

    public function startFlow(MetaConversation $conversation, MetaAutomationFlow $flow): void
    {
        $startStep = $flow->steps()->orderBy('sort_order')->first();

        if (! $startStep) {
            return;
        }

        MetaAutomationSession::query()->updateOrCreate(
            ['conversation_id' => $conversation->id],
            [
                'flow_id' => $flow->id,
                'current_node_id' => $startStep->node_id,
                'status' => MetaAutomationSession::STATUS_RUNNING,
                'context' => [],
            ],
        );

        $this->executeStep($conversation, $startStep);
    }

    private function continueSession(
        MetaConversation $conversation,
        MetaAutomationSession $session,
        MetaMessage $message,
    ): void {
        $context = $session->context ?? [];
        $context['last_reply'] = $message->body;
        $session->update(['context' => $context, 'status' => MetaAutomationSession::STATUS_RUNNING]);

        $currentStep = MetaAutomationStep::query()
            ->where('flow_id', $session->flow_id)
            ->where('node_id', $session->current_node_id)
            ->first();

        $nextNodeId = $currentStep?->next_node_id;

        if (! $nextNodeId) {
            $session->update(['status' => MetaAutomationSession::STATUS_COMPLETED]);

            return;
        }

        $nextStep = MetaAutomationStep::query()
            ->where('flow_id', $session->flow_id)
            ->where('node_id', $nextNodeId)
            ->first();

        if ($nextStep) {
            $session->update(['current_node_id' => $nextNodeId]);
            $this->executeStep($conversation, $nextStep);
        }
    }

    private function executeStep(MetaConversation $conversation, MetaAutomationStep $step): void
    {
        $session = $conversation->automationSession;
        $advisor = $conversation->advisor;

        match ($step->type) {
            'message' => $this->executeMessageStep($conversation, $advisor, $step),
            'wait_reply' => $session?->update(['status' => MetaAutomationSession::STATUS_WAITING]),
            'handoff' => $this->executeHandoff($conversation, $session),
            'set_status' => $this->executeSetStatus($conversation, $step),
            'end' => $session?->update(['status' => MetaAutomationSession::STATUS_COMPLETED]),
            default => Log::info('Unhandled automation step', ['type' => $step->type]),
        };

        if ($step->type !== 'wait_reply' && $step->next_node_id && $session) {
            $nextStep = MetaAutomationStep::query()
                ->where('flow_id', $step->flow_id)
                ->where('node_id', $step->next_node_id)
                ->first();

            if ($nextStep) {
                $session->update(['current_node_id' => $nextStep->node_id]);
                $this->executeStep($conversation, $nextStep);
            }
        }
    }

    private function executeMessageStep(
        MetaConversation $conversation,
        $advisor,
        MetaAutomationStep $step,
    ): void {
        $text = (string) ($step->config['text'] ?? '');

        if ($text !== '' && $advisor) {
            $this->sendService->sendText($conversation, $advisor, $text);
        }
    }

    private function executeHandoff(MetaConversation $conversation, ?MetaAutomationSession $session): void
    {
        $conversation->update([
            'bot_enabled' => false,
            'status' => MetaConversation::STATUS_HUMAN,
        ]);

        $session?->update(['status' => MetaAutomationSession::STATUS_HANDOFF]);
    }

    private function executeSetStatus(MetaConversation $conversation, MetaAutomationStep $step): void
    {
        $client = $conversation->client;

        if (! $client) {
            return;
        }

        $statusId = $step->config['client_status_id'] ?? null;
        $statusCode = $step->config['client_status_code'] ?? null;

        if ($statusId) {
            $ownedId = ClientStatus::query()
                ->forAdvisor((int) $client->advisor_id)
                ->whereKey($statusId)
                ->where('is_active', true)
                ->value('id');

            if ($ownedId) {
                $client->update(['client_status_id' => $ownedId]);
            }

            return;
        }

        if (is_string($statusCode) && $statusCode !== '') {
            $ownedId = ClientStatus::query()
                ->forAdvisor((int) $client->advisor_id)
                ->where('code', $statusCode)
                ->where('is_active', true)
                ->value('id');

            if ($ownedId) {
                $client->update(['client_status_id' => $ownedId]);
            }
        }
    }
}
