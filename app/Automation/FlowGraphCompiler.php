<?php

namespace App\Automation;

use App\Models\Meta\MetaAutomationFlow;
use App\Models\Meta\MetaAutomationStep;

class FlowGraphCompiler
{
    /**
     * @param  array<string, mixed>|null  $graph
     */
    public function compile(MetaAutomationFlow $flow, ?array $graph): void
    {
        $flow->steps()->delete();

        if (! is_array($graph)) {
            return;
        }

        $nodes = $graph['nodes'] ?? [];
        $edges = $graph['edges'] ?? [];

        if (! is_array($nodes)) {
            return;
        }

        $nextMap = [];
        foreach ((array) $edges as $edge) {
            if (! is_array($edge)) {
                continue;
            }

            $source = $edge['source'] ?? null;
            $target = $edge['target'] ?? null;

            if (is_string($source) && is_string($target)) {
                $nextMap[$source] = $target;
            }
        }

        $order = 0;
        foreach ($nodes as $node) {
            if (! is_array($node)) {
                continue;
            }

            $nodeId = (string) ($node['id'] ?? '');
            $data = is_array($node['data'] ?? null) ? $node['data'] : [];

            MetaAutomationStep::query()->create([
                'flow_id' => $flow->id,
                'node_id' => $nodeId,
                'type' => (string) ($data['type'] ?? 'message'),
                'config' => $data['config'] ?? $data,
                'next_node_id' => $nextMap[$nodeId] ?? null,
                'sort_order' => $order++,
            ]);
        }
    }
}
