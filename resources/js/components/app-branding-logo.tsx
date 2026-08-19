import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';

type SharedBranding = {
    brandingLogoUrl?: string | null;
};

type Props = {
    iconClassName?: string;
    imageClassName?: string;
};

/**
 * Muestra el logotipo personalizado si existe; si no, el icono SVG por defecto.
 */
export default function AppBrandingLogo({ iconClassName, imageClassName }: Props) {
    const { brandingLogoUrl } = usePage<SharedBranding>().props;
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [brandingLogoUrl]);

    if (brandingLogoUrl && !failed) {
        return (
            <img
                src={brandingLogoUrl}
                alt=""
                className={imageClassName}
                onError={() => setFailed(true)}
            />
        );
    }

    return <AppLogoIcon className={iconClassName} />;
}
