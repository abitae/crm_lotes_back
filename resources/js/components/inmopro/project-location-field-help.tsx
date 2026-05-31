import { Label } from '@/components/ui/label';

type ProjectLocationFieldHelpProps = {
    htmlFor: string;
    label?: string;
};

export function ProjectLocationFieldHelp({
    htmlFor,
    label = 'Coordenadas Google Maps',
}: ProjectLocationFieldHelpProps) {
    return (
        <>
            <Label htmlFor={htmlFor}>{label}</Label>
            <p className="mt-1 text-xs text-slate-500">
                Coordenadas del punto en el mapa: latitud,longitud (ej.
                -12.046374,-77.042793) o enlace de Google Maps. No es la ciudad
                ni el distrito del formulario administrativo.
            </p>
        </>
    );
}
