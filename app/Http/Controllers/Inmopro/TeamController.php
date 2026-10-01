<?php

namespace App\Http\Controllers\Inmopro;

use App\Exports\Inmopro\TeamsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\ImportTeamsFromExcelRequest;
use App\Http\Requests\Inmopro\StoreTeamRequest;
use App\Http\Requests\Inmopro\UpdateTeamRequest;
use App\Imports\Inmopro\TeamsImport;
use App\Models\Inmopro\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TeamController extends Controller
{
    public function index(Request $request): Response
    {
        $teams = Team::query()
            ->withCount('advisors')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('inmopro/teams/index', [
            'teams' => $teams,
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('inmopro.teams.index', ['create' => 1]);
    }

    public function store(StoreTeamRequest $request): RedirectResponse
    {
        Team::create($request->validated());

        return redirect()->route('inmopro.teams.index');
    }

    public function show(Team $team): Response
    {
        $team->loadCount('advisors');

        return Inertia::render('inmopro/teams/show', [
            'team' => $team,
        ]);
    }

    public function edit(Team $team): Response
    {
        return Inertia::render('inmopro/teams/edit', [
            'team' => $team,
        ]);
    }

    public function update(UpdateTeamRequest $request, Team $team): RedirectResponse
    {
        $team->update($request->validated());

        return redirect()->route('inmopro.teams.index');
    }

    public function destroy(Team $team): RedirectResponse
    {
        $team->delete();

        return redirect()->route('inmopro.teams.index');
    }

    public function excelTemplate(): BinaryFileResponse
    {
        return Excel::download(
            new TeamsExport(collect()),
            'plantilla_teams_comerciales.xlsx'
        );
    }

    public function exportExcel(): BinaryFileResponse
    {
        $teams = Team::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return Excel::download(
            new TeamsExport($teams),
            'teams_comerciales.xlsx'
        );
    }

    public function importFromExcel(ImportTeamsFromExcelRequest $request): RedirectResponse
    {
        Excel::import(new TeamsImport, $request->file('file'));

        return redirect()
            ->route('inmopro.teams.index')
            ->with('success', 'Teams comerciales importados correctamente.');
    }
}
