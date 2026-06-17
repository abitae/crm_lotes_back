<?php

namespace App\Http\Controllers\Inmopro\Reports;

use App\Http\Controllers\Controller;
use App\Services\Inmopro\Reports\SalesReportService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\View;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Mpdf\Mpdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SalesReportController extends Controller
{
    public function __construct(
        private readonly SalesReportService $salesReportService,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('inmopro/reports/sales', $this->salesReportService->buildPayload($request));
    }

    public function pdf(Request $request): Response
    {
        $payload = $this->salesReportService->buildPayload($request);
        $html = View::make('inmopro.report-pdf', $payload)->render();

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

        $filename = 'reporte-ventas-'.now()->format('Y-m-d').'.pdf';
        $disposition = $request->input('disposition') === 'attachment' ? 'attachment' : 'inline';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
        ]);
    }

    public function csv(Request $request): StreamedResponse
    {
        $payload = $this->salesReportService->buildPayload($request);
        $filename = 'reporte-ventas-'.now()->format('Y-m-d').'.csv';

        $entityColumn = match ($payload['view']) {
            'teams' => 'Equipo',
            default => 'Proyecto',
        };

        return response()->streamDownload(function () use ($payload, $entityColumn): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                $entityColumn,
                'Ventas (S/)',
                'Meta fila (S/)',
                '% Cumplimiento',
                'Cobrado (S/)',
                'Lotes',
            ], ';');

            foreach ($payload['rows'] as $row) {
                fputcsv($handle, [
                    $row['label'],
                    number_format((float) $row['sold_amount'], 2, '.', ''),
                    number_format((float) $row['goal_amount'], 2, '.', ''),
                    (string) $row['pct'],
                    number_format((float) $row['collected_amount'], 2, '.', ''),
                    (string) $row['lots_count'],
                ], ';');
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
