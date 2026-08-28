<?php

namespace App\Http\Controllers\Crm;

use App\Automation\FlowGraphCompiler;
use App\Http\Controllers\Controller;
use App\Models\Inmopro\Advisor;
use App\Models\Meta\MetaAutomationFlow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AutomationFlowController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        if (! $advisor->metaConnection?->isActive()) {
            return redirect()->route('crm.profile.edit')
                ->withErrors(['meta' => 'Conecta Meta para gestionar automatizaciones.']);
        }

        $flows = MetaAutomationFlow::query()
            ->where('advisor_id', $advisor->id)
            ->where('is_corporate_template', false)
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'trigger_type', 'is_active', 'is_published', 'version', 'updated_at']);

        $templates = MetaAutomationFlow::query()
            ->where('is_corporate_template', true)
            ->where('is_published', true)
            ->orderBy('name')
            ->get(['id', 'name', 'trigger_type']);

        return Inertia::render('crm/automations/index', [
            'flows' => $flows,
            'templates' => $templates,
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('crm/automations/edit', [
            'flow' => null,
        ]);
    }

    public function store(Request $request, FlowGraphCompiler $compiler): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'trigger_type' => ['required', 'in:welcome,keyword,default,schedule'],
            'trigger_config' => ['nullable', 'array'],
            'channels' => ['nullable', 'array'],
            'graph_json' => ['nullable', 'array'],
        ]);

        $flow = MetaAutomationFlow::query()->create([
            ...$validated,
            'advisor_id' => $advisor->id,
            'is_published' => false,
            'is_active' => false,
        ]);

        return redirect()->route('crm.automations.edit', $flow);
    }

    public function edit(Request $request, MetaAutomationFlow $flow): Response
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        abort_unless((int) $flow->advisor_id === (int) $advisor->id, 403);

        return Inertia::render('crm/automations/edit', [
            'flow' => $flow,
        ]);
    }

    public function update(Request $request, MetaAutomationFlow $flow, FlowGraphCompiler $compiler): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        abort_unless((int) $flow->advisor_id === (int) $advisor->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'trigger_type' => ['required', 'in:welcome,keyword,default,schedule'],
            'trigger_config' => ['nullable', 'array'],
            'channels' => ['nullable', 'array'],
            'graph_json' => ['nullable', 'array'],
            'is_active' => ['boolean'],
        ]);

        $flow->update($validated);

        return back()->with('success', 'Flujo guardado.');
    }

    public function publish(Request $request, MetaAutomationFlow $flow, FlowGraphCompiler $compiler): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        abort_unless((int) $flow->advisor_id === (int) $advisor->id, 403);

        $compiler->compile($flow, $flow->graph_json);

        $flow->update([
            'is_published' => true,
            'is_active' => true,
            'version' => $flow->version + 1,
        ]);

        return back()->with('success', 'Flujo publicado.');
    }

    public function cloneTemplate(Request $request, MetaAutomationFlow $template): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');

        abort_unless($template->is_corporate_template, 404);

        $clone = MetaAutomationFlow::query()->create([
            'advisor_id' => $advisor->id,
            'cloned_from_flow_id' => $template->id,
            'name' => $template->name.' (copia)',
            'channels' => $template->channels,
            'trigger_type' => $template->trigger_type,
            'trigger_config' => $template->trigger_config,
            'graph_json' => $template->graph_json,
            'is_published' => false,
            'is_active' => false,
        ]);

        return redirect()->route('crm.automations.edit', $clone);
    }

    public function destroy(Request $request, MetaAutomationFlow $flow): RedirectResponse
    {
        /** @var Advisor $advisor */
        $advisor = $request->user('advisor');
        abort_unless((int) $flow->advisor_id === (int) $advisor->id, 403);

        $flow->delete();

        return redirect()->route('crm.automations.index')->with('success', 'Flujo eliminado.');
    }
}
