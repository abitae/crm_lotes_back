<?php

namespace App\Http\Controllers\Inmopro;

use App\Exports\Inmopro\AdvisorLevelsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ImportAdvisorLevelsFromExcelRequest;
use App\Http\Requests\Inmopro\StoreAdvisorLevelRequest;
use App\Http\Requests\Inmopro\UpdateAdvisorLevelRequest;
use App\Imports\Inmopro\AdvisorLevelsImport;
use App\Models\Inmopro\AdvisorLevel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AdvisorLevelController extends Controller
{
    public function index(Request $request): Response
    {
        $advisorLevels = AdvisorLevel::withCount('advisors')->orderBy('sort_order')->paginate(10)->withQueryString();

        return Inertia::render('inmopro/advisor-levels/index', [
            'advisorLevels' => $advisorLevels,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('inmopro.advisor-levels.index', ['create' => 1]);
    }

    public function store(StoreAdvisorLevelRequest $request): RedirectResponse
    {
        AdvisorLevel::create($request->validated());

        return redirect()->route('inmopro.advisor-levels.index');
    }

    public function show(AdvisorLevel $advisor_level): Response
    {
        $advisor_level->loadCount('advisors');

        return Inertia::render('inmopro/advisor-levels/show', [
            'advisorLevel' => $advisor_level,
        ]);
    }

    public function edit(AdvisorLevel $advisor_level): Response
    {
        return Inertia::render('inmopro/advisor-levels/edit', [
            'advisorLevel' => $advisor_level,
        ]);
    }

    public function update(UpdateAdvisorLevelRequest $request, AdvisorLevel $advisor_level): RedirectResponse
    {
        $advisor_level->update($request->validated());

        return redirect()->route('inmopro.advisor-levels.index');
    }

    public function destroy(AdvisorLevel $advisor_level): RedirectResponse
    {
        $advisor_level->delete();

        return redirect()->route('inmopro.advisor-levels.index');
    }

    public function excelTemplate(): BinaryFileResponse
    {
        return Excel::download(
            new AdvisorLevelsExport(collect()),
            'plantilla_niveles_asesor.xlsx'
        );
    }

    public function exportExcel(): BinaryFileResponse
    {
        $levels = AdvisorLevel::query()->orderBy('sort_order')->get();

        return Excel::download(
            new AdvisorLevelsExport($levels),
            'niveles_asesor.xlsx'
        );
    }

    public function importFromExcel(ImportAdvisorLevelsFromExcelRequest $request): RedirectResponse
    {
        Excel::import(new AdvisorLevelsImport, $request->file('file'));

        return redirect()
            ->route('inmopro.advisor-levels.index')
            ->with('success', 'Niveles de asesor importados correctamente.');
    }
}
