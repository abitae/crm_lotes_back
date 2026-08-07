<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Client;
use App\Models\Inmopro\ClientType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use RuntimeException;

class ClientsExcelImportService
{
    private const CACHE_TTL_MINUTES = 20;

    /**
     * @var array<string, list<string>>
     */
    private const HEADER_ALIASES = [
        'name' => ['NOMBRE'],
        'dni' => ['DNI'],
        'phone' => ['TELEFONO', 'CELULAR', 'PHONE'],
        'email' => ['EMAIL', 'CORREO'],
        'referred_by' => ['REFERIDO POR'],
        'client_type' => ['TIPO CLIENTE', 'TIPO'],
        'city' => ['CIUDAD'],
        'advisor' => ['ASESOR', 'VENDEDOR'],
        'registered_at' => [
            'FECHA REGISTRO',
            'FECHA DE REGISTRO',
            'CREATED AT',
            'FECHA CREACION',
        ],
    ];

    /**
     * @return array{
     *     summary: array{rows_read: int, valid: int, invalid: int, skipped: int},
     *     rows: list<array<string, mixed>>,
     *     errors: list<array{excel_row: int, field: string, message: string}>,
     *     token: string|null,
     *     can_import: bool
     * }
     */
    public function preview(UploadedFile $file): array
    {
        $loaded = $this->loadSheet($file);
        $headerMap = $this->buildHeaderMap($loaded['header']);
        $missingHeaders = $this->missingRequiredHeaders($headerMap);

        if ($missingHeaders !== []) {
            return [
                'summary' => [
                    'rows_read' => 0,
                    'valid' => 0,
                    'invalid' => 0,
                    'skipped' => 0,
                ],
                'rows' => [],
                'errors' => array_map(
                    fn (string $header): array => [
                        'excel_row' => 1,
                        'field' => 'header',
                        'message' => 'Falta la columna obligatoria: '.$header,
                    ],
                    $missingHeaders
                ),
                'token' => null,
                'can_import' => false,
            ];
        }

        $rows = [];
        $errors = [];
        $apply = [];
        $rowsRead = 0;
        $skipped = 0;
        $seenDnis = [];
        $seenPhones = [];

        foreach ($loaded['rows'] as $row) {
            $cells = $row['cells'];
            if ($this->isRowEmpty($cells) || $this->isLegendRow($cells, $headerMap)) {
                continue;
            }

            $rowsRead++;
            $excelRow = $row['excel_row'];
            $rowErrors = [];

            $name = $this->cellStringByField($cells, $headerMap, 'name');
            $rawDni = $this->cellStringByField($cells, $headerMap, 'dni');
            $dni = $this->normalizeDni($rawDni);
            $phone = $this->normalizePhone($this->cellStringByField($cells, $headerMap, 'phone'));
            $email = $this->cellStringByField($cells, $headerMap, 'email');
            $referredBy = $this->cellStringByField($cells, $headerMap, 'referred_by');
            $clientTypeName = $this->cellStringByField($cells, $headerMap, 'client_type');
            $cityName = $this->normalizeCityName($this->cellStringByField($cells, $headerMap, 'city'));
            $advisorName = $this->cellStringByField($cells, $headerMap, 'advisor');
            $registeredAtRaw = $this->cellRawByField($cells, $headerMap, 'registered_at');
            $registeredAt = null;
            $registeredAtInvalid = false;

            if ($registeredAtRaw !== null && trim((string) $registeredAtRaw) !== '') {
                $registeredAt = $this->parseDateValue($registeredAtRaw);
                if ($registeredAt === null) {
                    $registeredAtInvalid = true;
                }
            }

            if ($name === null) {
                $rowErrors[] = ['field' => 'name', 'message' => 'El nombre es obligatorio.'];
            }
            if ($rawDni !== null && $dni === null) {
                $rowErrors[] = ['field' => 'dni', 'message' => 'El DNI debe tener 8 digitos cuando se informa.'];
            }
            if ($phone === null) {
                $rowErrors[] = ['field' => 'phone', 'message' => 'El telefono es obligatorio.'];
            }
            if ($clientTypeName === null) {
                $rowErrors[] = ['field' => 'client_type', 'message' => 'El tipo de cliente es obligatorio.'];
            }
            if ($advisorName === null) {
                $rowErrors[] = ['field' => 'advisor', 'message' => 'El asesor es obligatorio.'];
            }
            if ($registeredAtInvalid) {
                $rowErrors[] = [
                    'field' => 'registered_at',
                    'message' => 'Fecha de registro no valida (use DD/MM/AAAA HH:MM, AAAA-MM-DD HH:MM o celda de fecha Excel).',
                ];
            }

            if ($dni !== null) {
                if (isset($seenDnis[$dni])) {
                    $rowErrors[] = ['field' => 'dni', 'message' => 'El DNI esta duplicado dentro del archivo.'];
                } else {
                    $seenDnis[$dni] = true;
                }
            }

            if ($phone !== null) {
                $phoneKey = $this->phoneDigits($phone);
                if (isset($seenPhones[$phoneKey])) {
                    $rowErrors[] = ['field' => 'phone', 'message' => 'El telefono esta duplicado dentro del archivo.'];
                } else {
                    $seenPhones[$phoneKey] = true;
                }
            }

            $clientTypeId = $this->resolveClientTypeId($clientTypeName);
            if ($clientTypeName !== null && $clientTypeId === null) {
                $rowErrors[] = ['field' => 'client_type', 'message' => 'El tipo de cliente no existe.'];
            }

            $advisorId = $this->resolveAdvisorId($advisorName);
            if ($advisorName !== null && $advisorId === null) {
                $rowErrors[] = ['field' => 'advisor', 'message' => 'El asesor no existe.'];
            }

            if ($email !== null && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $rowErrors[] = ['field' => 'email', 'message' => 'El email no tiene un formato valido.'];
            }

            $existingByDni = $dni !== null ? Client::query()->where('dni', $dni)->first() : null;
            $existingByPhone = $phone !== null ? $this->findClientByPhone($phone) : null;
            $phoneBelongsToOtherClient = $existingByPhone !== null
                && ($existingByDni === null || $existingByPhone->id !== $existingByDni->id);

            if ($rowErrors === [] && $phoneBelongsToOtherClient) {
                $skipped++;
                $rows[] = [
                    'excel_row' => $excelRow,
                    'name' => $name,
                    'dni' => $dni,
                    'phone' => $phone,
                    'email' => $email,
                    'client_type' => $clientTypeName,
                    'city' => $cityName,
                    'advisor' => $advisorName,
                    'registered_at' => $registeredAt,
                    'action' => 'skip',
                    'errors' => [],
                    'skip_reason' => 'Telefono ya registrado; se omite el registro.',
                ];

                continue;
            }

            foreach ($rowErrors as $rowError) {
                $errors[] = [
                    'excel_row' => $excelRow,
                    'field' => $rowError['field'],
                    'message' => $rowError['message'],
                ];
            }

            $rows[] = [
                'excel_row' => $excelRow,
                'name' => $name,
                'dni' => $dni,
                'phone' => $phone,
                'email' => $email,
                'client_type' => $clientTypeName,
                'city' => $cityName,
                'advisor' => $advisorName,
                'registered_at' => $registeredAt,
                'action' => $existingByDni ? 'update' : 'create',
                'errors' => array_map(fn (array $error): string => $error['message'], $rowErrors),
                'skip_reason' => null,
            ];

            if ($rowErrors === []) {
                $apply[] = [
                    'match_dni' => $dni,
                    'payload' => [
                        'name' => $name,
                        'dni' => $dni,
                        'phone' => $phone,
                        'email' => $email,
                        'referred_by' => $referredBy,
                        'client_type_id' => $clientTypeId,
                        'advisor_id' => $advisorId,
                    ],
                    'city_name' => $cityName,
                    'registered_at' => $registeredAt,
                ];
            }
        }

        $valid = count($apply);
        $invalid = count(array_filter(
            $rows,
            fn (array $row): bool => ($row['action'] ?? null) !== 'skip' && ($row['errors'] ?? []) !== []
        ));
        $canImport = $errors === [] && $valid > 0;
        $token = null;

        if ($canImport) {
            $userId = auth()->id();
            if (! is_int($userId)) {
                throw new RuntimeException('Usuario no autenticado.');
            }

            $token = (string) Str::uuid();
            Cache::put(
                $this->cacheKey($userId, $token),
                ['apply' => $apply],
                now()->addMinutes(self::CACHE_TTL_MINUTES)
            );
        }

        return [
            'summary' => [
                'rows_read' => $rowsRead,
                'valid' => $valid,
                'invalid' => $invalid,
                'skipped' => $skipped,
            ],
            'rows' => $rows,
            'errors' => $errors,
            'token' => $token,
            'can_import' => $canImport,
        ];
    }

    public function confirm(string $token, User $user): void
    {
        $cached = Cache::pull($this->cacheKey($user->id, $token));

        if (! is_array($cached) || ! isset($cached['apply']) || ! is_array($cached['apply'])) {
            throw new RuntimeException('La validacion expiro o no es valida. Vuelva a cargar el archivo.');
        }

        DB::transaction(function () use ($cached): void {
            foreach ($cached['apply'] as $row) {
                $client = $this->resolveClientForImport($row['match_dni'] ?? null);
                $payload = $row['payload'];
                $cityName = $row['city_name'] ?? null;

                if (is_string($cityName) && $cityName !== '') {
                    $payload['city_id'] = $this->findOrCreateCityId($cityName);
                } else {
                    $payload['city_id'] = null;
                }

                $client->fill($payload);

                if (! empty($row['registered_at'])) {
                    $client->created_at = Carbon::parse($row['registered_at']);
                    if (! $client->exists) {
                        $client->updated_at = $client->created_at;
                    }
                }

                $client->save();
            }
        });
    }

    private function resolveClientForImport(?string $matchDni): Client
    {
        if ($matchDni !== null && $matchDni !== '') {
            return Client::query()->firstOrNew(['dni' => $matchDni]);
        }

        return new Client;
    }

    private function findClientByPhone(string $phone): ?Client
    {
        $digits = $this->phoneDigits($phone);
        if ($digits === '') {
            return null;
        }

        return Client::query()
            ->where(function ($query) use ($phone, $digits): void {
                $query->where('phone', $phone)
                    ->orWhereRaw(
                        "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') = ?",
                        [$digits]
                    );
            })
            ->orderBy('id')
            ->first();
    }

    private function phoneDigits(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?? '';
    }

    /**
     * @return array{header: array<int, mixed>, rows: list<array{excel_row: int, cells: array<int, mixed>}>}
     */
    private function loadSheet(UploadedFile $file): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getSheet(0);
        $rows = $sheet->toArray(null, true, true, false);

        if ($rows === []) {
            throw new RuntimeException('El archivo Excel no contiene filas.');
        }

        $header = array_values((array) $rows[0]);
        $dataRows = [];

        foreach (array_slice($rows, 1) as $index => $row) {
            $dataRows[] = [
                'excel_row' => $index + 2,
                'cells' => array_values((array) $row),
            ];
        }

        return [
            'header' => $header,
            'rows' => $dataRows,
        ];
    }

    /**
     * @param  array<int, mixed>  $header
     * @return array<string, int>
     */
    private function buildHeaderMap(array $header): array
    {
        $normalizedHeader = [];
        foreach ($header as $index => $value) {
            $normalizedHeader[$this->normalizeHeader((string) $value)] = $index;
        }

        $map = [];
        foreach (self::HEADER_ALIASES as $field => $aliases) {
            foreach ($aliases as $alias) {
                $normalizedAlias = $this->normalizeHeader($alias);
                if (array_key_exists($normalizedAlias, $normalizedHeader)) {
                    $map[$field] = $normalizedHeader[$normalizedAlias];
                    break;
                }
            }
        }

        return $map;
    }

    /**
     * @param  array<string, int>  $headerMap
     * @return list<string>
     */
    private function missingRequiredHeaders(array $headerMap): array
    {
        $required = [
            'name' => 'Nombre',
            'phone' => 'Telefono',
            'client_type' => 'Tipo cliente',
            'advisor' => 'Asesor',
        ];

        $missing = [];
        foreach ($required as $field => $label) {
            if (! array_key_exists($field, $headerMap)) {
                $missing[] = $label;
            }
        }

        return $missing;
    }

    /**
     * @param  array<int, mixed>  $cells
     * @param  array<string, int>  $headerMap
     */
    private function cellStringByField(array $cells, array $headerMap, string $field): ?string
    {
        $value = $this->cellRawByField($cells, $headerMap, $field);
        if ($value === null) {
            return null;
        }

        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    /**
     * @param  array<int, mixed>  $cells
     * @param  array<string, int>  $headerMap
     */
    private function cellRawByField(array $cells, array $headerMap, string $field): mixed
    {
        if (! isset($headerMap[$field])) {
            return null;
        }

        return $cells[$headerMap[$field]] ?? null;
    }

    /**
     * @param  array<int, mixed>  $cells
     * @param  array<string, int>  $headerMap
     */
    private function isLegendRow(array $cells, array $headerMap): bool
    {
        $name = $this->cellStringByField($cells, $headerMap, 'name');

        if ($name === null) {
            return false;
        }

        $normalized = mb_strtolower($name);

        return str_contains($normalized, 'leyenda')
            || str_contains($normalized, '(*) = obligatorio');
    }

    /**
     * @param  array<int, mixed>  $cells
     */
    private function isRowEmpty(array $cells): bool
    {
        foreach ($cells as $value) {
            if ($value !== null && trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function normalizeHeader(string $value): string
    {
        $value = preg_replace('/\([^)]*\)/', ' ', $value) ?? $value;
        $value = str_replace('*', ' ', $value);

        $value = Str::of($value)
            ->ascii()
            ->upper()
            ->replaceMatches('/[^A-Z0-9]+/', ' ')
            ->trim()
            ->value();

        return preg_replace('/\s+/', ' ', $value) ?? '';
    }

    private function normalizeDni(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value);

        return $digits !== null && strlen($digits) === 8 ? $digits : null;
    }

    private function normalizePhone(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $text = trim($value);

        return $text === '' ? null : $text;
    }

    private function parseDateValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_numeric($value) && (float) $value > 0) {
            try {
                return ExcelDate::excelToDateTimeObject((float) $value)->format('Y-m-d H:i:s');
            } catch (\Throwable) {
                // continue
            }
        }

        $text = trim((string) $value);
        if ($text === '') {
            return null;
        }

        if (is_numeric($text) && (float) $text > 0) {
            try {
                return ExcelDate::excelToDateTimeObject((float) $text)->format('Y-m-d H:i:s');
            } catch (\Throwable) {
                // continue
            }
        }

        if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/', $text, $m)) {
            $day = (int) $m[1];
            $month = (int) $m[2];
            $year = (int) $m[3];
            $hour = isset($m[4]) ? (int) $m[4] : 0;
            $minute = isset($m[5]) ? (int) $m[5] : 0;
            $second = isset($m[6]) ? (int) $m[6] : 0;

            if (! checkdate($month, $day, $year) || $hour > 23 || $minute > 59 || $second > 59) {
                return null;
            }

            return sprintf('%04d-%02d-%02d %02d:%02d:%02d', $year, $month, $day, $hour, $minute, $second);
        }

        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/', $text, $m)) {
            $year = (int) $m[1];
            $month = (int) $m[2];
            $day = (int) $m[3];
            $hour = isset($m[4]) ? (int) $m[4] : 0;
            $minute = isset($m[5]) ? (int) $m[5] : 0;
            $second = isset($m[6]) ? (int) $m[6] : 0;

            if (! checkdate($month, $day, $year) || $hour > 23 || $minute > 59 || $second > 59) {
                return null;
            }

            return sprintf('%04d-%02d-%02d %02d:%02d:%02d', $year, $month, $day, $hour, $minute, $second);
        }

        try {
            return Carbon::createFromFormat('d/m/Y H:i', $text)->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            // continue
        }

        try {
            return Carbon::parse($text)->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            return null;
        }
    }

    private function resolveClientTypeId(?string $name): ?int
    {
        if ($name === null) {
            return null;
        }

        $id = ClientType::query()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->value('id');

        return $id !== null ? (int) $id : null;
    }

    private function normalizeCityName(?string $name): ?string
    {
        if ($name === null) {
            return null;
        }

        $normalized = mb_strtoupper(trim($name));

        return $normalized === '' ? null : $normalized;
    }

    private function findOrCreateCityId(string $name): int
    {
        $normalized = $this->normalizeCityName($name);
        if ($normalized === null) {
            throw new RuntimeException('La ciudad no es valida.');
        }

        $existing = City::query()
            ->whereRaw('UPPER(name) = ?', [$normalized])
            ->orderBy('id')
            ->first();

        if ($existing !== null) {
            if ($existing->name !== $normalized) {
                $existing->update(['name' => $normalized]);
            }

            return (int) $existing->id;
        }

        $city = City::query()->create([
            'name' => $normalized,
            'code' => $this->uniqueCityCode($normalized),
            'department' => null,
            'sort_order' => 0,
            'is_active' => true,
        ]);

        return (int) $city->id;
    }

    private function uniqueCityCode(string $name): string
    {
        $ascii = Str::of($name)->ascii()->upper()->replaceMatches('/[^A-Z0-9]+/', '')->value();
        $base = $ascii !== '' ? Str::substr($ascii, 0, 8) : 'CITY';
        $code = $base;
        $suffix = 1;

        while (City::query()->where('code', $code)->exists()) {
            $suffixText = (string) $suffix;
            $code = Str::substr($base, 0, max(1, 50 - strlen($suffixText))).$suffixText;
            $suffix++;
        }

        return $code;
    }

    private function resolveAdvisorId(?string $name): ?int
    {
        if ($name === null) {
            return null;
        }

        $id = Advisor::query()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->value('id');

        return $id !== null ? (int) $id : null;
    }

    private function cacheKey(int $userId, string $token): string
    {
        return 'clients_excel_import_confirm:'.$userId.':'.$token;
    }
}
