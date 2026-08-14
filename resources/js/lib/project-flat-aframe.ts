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
};

type FlatVertex = { x: number; y: number };

export function registerProjectFlatComponents(
    aframe: AFrameComponentRegistry,
): void {
    if (aframe.components['flat-polygon-mesh']) {
        return;
    }

    const { THREE } = aframe;

    aframe.registerComponent('flat-polygon-mesh', {
        schema: {
            vertices: { default: '[]' },
            color: { default: '#f97316' },
            hoverColor: { default: '#fb923c' },
            opacity: { default: 0.35, type: 'number' },
            selected: { default: false, type: 'boolean' },
        },
        init(this: PolygonComponent) {
            this.geometries = [];
            this.hovered = false;
        },
        update(this: PolygonComponent) {
            this.build();
        },
        build(this: PolygonComponent) {
            this.disposeMesh();

            let vertices: FlatVertex[] = [];

            try {
                vertices = JSON.parse(this.data.vertices) as FlatVertex[];
            } catch {
                return;
            }

            if (vertices.length < 3) {
                return;
            }

            const contour = vertices.map(
                (vertex) => new THREE.Vector2(vertex.x, vertex.y),
            );
            const faces = THREE.ShapeUtils.triangulateShape(contour, []);
            const fillPositions = faces.flatMap((face) =>
                face.flatMap((index) => {
                    const vertex = vertices[index];

                    return [vertex.x, vertex.y, 0.02];
                }),
            );
            const outlinePositions = vertices.flatMap((vertex) => [
                vertex.x,
                vertex.y,
                0.04,
            ]);
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
                depthTest: false,
                depthWrite: false,
                opacity: this.data.opacity,
                side: THREE.DoubleSide,
                transparent: true,
            });
            this.lineMaterial = new THREE.LineBasicMaterial({
                color: this.data.color,
                depthTest: false,
                depthWrite: false,
                opacity: Math.min(1, this.data.opacity + 0.5),
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
            this.disposeMesh();
        },
    });
}
