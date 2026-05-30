import { Label } from '@/components/ui/label';

type ProjectLocationFieldHelpProps = {
    htmlFor: string;
    label?: string;
};

export function ProjectLocationFieldHelp({ htmlFor, label = 'Enlace de Google Maps' }: ProjectLocationFieldHelpProps) {
    return (
        <>
            <Label htmlFor={htmlFor}>{label}</Label>
            <p className="mt-1 text-xs text-slate-500">
                Pegue el enlace compartido desde Google Maps. Prefiera enlaces cortos como maps.app.goo.gl.
            </p>
        </>
    );
}
