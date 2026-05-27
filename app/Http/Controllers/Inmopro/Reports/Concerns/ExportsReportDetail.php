<?php

namespace App\Http\Controllers\Inmopro\Reports\Concerns;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\View;
use Mpdf\Mpdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

trait ExportsReportDetail
{
    /**
     * @param  array<string, mixed>  $payload
     */
    protected function pdfResponse(Request $request, array $payload, string $viewName, string $filenamePrefix): Response
    {
        $html = View::make($viewName, $payload)->render();

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

        $filename = $filenamePrefix.'-'.now()->format('Y-m-d').'.pdf';
        $disposition = $request->input('disposition') === 'attachment' ? 'attachment' : 'inline';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
        ]);
    }

    /**
     * @param  list<string>  $headers
     * @param  callable(): iterable<list<string|int|float|null>>  $rowGenerator
     */
    protected function csvResponse(string $filenamePrefix, array $headers, callable $rowGenerator): StreamedResponse
    {
        $filename = $filenamePrefix.'-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($headers, $rowGenerator): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $headers, ';');

            foreach ($rowGenerator() as $row) {
                fputcsv($handle, $row, ';');
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
