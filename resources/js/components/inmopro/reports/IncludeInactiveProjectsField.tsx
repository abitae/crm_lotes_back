type ProjectOption = {
    id: number;
    name: string;
    is_active?: boolean;
};

export function projectOptionLabel(project: ProjectOption): string {
    return project.is_active === false ? `${project.name} (Inactivo)` : project.name;
}

export function IncludeInactiveProjectsField({
    checked,
    id = 'include_inactive',
}: {
    checked?: boolean;
    id?: string;
}) {
    return (
        <label htmlFor={id} className="flex items-center gap-2 text-sm">
            <input type="hidden" name="include_inactive" value="0" />
            <input
                id={id}
                type="checkbox"
                name="include_inactive"
                value="1"
                defaultChecked={Boolean(checked)}
                className="size-4 rounded border-input"
            />
            <span>Incluir proyectos inactivos</span>
        </label>
    );
}
