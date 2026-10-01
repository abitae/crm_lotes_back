<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inmopro\StoreCityRequest;
use App\Http\Requests\Inmopro\UpdateCityRequest;
use App\Models\Inmopro\City;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CityController extends Controller
{
    public function index(Request $request): Response
    {
        $cities = City::query()
            ->withCount('clients')
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = (string) $request->input('search');
                $query->where(function ($nestedQuery) use ($term) {
                    $nestedQuery->where('name', 'like', "%{$term}%")
                        ->orWhere('code', 'like', "%{$term}%")
                        ->orWhere('department', 'like', "%{$term}%");
                });
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('inmopro/cities/index', [
            'cities' => $cities,
            'filters' => $request->only('search'),
        ]);
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('inmopro.cities.index', ['create' => 1]);
    }

    public function store(StoreCityRequest $request): RedirectResponse
    {
        City::create($request->validated());

        return redirect()->route('inmopro.cities.index');
    }

    public function show(City $city): Response
    {
        $city->loadCount('clients');

        return Inertia::render('inmopro/cities/show', [
            'city' => $city,
        ]);
    }

    public function edit(City $city): Response
    {
        return Inertia::render('inmopro/cities/edit', [
            'city' => $city,
        ]);
    }

    public function update(UpdateCityRequest $request, City $city): RedirectResponse
    {
        $city->update($request->validated());

        return redirect()->route('inmopro.cities.index');
    }

    public function destroy(City $city): RedirectResponse
    {
        if ($city->clients()->exists()) {
            return redirect()->route('inmopro.cities.index')->with('error', 'No se puede eliminar una ciudad con clientes asociados.');
        }

        $city->delete();

        return redirect()->route('inmopro.cities.index');
    }
}
