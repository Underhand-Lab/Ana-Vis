export interface BatDetectedObject {
    bbox: [number, number, number, number];
    confidence: number;
    classId?: number; // Optional, as it's filtered by batClassId
    maskConfidenceMap: number[][]; // Specific to bat detection
}

export interface Point {
  x: number;
  y: number;
}

export interface Vertices {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export type ImageSource = HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | ImageBitmap | OffscreenCanvas;