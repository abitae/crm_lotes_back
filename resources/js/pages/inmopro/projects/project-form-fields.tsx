import { useMemo } from 'react';
import InputError from '@/components/input-error';
import { ProjectLocationFieldHelp } from '@/components/inmopro/project-location-field-help';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const TIPO_WEB_SITES = [
    'lotesenremate.pe',
    'inviertexpress.pe',
] as const;

export type CityOption = {
    id: number;
    name: string;
    code: string;
    department: string | null;
};

type AdministrativeLocationFieldsProps = {
    cities: CityOption[];
    cityId: number | '';
    province: string;
    district: string;
    projectZone: string;
    registryStatus: string;
    errors: Record<string, string | undefined>;
    onCityIdChange: (value: number | '') => void;
    onProvinceChange: (value: string) => void;
    onDistrictChange: (value: string) => void;
    onProjectZoneChange: (value: string) => void;
    onRegistryStatusChange: (value: string) => void;
};

export function ProjectAdministrativeLocationFields({
    cities,
    cityId,
    province,
    district,
    projectZone,
    registryStatus,
    errors,
    onCityIdChange,
    onProvinceChange,
    onDistrictChange,
    onProjectZoneChange,
    onRegistryStatusChange,
}: AdministrativeLocationFieldsProps) {
    const selectedCity = useMemo(
        () => cities.find((city) => city.id === cityId) ?? null,
        [cities, cityId],
    );

    return (
        <>
            <div className="border-t border-slate-200 pt-4">
                <h3 className="mb-3 text-sm font-bold text-slate-700">
                    Ubicación administrativa
                </h3>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="city_id">Ciudad</Label>
                        <select
                            id="city_id"
                            value={cityId === '' ? '' : String(cityId)}
                            onChange={(e) =>
                                onCityIdChange(
                                    e.target.value === ''
                                        ? ''
                                        : Number(e.target.value),
                                )
                            }
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                        >
                            <option value="">Sin ciudad</option>
                            {cities.map((city) => (
                                <option key={city.id} value={city.id}>
                                    {city.name}
                                    {city.department
                                        ? ` · ${city.department}`
                                        : ''}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.city_id} />
                    </div>
                    <div>
                        <Label htmlFor="department_display">
                            Departamento
                        </Label>
                        <Input
                            id="department_display"
                            type="text"
                            readOnly
                            value={selectedCity?.department ?? ''}
                            placeholder="Selecciona una ciudad"
                            className="mt-1 bg-slate-50"
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="province">Provincia</Label>
                            <Input
                                id="province"
                                type="text"
                                value={province}
                                onChange={(e) =>
                                    onProvinceChange(e.target.value)
                                }
                                className="mt-1"
                            />
                            <InputError message={errors.province} />
                        </div>
                        <div>
                            <Label htmlFor="district">Distrito</Label>
                            <Input
                                id="district"
                                type="text"
                                value={district}
                                onChange={(e) =>
                                    onDistrictChange(e.target.value)
                                }
                                className="mt-1"
                            />
                            <InputError message={errors.district} />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="project_zone">
                                Zona de proyecto
                            </Label>
                            <Input
                                id="project_zone"
                                type="text"
                                value={projectZone}
                                onChange={(e) =>
                                    onProjectZoneChange(e.target.value)
                                }
                                className="mt-1"
                            />
                            <InputError message={errors.project_zone} />
                        </div>
                        <div>
                            <Label htmlFor="registry_status">
                                Estado registral
                            </Label>
                            <Input
                                id="registry_status"
                                type="text"
                                value={registryStatus}
                                onChange={(e) =>
                                    onRegistryStatusChange(e.target.value)
                                }
                                className="mt-1"
                            />
                            <InputError message={errors.registry_status} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

type GoogleMapsCoordinatesFieldProps = {
    location: string;
    errors: Record<string, string | undefined>;
    onLocationChange: (value: string) => void;
};

export function ProjectGoogleMapsCoordinatesField({
    location,
    errors,
    onLocationChange,
}: GoogleMapsCoordinatesFieldProps) {
    return (
        <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">
                Coordenadas en mapa
            </h3>
            <ProjectLocationFieldHelp htmlFor="location" />
            <Input
                id="location"
                type="text"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                placeholder="-12.046374,-77.042793"
                className="mt-1"
            />
            <InputError message={errors.location} />
        </div>
    );
}

const textareaClass =
    'mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm';

type WebPublicationFieldsProps = {
    isWeb: boolean;
    tipoWeb: string;
    descripcion: string;
    precioWeb: string | number;
    imagePortada: string | null;
    portadaFile: File | null;
    removePortada: boolean;
    errors: Record<string, string | undefined>;
    onIsWebChange: (value: boolean) => void;
    onTipoWebChange: (value: string) => void;
    onDescripcionChange: (value: string) => void;
    onPrecioWebChange: (value: string | number) => void;
    onPortadaFileChange: (file: File | null) => void;
    onRemovePortadaChange: (value: boolean) => void;
};

export function ProjectWebPublicationFields({
    isWeb,
    tipoWeb,
    descripcion,
    precioWeb,
    imagePortada,
    portadaFile,
    removePortada,
    errors,
    onIsWebChange,
    onTipoWebChange,
    onDescripcionChange,
    onPrecioWebChange,
    onPortadaFileChange,
    onRemovePortadaChange,
}: WebPublicationFieldsProps) {
    const showCurrentPortada =
        imagePortada && !removePortada && !portadaFile;

    return (
        <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">
                Publicación web
            </h3>
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <input
                        id="is_web"
                        type="checkbox"
                        checked={isWeb}
                        onChange={(e) => onIsWebChange(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                    />
                    <Label htmlFor="is_web" className="cursor-pointer">
                        Visible en sitio web
                    </Label>
                </div>
                <InputError message={errors.is_web} />
                <div>
                    <Label htmlFor="descripcion">Descripción (web)</Label>
                    <textarea
                        id="descripcion"
                        value={descripcion}
                        onChange={(e) => onDescripcionChange(e.target.value)}
                        rows={4}
                        className={textareaClass}
                        placeholder="Texto promocional para el catálogo web"
                    />
                    <InputError message={errors.descripcion} />
                </div>
                <div>
                    <Label htmlFor="precio_web">Precio web (S/)</Label>
                    <Input
                        id="precio_web"
                        type="number"
                        min={0}
                        step="0.01"
                        value={precioWeb}
                        onChange={(e) =>
                            onPrecioWebChange(
                                e.target.value === '' ? '' : e.target.value,
                            )
                        }
                        className="mt-1"
                        placeholder="Ej. 45000"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Precio de referencia mostrado en el sitio web (opcional).
                    </p>
                    <InputError message={errors.precio_web} />
                </div>
                {isWeb && (
                    <div>
                        <Label htmlFor="tipo_web">Sitio web destino</Label>
                        <select
                            id="tipo_web"
                            value={tipoWeb}
                            onChange={(e) => onTipoWebChange(e.target.value)}
                            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                            required
                        >
                            <option value="">Selecciona un sitio</option>
                            {TIPO_WEB_SITES.map((site) => (
                                <option key={site} value={site}>
                                    {site}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.tipo_web} />
                    </div>
                )}
                <div>
                    <Label htmlFor="portada_file">Imagen de portada</Label>
                    {showCurrentPortada && (
                        <div className="mt-2 mb-2">
                            <img
                                src={imagePortada}
                                alt="Portada actual"
                                className="max-h-40 rounded-lg border border-slate-200 object-cover"
                            />
                        </div>
                    )}
                    <Input
                        id="portada_file"
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            onPortadaFileChange(e.target.files?.[0] ?? null)
                        }
                        className="mt-1"
                    />
                    <InputError
                        message={
                            errors.portada_file || errors['portada_file']
                        }
                    />
                    {imagePortada && (
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                id="remove_portada"
                                type="checkbox"
                                checked={removePortada}
                                onChange={(e) =>
                                    onRemovePortadaChange(e.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-300"
                            />
                            <Label
                                htmlFor="remove_portada"
                                className="cursor-pointer text-sm"
                            >
                                Quitar portada actual
                            </Label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
