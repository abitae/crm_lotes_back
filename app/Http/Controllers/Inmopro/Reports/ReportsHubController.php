<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Services\Inmopro\Reports\ReportsCatalog;
use Inertia\Inertia;
use Inertia\Response;

class ReportsHubController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('inmopro/reports/index', [
            'reports' => ReportsCatalog::all(),
            'reportSettingsUrl' => route('inmopro.report-settings.edit'),
        ]);
    }
}
