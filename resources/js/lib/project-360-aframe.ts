type AFrameComponentRegistry = {
    components: Record<string, unknown>;
    registerComponent: (
        name: string,
        definition: Record<string, unknown>,
    ) => void;
};

type PlacementComponent = {
    el: HTMLElement;
    moved: boolean;
    startX: number;
    startY: number;
    onPointerDown: (event: PointerEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onClick: (event: Event) => void;
};

type InteractionComponent = {
    el: HTMLElement;
    originalColor: string;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
};

export function registerProject360Components(
    aframe: AFrameComponentRegistry,
): void {
    if (!aframe.components['tour-placement-surface']) {
        aframe.registerComponent('tour-placement-surface', {
            init(this: PlacementComponent) {
                this.moved = false;
                this.startX = 0;
                this.startY = 0;
                this.onPointerDown = (event: PointerEvent) => {
                    this.startX = event.clientX;
                    this.startY = event.clientY;
                    this.moved = false;
                };
                this.onPointerMove = (event: PointerEvent) => {
                    if (
                        Math.hypot(
                            event.clientX - this.startX,
                            event.clientY - this.startY,
                        ) > 7
                    ) {
                        this.moved = true;
                    }
                };
                this.onClick = (event: Event) => {
                    if (this.moved) {
                        return;
                    }

                    const detail = (
                        event as CustomEvent<{
                            intersection?: { point?: Project360Point };
                        }>
                    ).detail;

                    if (detail?.intersection?.point) {
                        this.el.dispatchEvent(
                            new CustomEvent('tour-placement-selected', {
                                bubbles: true,
                                detail: detail.intersection.point,
                            }),
                        );
                    }
                };
                const canvas = this.el
                    .closest('a-scene')
                    ?.querySelector('canvas');
                canvas?.addEventListener('pointerdown', this.onPointerDown);
                canvas?.addEventListener('pointermove', this.onPointerMove);
                this.el.addEventListener('click', this.onClick);
            },
            remove(this: PlacementComponent) {
                const canvas = this.el
                    .closest('a-scene')
                    ?.querySelector('canvas');
                canvas?.removeEventListener('pointerdown', this.onPointerDown);
                canvas?.removeEventListener('pointermove', this.onPointerMove);
                this.el.removeEventListener('click', this.onClick);
            },
        });
    }

    if (!aframe.components['tour-hotspot-interaction']) {
        aframe.registerComponent('tour-hotspot-interaction', {
            init(this: InteractionComponent) {
                this.originalColor =
                    this.el.dataset.color ??
                    this.el.getAttribute('color') ??
                    '#f97316';
                this.onMouseEnter = () => {
                    this.el.setAttribute(
                        'material',
                        `color: ${this.el.dataset.hoverColor ?? this.originalColor}; shader: flat`,
                    );
                    const label = this.el.querySelector<HTMLElement>(
                        '.tour-hotspot-label',
                    );
                    if (label?.dataset.visibility === 'hover') {
                        label.setAttribute('visible', 'true');
                    }
                };
                this.onMouseLeave = () => {
                    this.el.setAttribute(
                        'material',
                        `color: ${this.originalColor}; shader: flat`,
                    );
                    const label = this.el.querySelector<HTMLElement>(
                        '.tour-hotspot-label',
                    );
                    if (label?.dataset.visibility === 'hover') {
                        label.setAttribute('visible', 'false');
                    }
                };
                this.el.addEventListener('mouseenter', this.onMouseEnter);
                this.el.addEventListener('mouseleave', this.onMouseLeave);
            },
            remove(this: InteractionComponent) {
                this.el.removeEventListener('mouseenter', this.onMouseEnter);
                this.el.removeEventListener('mouseleave', this.onMouseLeave);
            },
        });
    }
}

type Project360Point = {
    x: number;
    y: number;
    z: number;
};
