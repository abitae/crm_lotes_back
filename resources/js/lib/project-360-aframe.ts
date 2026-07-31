import {
    anglesToPoint,
    unwrapPolygonVertices,
    type Project360Angles,
    type Project360Point,
} from '@/lib/project-360-geometry';

type Disposable = { dispose: () => void };
type ColorValue = { set: (value: string) => void };
type PolygonMaterial = Disposable & {
    color: ColorValue;
    opacity: number;
};
type PolygonGeometry = Disposable & {
    computeBoundingSphere: () => void;
    computeVertexNormals: () => void;
    setAttribute: (name: string, attribute: unknown) => void;
};
type ThreeObject = {
    add: (...objects: ThreeObject[]) => void;
    renderOrder: number;
};
type ThreeApi = {
    BufferGeometry: new () => PolygonGeometry;
    DoubleSide: number;
    Float32BufferAttribute: new (values: number[], itemSize: number) => unknown;
    Group: new () => ThreeObject;
    LineBasicMaterial: new (
        options: Record<string, unknown>,
    ) => PolygonMaterial;
    LineLoop: new (
        geometry: PolygonGeometry,
        material: PolygonMaterial,
    ) => ThreeObject;
    Mesh: new (
        geometry: PolygonGeometry,
        material: PolygonMaterial,
    ) => ThreeObject;
    MeshBasicMaterial: new (
        options: Record<string, unknown>,
    ) => PolygonMaterial;
    ShapeUtils: {
        triangulateShape: (
            contour: unknown[],
            holes: unknown[][],
        ) => number[][];
    };
    Vector2: new (x: number, y: number) => unknown;
};

type AFrameEntity = HTMLElement & {
    getObject3D: (name: string) => ThreeObject | undefined;
    removeObject3D: (name: string) => void;
    setObject3D: (name: string, object: ThreeObject) => void;
};

type AFrameComponentRegistry = {
    THREE: ThreeApi;
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
    el: HTMLElement & { emit: (eventName: string) => void };
    originalColor: string;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onMouseDown: () => void;
    onMouseUp: () => void;
};

type PolygonComponentData = {
    vertices: string;
    color: string;
    hoverColor: string;
    opacity: number;
    selected: boolean;
};

type PolygonComponent = {
    el: AFrameEntity;
    data: PolygonComponentData;
    fillMaterial?: PolygonMaterial;
    lineMaterial?: PolygonMaterial;
    geometries: PolygonGeometry[];
    hovered: boolean;
    build: () => void;
    disposeMesh: () => void;
    refreshStyle: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
};

export function registerProject360Components(
    aframe: AFrameComponentRegistry,
): void {
    registerPlacementComponent(aframe);
    registerHotspotInteractionComponent(aframe);
    registerPolygonComponent(aframe);
}

function registerPlacementComponent(aframe: AFrameComponentRegistry): void {
    if (aframe.components['tour-placement-surface']) {
        return;
    }

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
            const canvas = this.el.closest('a-scene')?.querySelector('canvas');
            canvas?.addEventListener('pointerdown', this.onPointerDown);
            canvas?.addEventListener('pointermove', this.onPointerMove);
            this.el.addEventListener('click', this.onClick);
        },
        remove(this: PlacementComponent) {
            const canvas = this.el.closest('a-scene')?.querySelector('canvas');
            canvas?.removeEventListener('pointerdown', this.onPointerDown);
            canvas?.removeEventListener('pointermove', this.onPointerMove);
            this.el.removeEventListener('click', this.onClick);
        },
    });
}

function registerHotspotInteractionComponent(
    aframe: AFrameComponentRegistry,
): void {
    if (aframe.components['tour-hotspot-interaction']) {
        return;
    }

    aframe.registerComponent('tour-hotspot-interaction', {
        init(this: InteractionComponent) {
            this.originalColor = this.el.dataset.color ?? '#f97316';
            this.onMouseEnter = () => {
                this.el
                    .querySelectorAll<HTMLElement>('.tour-hotspot-core')
                    .forEach((element) =>
                        element.setAttribute(
                            'material',
                            `color: ${this.el.dataset.hoverColor ?? this.originalColor}; shader: flat`,
                        ),
                    );
                this.el.emit('tour-hover-start');
                const label = this.el.querySelector<HTMLElement>(
                    '.tour-hotspot-label',
                );
                if (label?.dataset.visibility === 'hover') {
                    label.setAttribute('visible', 'true');
                }
            };
            this.onMouseLeave = () => {
                this.el
                    .querySelectorAll<HTMLElement>('.tour-hotspot-core')
                    .forEach((element) =>
                        element.setAttribute(
                            'material',
                            `color: ${this.originalColor}; shader: flat`,
                        ),
                    );
                this.el.emit('tour-hover-end');
                const label = this.el.querySelector<HTMLElement>(
                    '.tour-hotspot-label',
                );
                if (label?.dataset.visibility === 'hover') {
                    label.setAttribute('visible', 'false');
                }
            };
            this.onMouseDown = () => this.el.emit('tour-press-start');
            this.onMouseUp = () => this.el.emit('tour-press-end');
            this.el.addEventListener('mouseenter', this.onMouseEnter);
            this.el.addEventListener('mouseleave', this.onMouseLeave);
            this.el.addEventListener('mousedown', this.onMouseDown);
            this.el.addEventListener('mouseup', this.onMouseUp);
        },
        remove(this: InteractionComponent) {
            this.el.removeEventListener('mouseenter', this.onMouseEnter);
            this.el.removeEventListener('mouseleave', this.onMouseLeave);
            this.el.removeEventListener('mousedown', this.onMouseDown);
            this.el.removeEventListener('mouseup', this.onMouseUp);
        },
    });
}

function registerPolygonComponent(aframe: AFrameComponentRegistry): void {
    if (aframe.components['tour-polygon-mesh']) {
        return;
    }

    const { THREE } = aframe;

    aframe.registerComponent('tour-polygon-mesh', {
        schema: {
            vertices: { default: '[]' },
            color: { default: '#f97316' },
            hoverColor: { default: '#fb923c' },
            opacity: { default: 0.28, type: 'number' },
            selected: { default: false, type: 'boolean' },
        },
        init(this: PolygonComponent) {
            this.geometries = [];
            this.hovered = false;
            this.onMouseEnter = () => {
                this.hovered = true;
                this.refreshStyle();
            };
            this.onMouseLeave = () => {
                this.hovered = false;
                this.refreshStyle();
            };
            this.el.addEventListener('mouseenter', this.onMouseEnter);
            this.el.addEventListener('mouseleave', this.onMouseLeave);
        },
        update(this: PolygonComponent) {
            this.build();
        },
        build(this: PolygonComponent) {
            this.disposeMesh();

            let vertices: Project360Angles[] = [];
            try {
                vertices = JSON.parse(this.data.vertices) as Project360Angles[];
            } catch {
                return;
            }

            if (vertices.length < 3) {
                return;
            }

            const unwrapped = unwrapPolygonVertices(vertices);
            const contour = unwrapped.map(
                (vertex) => new THREE.Vector2(vertex.yaw, vertex.pitch),
            );
            const faces = THREE.ShapeUtils.triangulateShape(contour, []);
            const fillPositions = faces.flatMap((face) =>
                face.flatMap((index) => {
                    const vertex = unwrapped[index];
                    const point = anglesToPoint(vertex.yaw, vertex.pitch, 3.98);

                    return [point.x, point.y, point.z];
                }),
            );
            const outlinePositions = unwrapped.flatMap((vertex) => {
                const point = anglesToPoint(vertex.yaw, vertex.pitch, 3.94);

                return [point.x, point.y, point.z];
            });
            const fillGeometry = new THREE.BufferGeometry();
            fillGeometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(fillPositions, 3),
            );
            fillGeometry.computeVertexNormals();
            fillGeometry.computeBoundingSphere();
            const outlineGeometry = new THREE.BufferGeometry();
            outlineGeometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(outlinePositions, 3),
            );
            outlineGeometry.computeBoundingSphere();
            this.geometries = [fillGeometry, outlineGeometry];
            this.fillMaterial = new THREE.MeshBasicMaterial({
                color: this.data.color,
                depthWrite: false,
                opacity: this.data.opacity,
                side: THREE.DoubleSide,
                transparent: true,
            });
            this.lineMaterial = new THREE.LineBasicMaterial({
                color: this.data.color,
                depthWrite: false,
                opacity: Math.min(1, this.data.opacity + 0.55),
                transparent: true,
            });
            const fill = new THREE.Mesh(fillGeometry, this.fillMaterial);
            const outline = new THREE.LineLoop(
                outlineGeometry,
                this.lineMaterial,
            );
            fill.renderOrder = 20;
            outline.renderOrder = 21;
            const group = new THREE.Group();
            group.add(fill, outline);
            this.el.setObject3D('mesh', group);
            this.refreshStyle();
        },
        refreshStyle(this: PolygonComponent) {
            const highlighted = this.hovered || this.data.selected;
            const color = highlighted ? this.data.hoverColor : this.data.color;
            this.fillMaterial?.color.set(color);
            this.lineMaterial?.color.set(color);

            if (this.fillMaterial) {
                this.fillMaterial.opacity = Math.min(
                    0.85,
                    this.data.opacity + (highlighted ? 0.22 : 0),
                );
            }
        },
        disposeMesh(this: PolygonComponent) {
            this.el.removeObject3D('mesh');
            this.geometries.forEach((geometry) => geometry.dispose());
            this.geometries = [];
            this.fillMaterial?.dispose();
            this.lineMaterial?.dispose();
            this.fillMaterial = undefined;
            this.lineMaterial = undefined;
        },
        remove(this: PolygonComponent) {
            this.el.removeEventListener('mouseenter', this.onMouseEnter);
            this.el.removeEventListener('mouseleave', this.onMouseLeave);
            this.disposeMesh();
        },
    });
}
