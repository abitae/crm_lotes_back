<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreAdvisorMembershipInstallmentRequest;
use App\Http\Requests\Inmopro\StoreAdvisorMembershipPaymentRequest;
use App\Http\Requests\Inmopro\StoreAdvisorMembershipRequest;
use App\Http\Requests\Inmopro\UpdateAdvisorMembershipRequest;
use App\Models\Inmopro\AdvisorMembership;
use App\Models\Inmopro\MembershipType;
use App\Services\Inmopro\MembershipReceivableService;
use App\Support\InertiaListingRedirect;
use App\Support\InstallmentStatus;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AdvisorMembershipController extends Controller
{
    public function index(Request $request): RedirectResponse
    {
        return redirect()->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQuery($request));
    }

    public function create(Request $request): RedirectResponse
    {
        return redirect()->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQueryMerged($request, [
            'modal' => 'create_membership',
        ]));
    }

    public function store(StoreAdvisorMembershipRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $type = MembershipType::findOrFail($validated['membership_type_id']);
        $amount = isset($validated['amount']) && $validated['amount'] !== '' && $validated['amount'] !== null
            ? (float) $validated['amount']
            : (float) $type->amount;
        $startDate = Carbon::parse($validated['start_date']);
        $year = (int) $startDate->format('Y');

        AdvisorMembership::create([
            'advisor_id' => $validated['advisor_id'],
            'membership_type_id' => $validated['membership_type_id'],
            'year' => $year,
            'amount' => $amount,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
        ]);

        return redirect()
            ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQuery($request))
            ->with('success', 'Membresía registrada. Cree las cuotas manualmente y registre abonos asignados a cada cuota.');
    }

    public function show(Request $request, AdvisorMembership $advisor_membership): RedirectResponse
    {
        return redirect()->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQueryMerged($request, [
            'membership_id' => $advisor_membership->id,
        ]));
    }

    public function edit(Request $request, AdvisorMembership $advisor_membership): RedirectResponse
    {
        return redirect()->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQueryMerged($request, [
            'membership_id' => $advisor_membership->id,
        ]));
    }

    public function update(UpdateAdvisorMembershipRequest $request, AdvisorMembership $advisor_membership): RedirectResponse
    {
        $validated = $request->validated();
        $startDate = Carbon::parse($validated['start_date']);
        $data = [
            'amount' => $validated['amount'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'year' => (int) $startDate->format('Y'),
        ];
        if (array_key_exists('membership_type_id', $validated) && $validated['membership_type_id'] !== null) {
            $data['membership_type_id'] = $validated['membership_type_id'];
        }
        $advisor_membership->update($data);

        return redirect()
            ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQueryMerged($request, [
                'membership_id' => $advisor_membership->id,
            ]))
            ->with('success', 'Membresía actualizada.');
    }

    public function destroy(Request $request, AdvisorMembership $advisor_membership): RedirectResponse
    {
        $advisor_membership->delete();

        return redirect()
            ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQuery($request))
            ->with('success', 'Membresía eliminada.');
    }

    public function storeInstallment(StoreAdvisorMembershipInstallmentRequest $request, AdvisorMembership $advisor_membership): RedirectResponse
    {
        $validated = $request->validated();
        $maxSeq = (int) $advisor_membership->installments()->max('sequence');
        $sequence = isset($validated['sequence']) && $validated['sequence'] !== null
            ? (int) $validated['sequence']
            : $maxSeq + 1;

        if ($advisor_membership->installments()->where('sequence', $sequence)->exists()) {
            return redirect()
                ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQueryMerged($request, [
                    'membership_id' => $advisor_membership->id,
                ]))
                ->withErrors(['sequence' => 'Ya existe una cuota con ese número.']);
        }

        $due = Carbon::parse($validated['due_date'])->startOfDay();
        $status = InstallmentStatus::resolve((float) $validated['amount'], 0, $due);

        $advisor_membership->installments()->create([
            'sequence' => $sequence,
            'due_date' => $due,
            'amount' => $validated['amount'],
            'paid_amount' => 0,
            'status' => $status,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()
            ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQueryMerged($request, [
                'membership_id' => $advisor_membership->id,
            ]))
            ->with('success', 'Cuota registrada. Puede registrar abonos contra cuotas con saldo pendiente.');
    }

    public function storePayment(StoreAdvisorMembershipPaymentRequest $request, AdvisorMembership $advisor_membership, MembershipReceivableService $receivableService): RedirectResponse
    {
        $validated = $request->validated();
        $validated['paid_at'] = Carbon::parse($validated['paid_at']);
        $receivableService->recordPayment($advisor_membership, $validated);

        return redirect()
            ->route('inmopro.advisors.index', InertiaListingRedirect::advisorsIndexQueryMerged($request, [
                'membership_id' => $advisor_membership->id,
            ]))
            ->with('success', 'Abono registrado correctamente.');
    }
}
