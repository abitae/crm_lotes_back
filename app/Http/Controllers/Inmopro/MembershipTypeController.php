<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\BulkAssignMembershipRequest;
use App\Http\Requests\Inmopro\StoreMembershipTypeRequest;
use App\Http\Requests\Inmopro\UpdateMembershipTypeRequest;
use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorMembership;
use App\Models\Inmopro\MembershipType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MembershipTypeController extends Controller
{
    public function index(Request $request): Response
    {
        $membershipTypes = MembershipType::withCount('advisorMemberships')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('inmopro/membership-types/index', [
            'membershipTypes' => $membershipTypes,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('inmopro.membership-types.index', ['create' => 1]);
    }

    public function store(StoreMembershipTypeRequest $request): RedirectResponse
    {
        MembershipType::create($request->validated());

        return redirect()
            ->route('inmopro.membership-types.index')
            ->with('success', 'Tipo de membresía creado correctamente.');
    }

    public function show(MembershipType $membership_type): Response
    {
        $membership_type->loadCount('advisorMemberships');

        return Inertia::render('inmopro/membership-types/show', [
            'membershipType' => $membership_type,
        ]);
    }

    public function edit(MembershipType $membership_type): Response
    {
        return Inertia::render('inmopro/membership-types/edit', [
            'membershipType' => $membership_type,
        ]);
    }

    public function update(UpdateMembershipTypeRequest $request, MembershipType $membership_type): RedirectResponse
    {
        $membership_type->update($request->validated());

        return redirect()
            ->route('inmopro.membership-types.index')
            ->with('success', 'Tipo de membresía actualizado.');
    }

    public function destroy(MembershipType $membership_type): RedirectResponse
    {
        $membership_type->delete();

        return redirect()
            ->route('inmopro.membership-types.index')
            ->with('success', 'Tipo de membresía eliminado.');
    }

    public function bulkAssign(Request $request, MembershipType $membership_type): Response
    {
        $advisors = Advisor::query()
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $alreadyAssigned = AdvisorMembership::query()
            ->where('membership_type_id', $membership_type->id)
            ->pluck('advisor_id')
            ->all();

        return Inertia::render('inmopro/membership-types/bulk-assign', [
            'membershipType' => $membership_type,
            'advisors' => $advisors,
            'alreadyAssignedIds' => $alreadyAssigned,
        ]);
    }

    public function bulkAssignStore(BulkAssignMembershipRequest $request, MembershipType $membership_type): RedirectResponse
    {
        $startDate = \Carbon\Carbon::parse($request->input('start_date'));
        $endDate = $startDate->copy()->addMonths((int) $membership_type->months)->subDay();
        $year = (int) $startDate->format('Y');
        $amount = $membership_type->amount;

        $alreadyAssigned = AdvisorMembership::query()
            ->where('membership_type_id', $membership_type->id)
            ->whereIn('advisor_id', $request->input('advisor_ids'))
            ->pluck('advisor_id')
            ->all();

        $toCreate = array_diff($request->input('advisor_ids'), $alreadyAssigned);
        $created = 0;

        foreach ($toCreate as $advisorId) {
            AdvisorMembership::create([
                'advisor_id' => $advisorId,
                'membership_type_id' => $membership_type->id,
                'year' => $year,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'amount' => $amount,
            ]);
            $created++;
        }

        $skipped = count($request->input('advisor_ids')) - $created;
        $message = $created > 0
            ? "Membresía asignada a {$created} vendedor(es). Inicio: {$startDate->format('d/m/Y')}, vencimiento: {$endDate->format('d/m/Y')}."
            : 'No se asignó a ningún vendedor nuevo.';
        if ($skipped > 0) {
            $message .= " {$skipped} ya tenían esta membresía asignada.";
        }

        return redirect()
            ->route('inmopro.membership-types.index')
            ->with('success', $message);
    }
}
