export interface DetectedObject {
    bbox: [number, number, number, number];
    confidence: number;
    classId: number;
    x: number;
    y: number;
    width: number;
    height: number;
}


export interface BallFrameData {
    selectedIdx: number;
    candidates: DetectedObject[];
}

export interface AnalysisTool {
    calc(data: any, ...args: any[]): Record<string, any> | null | undefined;
}