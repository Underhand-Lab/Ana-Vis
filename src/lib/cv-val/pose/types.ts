export type Vector3 = [number, number, number];

export type Landmarks3D = Record<string, Vector3>;

export interface AnalysisTool {
    calc(data: any, ...args: any[]): Record<string, any> | null | undefined;
}

export interface PoseData {
    getLandmarks3d: () => (Landmarks3D | null)[];
    analysisTools?: Record<string, AnalysisTool>;
}

export interface PoseDetectionResult {
    landmarks3d: Landmarks3D | null;
    landmarks2dList: (Landmarks3D | null)[];
    visibilityScoreList: (Record<string, number> | null)[];
}