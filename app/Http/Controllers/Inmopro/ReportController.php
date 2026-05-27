<?php

namespace App\Http\Controllers\Inmopro;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Inmopro\Reports\SalesReportController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Compatibilidad con rutas históricas de reporte de ventas.
 */
class ReportController extends Controller
{
    public function __construct(
        private readonly SalesReportController $salesReportController,
    ) {}

    public function index(Request $request): RedirectResponse
    {
        return redirect()->route('inmopro.reports.sales.index', $request->query());
    }

    public function pdf(Request $request): Response
    {
        return $this->salesReportController->pdf($request);
    }

    public function csv(Request $request): StreamedResponse
    {
        return $this->salesReportController->csv($request);
    }
}
