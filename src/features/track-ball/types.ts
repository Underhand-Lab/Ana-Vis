export interface DetectedObject {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    label?: string;
}

export interface BallFrameData {
    selectedIdx: number;
    candidates: DetectedObject[];
}

export interface AnalysisTool {
    calc(data: any, ...args: any[]): Record<string, any> | null | undefined;
}