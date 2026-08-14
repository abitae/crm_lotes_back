import type { HTMLAttributes } from 'react';

type AFrameElementProps = HTMLAttributes<HTMLElement> & Record<string, unknown>;

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'a-assets': AFrameElementProps;
            'a-camera': AFrameElementProps;
            'a-circle': AFrameElementProps;
            'a-cone': AFrameElementProps;
            'a-cursor': AFrameElementProps;
            'a-entity': AFrameElementProps;
            'a-image': AFrameElementProps;
            'a-plane': AFrameElementProps;
            'a-ring': AFrameElementProps;
            'a-scene': AFrameElementProps;
            'a-sky': AFrameElementProps;
            'a-sphere': AFrameElementProps;
            'a-text': AFrameElementProps;
            'a-triangle': AFrameElementProps;
        }
    }
}
