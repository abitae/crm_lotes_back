<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreLotRequest;
use App\Http\Requests\Inmopro\UpdateLotRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\Inmopro\Lot;
use App\Models\Inmopro\LotStatus;
use App\Models\Inmopro\Project;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\View;
use Inertia\Inertia;
use Inertia\Response;
use Mpdf\Mpdf;

class LotController extends Controller
{
    public function index(Request $request): Response
    {
        $projectId = $request->query('project_id');
        $project = $this->resolveActiveProject($projectId ? (int) $projectId : null);

        if (! $project) {
            return Inertia::render('inmopro/inventory', [
                'projects' => $this->activeProjects()->get(),
                'project' => null,
                'lots' => [],
                'lotStatuses' => LotStatus::orderBy('sort_order')->get(),
                'clients' => [],
                'advisors' => [],
            ]);
        }

        $lots = Lot::with(['status', 'client', 'advisor'])
            ->where('project_id', $project->id)
            ->orderBy('block')
            ->orderBy('number')
            ->get();

        $projects = $this->activeProjects()->get();
        $lotStatuses = LotStatus::orderBy('sort_order')->get();
        $clients = Client::orderBy('name')->get(['id', 'name', 'dni', 'phone', 'email']);
        $advisors = Advisor::with('level')->orderBy('name')->get();

        return Inertia::render('inmopro/inventory', [
            'projects' => $projects,
            'project' => $project,
            'lots' => $lots,
            'lotStatuses' => $lotStatuses,
            'clients' => $clients,
            'advisors' => $advisors,
        ]);
    }

    public function update(UpdateLotRequest $request, Lot $lot): RedirectResponse
    {
        $validated = $this->normalizeLotFields($request->validated());
        $this->guardManualTransferStatusChange($validated, $lot);
        $clientName = isset($validated['client_name']) ? trim((string) $validated['client_name']) : null;
        $clientDni = isset($validated['client_dni']) ? trim((string) $validated['client_dni']) : null;
        $clientPhone = isset($validated['client_phone']) ? trim((string) $validated['client_phone']) : null;

        if ($clientName === '' || $clientName === null) {
            $validated['client_id'] = null;
            $validated['client_name'] = null;
            $validated['client_dni'] = null;
            $validated['client_phone'] = null;
        } else {
            $clientId = isset($validated['client_id']) ? (int) $validated['client_id'] : null;
            $client = $clientId > 0 ? Client::find($clientId) : null;

            if ($client === null && $clientDni !== '' && $clientDni !== null) {
                $client = Client::where('dni', $clientDni)->first();
            }
            if ($client === null && $clientName !== '') {
                $client = Client::where('name', $clientName)->first();
            }

            if ($client) {
                $client->update([
                    'name' => $clientName,
                    'dni' => $clientDni ?? $client->dni,
                    'phone' => $clientPhone ?? $client->phone,
                    'advisor_id' => $validated['advisor_id'] ?? $lot->advisor_id ?? $client->advisor_id ?? Advisor::query()->value('id'),
                ]);
                $validated['client_id'] = $client->id;
            } else {
                $defaultClientTypeId = ClientType::query()->where('code', 'PROSPECTO')->value('id')
                    ?? ClientType::query()->orderBy('sort_order')->value('id');
                $client = Client::create([
                    'name' => $clientName,
                    'dni' => $clientDni ?: null,
                    'phone' => $clientPhone ?: null,
                    'client_type_id' => $defaultClientTypeId,
                    'advisor_id' => $validated['advisor_id'] ?? $lot->advisor_id ?? Advisor::query()->value('id'),
                ]);
                $validated['client_id'] = $client->id;
            }
            $validated['client_name'] = $clientName;
            $validated['client_dni'] = $clientDni;
            $validated['client_phone'] = $clientPhone;
        }

        $lot->fill($validated);
        $lot->save();

        return back();
    }

    public function create(Request $request): Response
    {
        $projectId = $request->query('project_id');
        $project = $projectId ? $this->resolveActiveProject((int) $projectId) : null;
        $lotStatuses = LotStatus::orderBy('sort_order')->get();
        $clients = Client::orderBy('name')->get(['id', 'name', 'dni', 'phone', 'email']);
        $advisors = Advisor::with('level')->orderBy('name')->get();
        $projects = $this->activeProjects()->get();

        return Inertia::render('inmopro/lots/create', [
            'projects' => $projects,
            'project' => $project,
            'lotStatuses' => $lotStatuses,
            'clients' => $clients,
            'advisors' => $advisors,
        ]);
    }

    public function store(StoreLotRequest $request): RedirectResponse
    {
        $validated = $this->normalizeLotFields($request->validated());
        $this->guardManualTransferStatusChange($validated);
        $lot = Lot::create($validated);

        return redirect()->route('inmopro.lots.index', ['project_id' => $lot->project_id]);
    }

    public function exportPdf(Request $request): HttpResponse
    {
        $projectId = $request->query('project_id');
        $project = $this->resolveActiveProject($projectId ? (int) $projectId : null);
        if (! $project) {
            abort(404, 'Proyecto no encontrado');
        }

        $lots = Lot::with('status')
            ->where('project_id', $project->id)
            ->orderBy('block')
            ->orderBy('number')
            ->get();

        $blockGroups = $lots->groupBy('block');

        $html = View::make('inmopro.lots-export-pdf', [
            'project' => $project,
            'blockGroups' => $blockGroups,
        ])->render();

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_left' => 12,
            'margin_right' => 12,
            'margin_top' => 16,
            'margin_bottom' => 16,
        ]);
        $mpdf->WriteHTML($html);
        $pdf = $mpdf->Output('', 'S');

        $filename = 'inventario-lotes-'.str($project->name)->slug().'-'.now()->format('Y-m-d').'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function show(Lot $lot): Response
    {
        $lot->load([
            'project',
            'status',
            'client',
            'advisor',
            'commissions',
            'latestTransferConfirmation.requester',
            'latestTransferConfirmation.reviewer',
        ]);

        return Inertia::render('inmopro/lots/show', [
            'lot' => $lot,
            'canConfirmTransfer' => request()->user()?->can('inmopro.lots.transfer-confirmation') ?? false,
        ]);
    }

    public function edit(Lot $lot): Response
    {
        $lot->load(['project', 'status', 'client', 'advisor']);
        $lotStatuses = LotStatus::orderBy('sort_order')->get();
        $clients = Client::orderBy('name')->get(['id', 'name', 'dni', 'phone', 'email']);
        $advisors = Advisor::with('level')->orderBy('name')->get();
        $projects = $this->activeProjects()->get();

        return Inertia::render('inmopro/lots/edit', [
            'lot' => $lot,
            'lotStatuses' => $lotStatuses,
            'clients' => $clients,
            'advisors' => $advisors,
            'projects' => $projects,
        ]);
    }

    public function destroy(Lot $lot): RedirectResponse
    {
        $projectId = $lot->project_id;
        $lot->delete();

        return redirect()->route('inmopro.lots.index', ['project_id' => $projectId]);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder<Project>
     */
    private function activeProjects()
    {
        return Project::query()->active()->orderBy('name');
    }

    private function resolveActiveProject(?int $projectId): ?Project
    {
        if ($projectId) {
            $project = $this->activeProjects()->whereKey($projectId)->first();
            if ($project) {
                return $project;
            }
        }

        return $this->activeProjects()->first();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function normalizeLotFields(array $validated): array
    {
        $validated = $this->normalizeLotDateFields($validated);

        $price = array_key_exists('price', $validated) && $validated['price'] !== null
            ? (float) $validated['price']
            : null;
        $advance = array_key_exists('advance', $validated) && $validated['advance'] !== null
            ? (float) $validated['advance']
            : null;

        if ($price === null) {
            $validated['remaining_balance'] = null;

            return $validated;
        }

        $remainingBalance = round($price - ($advance ?? 0), 2);

        if ($remainingBalance < 0) {
            throw new HttpResponseException(
                back()->withErrors(['advance' => 'El adelanto no puede ser mayor al precio del lote.'])
            );
        }

        $validated['remaining_balance'] = $remainingBalance;

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function normalizeLotDateFields(array $validated): array
    {
        foreach (['payment_limit_date', 'contract_date', 'notarial_transfer_date'] as $field) {
            if (! array_key_exists($field, $validated) || empty($validated[$field])) {
                $validated[$field] = null;

                continue;
            }

            $validated[$field] = Carbon::parse((string) $validated[$field])->toDateString();
        }

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function guardManualTransferStatusChange(array $validated, ?Lot $lot = null): void
    {
        if (! array_key_exists('lot_status_id', $validated)) {
            return;
        }

        $transferredStatusId = LotStatus::query()->where('code', LotStatus::CODE_TRANSFERIDO)->value('id');

        if (! $transferredStatusId) {
            return;
        }

        $requestedStatusId = (int) $validated['lot_status_id'];

        if ($lot === null && $requestedStatusId === (int) $transferredStatusId) {
            throw new HttpResponseException(
                back()->withErrors(['lot_status_id' => 'Use la confirmacion de transferencia para registrar lotes transferidos.'])
            );
        }

        if ($lot !== null && $requestedStatusId !== (int) $lot->lot_status_id
            && ($requestedStatusId === (int) $transferredStatusId || (int) $lot->lot_status_id === (int) $transferredStatusId)) {
            throw new HttpResponseException(
                back()->withErrors(['lot_status_id' => 'El estado TRANSFERIDO solo puede cambiarse desde el flujo de confirmacion de transferencia.'])
            );
        }
    }
}
