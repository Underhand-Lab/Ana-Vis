export interface DetectedObject {
    bbox: [number, number, number, number];
    confidence: number;
    classId: number;
}


export interface BallFrameData {
    selectedIdx: number;
    candidates: DetectedObject[];
}

export interface AnalysisTool {
    calc(data: any, ...args: any[]): Record<string, any> | null | undefined;
}