<?php

namespace App\Automation;

use App\Models\Meta\MetaAutomationFlow;
use App\Models\Meta\MetaConversation;
use App\Models\Meta\MetaMessage;

class TriggerMatcher
{
    public function matchFlow(MetaConversation $conversation, MetaMessage $message): ?MetaAutomationFlow
    {
        $flows = MetaAutomationFlow::query()
            ->where('advisor_id', $conversation->advisor_id)
            ->where('is_active', true)
            ->where('is_published', true)
            ->orderBy('id')
            ->get();

        $body = mb_strtolower(trim((string) $message->body));

        foreach ($flows as $flow) {
            if (! $this->matchesChannel($flow, $conversation->channel)) {
                continue;
            }

            if ($flow->trigger_type === 'keyword') {
                $keywords = $flow->trigger_config['keywords'] ?? [];
                foreach ((array) $keywords as $keyword) {
                    if (is_string($keyword) && str_contains($body, mb_strtolower($keyword))) {
                        return $flow;
                    }
                }
            }

            if ($flow->trigger_type === 'welcome' && $this->isFirstInbound($conversation, $message)) {
                return $flow;
            }

            if ($flow->trigger_type === 'default') {
                return $flow;
            }
        }

        return null;
    }

    private function matchesChannel(MetaAutomationFlow $flow, string $channel): bool
    {
        $channels = $flow->channels ?? [];

        return $channels === [] || in_array($channel, $channels, true);
    }

    private function isFirstInbound(MetaConversation $conversation, MetaMessage $message): bool
    {
        return $conversation->messages()
            ->where('direction', MetaMessage::DIRECTION_INBOUND)
            ->where('id', '!=', $message->id)
            ->doesntExist();
    }
}
