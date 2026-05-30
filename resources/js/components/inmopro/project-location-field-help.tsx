import { Label } from '@/components/ui/label';

type ProjectLocationFieldHelpProps = {
    htmlFor: string;
    label?: string;
};

export function ProjectLocationFieldHelp({
    htmlFor,
    label = 'Ubicación del proyecto',
}: ProjectLocationFieldHelpProps) {
    return (
        <>
            <Label htmlFor={htmlFor}>{label}</Label>
            <p className="mt-1 text-xs text-slate-500">
                Use coordenadas en formato latitud,longitud, por ejemplo
                -12.046374,-77.042793, o pegue un enlace de Google Maps.
            </p>
        </>
    );
}
