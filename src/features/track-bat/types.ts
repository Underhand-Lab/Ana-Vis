export interface BatDetectedObject {
    bbox: [number, number, number, number];
    confidence: number;
    classId?: number; // Optional, as it's filtered by batClassId
    maskConfidenceMap: number[][]; // Specific to bat detection
}

export type ImageSource = HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | ImageBitmap | OffscreenCanvas;