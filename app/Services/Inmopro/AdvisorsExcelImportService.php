<?php

namespace App\Services\Inmopro;

use App\Models\Inmopro\Advisor;
use App\Models\Inmopro\AdvisorLevel;
use App\Models\Inmopro\City;
use App\Models\Inmopro\Team;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use RuntimeException;

class AdvisorsExcelImportService
{
    private const CACHE_TTL_MINUTES = 20;

    /**
     * Columnas: … CCI, Fecha ingreso (última columna; compatible con archivos de 17 columnas sin esta fecha).
     * Fechas en texto: preferente DD/MM/AAAA; también AAAA-MM-DD; o número serial de fecha de Excel.
     */
    private const COL_DNI = 0;

    private const COL_FIRST_NAME = 1;

    private const COL_LAST_NAME = 2;

    private const COL_BIRTH = 3;

    private const COL_PHONE = 4;

    private const COL_EMAIL = 5;

    private const COL_CITY = 6;

    private const COL_DEPT = 7;

    private const COL_TEAM = 8;

    private const COL_LEVEL = 9;

    private const COL_QUOTA = 10;

    private const COL_ACTIVE = 11;

    private const COL_USERNAME = 12;

    private const COL_SUPERIOR_EMAIL = 13;

    private const COL_BANK = 14;

    private const COL_ACCOUNT = 15;

    private const COL_CCI = 16;

    private const COL_JOINED = 17;

    /**
     * @return array{rows: list<array<string, mixed>>, summary: array{valid: int, invalid: int}, token: string|null, can_confirm: bool}
     */
    public function preview(UploadedFile $file): array
    {
        $sheetRows = $this->loadSheetRows($file);
        $seenDnis = [];
        $previewRows = [];
        $validApply = [];
        $superiorLinks = [];

        foreach ($sheetRows as $item) {
            $excelRow = $item['excel_row'];
            $cells = $item['cells'];
            if ($this->isRowEmpty($cells)) {
                continue;
            }

            $rowResult = [
                'excel_row' => $excelRow,
                'dni' => null,
                'status' => 'invalid',
                'action' => null,
                'errors' => [],
            ];

            $dniNorm = $this->normalizeDni($this->cellString($cells, self::COL_DNI));
            $rowResult['dni'] = $dniNorm;

            if ($dniNorm === null) {
                $rowResult['errors'][] = 'El DNI es obligatorio y debe tener 8 dígitos.';
                $previewRows[] = $rowResult;

                continue;
            }

            if (isset($seenDnis[$dniNorm])) {
                $rowResult['errors'][] = 'DNI duplicado en el archivo.';
                $previewRows[] = $rowResult;

                continue;
            }
            $seenDnis[$dniNorm] = true;

            $firstName = $this->cellString($cells, self::COL_FIRST_NAME);
            $phone = $this->cellString($cells, self::COL_PHONE);
            $email = $this->cellString($cells, self::COL_EMAIL);

            if ($firstName === null || $phone === null || $email === null) {
                $rowResult['errors'][] = 'Nombres, teléfono y email son obligatorios.';
                $previewRows[] = $rowResult;

                continue;
            }

            $cityName = $this->cellString($cells, self::COL_CITY);
            $department = $this->cellString($cells, self::COL_DEPT);
            $teamCode = $this->cellString($cells, self::COL_TEAM);
            $levelCode = $this->cellString($cells, self::COL_LEVEL);

            $cityId = $this->resolveCityId($cityName, $department);
            $teamId = $this->resolveTeamId($teamCode);
            $levelId = $this->resolveLevelId($levelCode);

            if ($cityId === null) {
                $rowResult['errors'][] = 'Ciudad no encontrada o inactiva.';
            }
            if ($teamId === null) {
                $rowResult['errors'][] = 'Código de equipo no válido.';
            }
            if ($levelId === null) {
                $rowResult['errors'][] = 'Código de nivel no válido.';
            }

            $birthParsed = $this->parseCellDate($cells, self::COL_BIRTH);
            $joinedKeyExists = array_key_exists(self::COL_JOINED, $cells);
            $joinedParsed = $joinedKeyExists ? $this->parseCellDate($cells, self::COL_JOINED) : null;
            if ($this->cellHasExcelOrTextDate($cells, self::COL_BIRTH) && $birthParsed === null) {
                $rowResult['errors'][] = 'Fecha de nacimiento no válida (use DD/MM/AAAA, AAAA-MM-DD o celda de fecha Excel).';
            }
            if ($joinedKeyExists) {
                if ($joinedParsed === null) {
                    if ($this->cellHasExcelOrTextDate($cells, self::COL_JOINED)) {
                        $rowResult['errors'][] = 'Fecha de ingreso no válida (use DD/MM/AAAA, AAAA-MM-DD o celda de fecha Excel).';
                    } else {
                        $rowResult['errors'][] = 'La fecha de ingreso en la última columna es obligatoria.';
                    }
                }
            }

            $cci = $this->cellString($cells, self::COL_CCI);
            if ($cci !== null && $cci !== '' && ! preg_match('/^[0-9]{20}$/', $cci)) {
                $rowResult['errors'][] = 'El CCI debe tener exactamente 20 dígitos.';
            }

            $existingByDni = Advisor::query()->where('dni', $dniNorm)->first();
            $existingByEmail = Advisor::query()->where('email', $email)->first();

            if ($existingByDni === null && $existingByEmail !== null) {
                $rowResult['errors'][] = 'El email ya está registrado con otro DNI.';
            }

            if ($existingByDni !== null && $existingByEmail !== null && $existingByDni->id !== $existingByEmail->id) {
                $rowResult['errors'][] = 'El email pertenece a otro vendedor.';
            }

            if ($rowResult['errors'] !== []) {
                $previewRows[] = $rowResult;

                continue;
            }

            $quota = $this->parseDecimal($cells, self::COL_QUOTA);
            $isActive = $this->parseBool($cells, self::COL_ACTIVE, true);
            $username = $this->cellString($cells, self::COL_USERNAME);
            $superiorEmail = $this->cellString($cells, self::COL_SUPERIOR_EMAIL);

            $payload = [
                'first_name' => $firstName,
                'last_name' => $this->cellString($cells, self::COL_LAST_NAME),
                'birth_date' => $birthParsed,
                'phone' => $phone,
                'email' => $email,
                'city_id' => $cityId,
                'team_id' => $teamId,
                'advisor_level_id' => $levelId,
                'personal_quota' => $quota ?? 0,
                'is_active' => $isActive,
                'superior_id' => null,
                'bank_name' => $this->cellString($cells, self::COL_BANK),
                'bank_account_number' => $this->cellString($cells, self::COL_ACCOUNT),
                'bank_cci' => ($cci !== null && $cci !== '') ? $cci : null,
                'dni' => $dniNorm,
            ];
            if ($joinedKeyExists) {
                $payload['joined_at'] = $joinedParsed;
            }

            $action = $existingByDni !== null ? 'update' : 'create';

            if ($action === 'update' && $username !== null && $username !== '') {
                $otherUsername = Advisor::query()
                    ->where('username', $username)
                    ->whereKeyNot($existingByDni->id)
                    ->exists();
                if ($otherUsername) {
                    $rowResult['errors'][] = 'El usuario (username) ya está en uso por otro vendedor.';
                    $previewRows[] = $rowResult;

                    continue;
                }
                $payload['username'] = $username;
            }

            if ($action === 'create' && $username !== null && $username !== '') {
                if (Advisor::query()->where('username', $username)->exists()) {
                    $rowResult['errors'][] = 'El usuario (username) ya está en uso.';
                    $previewRows[] = $rowResult;

                    continue;
                }
                $payload['username'] = $username;
            }

            $rowResult['status'] = 'valid';
            $rowResult['action'] = $action;
            $rowResult['errors'] = [];
            $previewRows[] = $rowResult;

            $applyRow = [
                'dni' => $dniNorm,
                'action' => $action,
                'payload' => $payload,
                'superior_email' => $superiorEmail,
            ];
            if ($action === 'create') {
                $applyRow['generated_username'] = $payload['username'] ?? (string) Str::of($email)->before('@')->slug('_');
            }

            $validApply[] = $applyRow;
            if ($superiorEmail !== null && $superiorEmail !== '') {
                $superiorLinks[] = ['advisor_dni' => $dniNorm, 'superior_email' => $superiorEmail];
            }
        }

        $valid = count(array_filter($previewRows, fn (array $r) => $r['status'] === 'valid'));
        $invalid = count(array_filter($previewRows, fn (array $r) => $r['status'] === 'invalid'));

        $token = null;
        $canConfirm = $invalid === 0 && $valid > 0;

        if ($canConfirm) {
            $token = (string) Str::uuid();
            $userId = auth()->id();
            if (! is_int($userId)) {
                throw new RuntimeException('Usuario no autenticado.');
            }
            Cache::put(
                $this->cacheKey($userId, $token),
                [
                    'apply' => $validApply,
                    'superior_links' => $superiorLinks,
                ],
                now()->addMinutes(self::CACHE_TTL_MINUTES)
            );
        }

        return [
            'rows' => $previewRows,
            'summary' => [
                'valid' => $valid,
                'invalid' => $invalid,
            ],
            'token' => $token,
            'can_confirm' => $canConfirm,
        ];
    }

    public function confirm(string $token, User $user): void
    {
        $key = $this->cacheKey($user->id, $token);
        $cached = Cache::pull($key);
        if (! is_array($cached) || ! isset($cached['apply'])) {
            throw new RuntimeException('La previsualización expiró o no es válida. Vuelva a cargar el archivo.');
        }

        $apply = $cached['apply'];
        $superiorLinks = $cached['superior_links'] ?? [];

        DB::transaction(function () use ($apply, $superiorLinks): void {
            foreach ($apply as $row) {
                $dni = $row['dni'];
                $payload = $row['payload'];
                $action = $row['action'];

                if ($action === 'create') {
                    $username = $row['generated_username'] ?? (string) Str::of($payload['email'])->before('@')->slug('_');
                    Advisor::query()->create(array_merge($payload, [
                        'username' => $username,
                        'pin' => '123456',
                        'must_change_pin' => true,
                    ]));
                } else {
                    $advisor = Advisor::query()->where('dni', $dni)->firstOrFail();
                    $advisor->update($payload);
                }
            }

            foreach ($superiorLinks as $link) {
                $sub = Advisor::query()->where('dni', $link['advisor_dni'])->first();
                $sup = Advisor::query()->where('email', $link['superior_email'])->first();
                if ($sub && $sup && $sub->id !== $sup->id) {
                    $sub->update(['superior_id' => $sup->id]);
                }
            }
        });
    }

    /**
     * @return list<array{excel_row: int, cells: array<int, mixed>}>
     */
    private function loadSheetRows(UploadedFile $file): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $all = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);
        $out = [];
        foreach (array_slice($all, 1) as $i => $row) {
            $cells = is_array($row) ? array_values($row) : [];
            $out[] = [
                'excel_row' => $i + 2,
                'cells' => $cells,
            ];
        }

        return $out;
    }

    /**
     * @param  array<int, mixed>  $cells
     */
    private function isRowEmpty(array $cells): bool
    {
        foreach ($cells as $v) {
            if ($v !== null && trim((string) $v) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<int, mixed>  $cells
     */
    private function cellString(array $cells, int $index): ?string
    {
        if (! array_key_exists($index, $cells)) {
            return null;
        }
        $text = trim((string) ($cells[$index] ?? ''));

        return $text === '' ? null : $text;
    }

    /**
     * @param  array<int, mixed>  $cells
     */
    private function parseDecimal(array $cells, int $index): ?float
    {
        $v = $cells[$index] ?? null;
        if ($v === null || $v === '') {
            return null;
        }

        return (float) $v;
    }

    /**
     * @param  array<int, mixed>  $cells
     */
    private function parseBool(array $cells, int $index, bool $default): bool
    {
        $v = $cells[$index] ?? null;
        if ($v === null || $v === '') {
            return $default;
        }

        $normalized = mb_strtolower(trim((string) $v));

        return match ($normalized) {
            'si', 'sí', '1', 'true', 'yes', 'activo' => true,
            'no', '0', 'false', 'inactivo' => false,
            default => $default,
        };
    }

    /**
     * @param  array<int, mixed>  $cells
     */
    private function cellHasExcelOrTextDate(array $cells, int $index): bool
    {
        if (! array_key_exists($index, $cells)) {
            return false;
        }
        $v = $cells[$index];
        if ($v === null) {
            return false;
        }
        if (is_numeric($v)) {
            return true;
        }

        return trim((string) $v) !== '';
    }

    /**
     * Convierte texto a Y-m-d: prioridad DD/MM/AAAA (formato Excel típico en Perú), luego AAAA-MM-DD, luego otros parseables.
     */
    private function parseDateStringToYmd(string $text): ?string
    {
        $text = trim($text);
        if ($text === '') {
            return null;
        }

        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $text, $m)) {
            $day = (int) $m[1];
            $month = (int) $m[2];
            $year = (int) $m[3];
            if (! checkdate($month, $day, $year)) {
                return null;
            }

            return sprintf('%04d-%02d-%02d', $year, $month, $day);
        }

        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $text, $m)) {
            $year = (int) $m[1];
            $month = (int) $m[2];
            $day = (int) $m[3];
            if (! checkdate($month, $day, $year)) {
                return null;
            }

            return sprintf('%04d-%02d-%02d', $year, $month, $day);
        }

        try {
            return Carbon::parse($text)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<int, mixed>  $cells
     */
    private function parseCellDate(array $cells, int $index): ?string
    {
        if (! array_key_exists($index, $cells)) {
            return null;
        }
        $v = $cells[$index];
        if ($v === null) {
            return null;
        }
        if (is_numeric($v) && (float) $v > 0) {
            try {
                return ExcelDate::excelToDateTimeObject((float) $v)->format('Y-m-d');
            } catch (\Throwable) {
                // intentar como texto
            }
        }
        $text = trim((string) $v);
        if ($text === '') {
            return null;
        }

        return $this->parseDateStringToYmd($text);
    }

    private function normalizeDni(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $digits = preg_replace('/\D/', '', trim($value));

        if ($digits === '' || strlen($digits) !== 8) {
            return null;
        }

        return $digits;
    }

    private function resolveCityId(?string $cityName, ?string $department): ?int
    {
        if ($cityName === null) {
            return null;
        }

        $cityLower = mb_strtolower($cityName);

        $query = City::query()
            ->where('is_active', true)
            ->whereRaw('LOWER(name) = ?', [$cityLower]);

        if ($department !== null && $department !== '') {
            $deptLower = mb_strtolower($department);
            $id = (clone $query)->whereRaw('LOWER(department) = ?', [$deptLower])->value('id');
            if ($id !== null) {
                return (int) $id;
            }
        }

        $id = City::query()
            ->where('is_active', true)
            ->whereRaw('LOWER(name) = ?', [$cityLower])
            ->value('id');

        return $id !== null ? (int) $id : null;
    }

    private function resolveTeamId(?string $code): ?int
    {
        if ($code === null) {
            return null;
        }

        $id = Team::query()
            ->whereRaw('LOWER(code) = ?', [mb_strtolower(trim($code))])
            ->value('id');

        return $id !== null ? (int) $id : null;
    }

    private function resolveLevelId(?string $code): ?int
    {
        if ($code === null) {
            return null;
        }

        $normalized = mb_strtolower(trim($code));

        $id = AdvisorLevel::query()
            ->whereRaw('LOWER(code) = ?', [$normalized])
            ->value('id');

        if ($id !== null) {
            return (int) $id;
        }

        $id = AdvisorLevel::query()
            ->whereRaw('LOWER(name) = ?', [$normalized])
            ->value('id');

        return $id !== null ? (int) $id : null;
    }

    private function cacheKey(int $userId, string $token): string
    {
        return 'advisor_excel_import_confirm:'.$userId.':'.$token;
    }
}
