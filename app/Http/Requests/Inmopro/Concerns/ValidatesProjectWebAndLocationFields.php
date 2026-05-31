<?php

namespace App\Http\Requests\Inmopro\Concerns;

use App\Models\Inmopro\Project;
use Illuminate\Validation\Rule;

trait ValidatesProjectWebAndLocationFields
{
    protected function projectWebAndLocationRules(bool $requireTipoWebWhenWeb = false): array
    {
        $tipoWebRules = ['nullable', 'string', Rule::in(Project::TIPO_WEB_SITES)];

        if ($requireTipoWebWhenWeb) {
            $tipoWebRules = ['required_if:is_web,true', 'nullable', 'string', Rule::in(Project::TIPO_WEB_SITES)];
        }

        return [
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'province' => ['nullable', 'string', 'max:255'],
            'district' => ['nullable', 'string', 'max:255'],
            'project_zone' => ['nullable', 'string', 'max:255'],
            'registry_status' => ['nullable', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string', 'max:10000'],
            'precio_web' => ['nullable', 'numeric', 'min:0'],
            'is_web' => ['nullable', 'boolean'],
            'tipo_web' => $tipoWebRules,
            'portada_file' => ['nullable', 'file', 'image', 'max:10240'],
            'remove_portada' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareProjectWebAndLocationForValidation(): void
    {
        $merge = [];

        if ($this->has('tipo_web') && $this->input('tipo_web') === '') {
            $merge['tipo_web'] = null;
        }

        if ($this->has('city_id') && $this->input('city_id') === '') {
            $merge['city_id'] = null;
        }

        foreach (['province', 'district', 'project_zone', 'registry_status', 'descripcion'] as $field) {
            if ($this->has($field) && $this->input($field) === '') {
                $merge[$field] = null;
            }
        }

        if ($this->has('precio_web') && $this->input('precio_web') === '') {
            $merge['precio_web'] = null;
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }
}
