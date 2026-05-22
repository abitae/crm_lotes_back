import Swal from 'sweetalert2';

/**
 * Confirma activar o desactivar un proyecto desde el listado o la ficha.
 */
export async function confirmToggleProjectActive(projectName: string, activating: boolean): Promise<boolean> {
    const result = await Swal.fire({
        title: activating ? '¿Activar proyecto?' : '¿Desactivar proyecto?',
        html: `<p style="margin:0;text-align:left;font-size:0.95rem;line-height:1.5;color:#475569">
            ${activating
                ? `El proyecto <strong>${escapeHtml(projectName)}</strong> volverá a mostrarse en el dashboard, apps y catálogos.`
                : `El proyecto <strong>${escapeHtml(projectName)}</strong> dejará de mostrarse en el dashboard, apps y catálogos. Los lotes y el historial se conservan.`}
        </p>`,
        icon: 'question',
        showCancelButton: true,
        focusCancel: true,
        confirmButtonColor: activating ? '#059669' : '#d97706',
        cancelButtonColor: '#64748b',
        confirmButtonText: activating ? 'Sí, activar' : 'Sí, desactivar',
        cancelButtonText: 'Cancelar',
    });

    return result.isConfirmed;
}

/**
 * Confirma activar o desactivar un vendedor desde el listado.
 */
export async function confirmToggleAdvisorActive(advisorName: string, activating: boolean): Promise<boolean> {
    const result = await Swal.fire({
        title: activating ? '¿Activar vendedor?' : '¿Desactivar vendedor?',
        html: `<p style="margin:0;text-align:left;font-size:0.95rem;line-height:1.5;color:#475569">
            ${activating
                ? `El vendedor <strong>${escapeHtml(advisorName)}</strong> volverá a aparecer en listados y podrá iniciar sesión en la app Cazador (si tiene acceso configurado).`
                : `El vendedor <strong>${escapeHtml(advisorName)}</strong> dejará de aparecer en listados activos y no podrá iniciar sesión en Cazador. Sus lotes y membresías se conservan.`}
        </p>`,
        icon: 'question',
        showCancelButton: true,
        focusCancel: true,
        confirmButtonColor: activating ? '#059669' : '#d97706',
        cancelButtonColor: '#64748b',
        confirmButtonText: activating ? 'Sí, activar' : 'Sí, desactivar',
        cancelButtonText: 'Cancelar',
    });

    return result.isConfirmed;
}

/**
 * Muestra un cuadro de confirmación para eliminar. Retorna true si el usuario confirma.
 */
export async function confirmDelete(title: string, text?: string): Promise<boolean> {
    const result = await Swal.fire({
        title,
        text: text ?? 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
    });
    return result.isConfirmed;
}

/**
 * Confirma marcar una comisión como pagada en liquidaciones Inmopro.
 */
export async function confirmCommissionMarkPaid(details: {
    advisorName: string;
    amountLabel: string;
    lotLabel: string;
    projectName: string;
}): Promise<boolean> {
    const result = await Swal.fire({
        title: '¿Marcar como pagado?',
        html: `<p style="margin:0;text-align:left;font-size:0.95rem;line-height:1.5;color:#475569">
            Vas a registrar el pago de la comisión de <strong>${escapeHtml(details.advisorName)}</strong>
            por <strong>${escapeHtml(details.amountLabel)}</strong>.<br/><br/>
            Lote <strong>${escapeHtml(details.lotLabel)}</strong> · ${escapeHtml(details.projectName)}
        </p>`,
        icon: 'question',
        showCancelButton: true,
        focusCancel: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, marcar pagado',
        cancelButtonText: 'Cancelar',
    });

    return result.isConfirmed;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function showSuccessToast(message: string): void {
    void Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: message,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
    });
}

export { Swal };
