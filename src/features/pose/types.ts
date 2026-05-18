
import { Vector3 } from "@common/types/vector"

export interface JointCoordinate {
    x: number;
    y: number;
    z: number;
    score?: number; // 관절 감지 신뢰도
}

export type Landmarks3D = Record<string, Vector3>;

export interface PoseFrameData {
    keypoints: Record<string, JointCoordinate | undefined>;
    // 기타 프레임 데이터 (예: timestamp, frame_id 등)
}

export interface AnalysisTool {
    calc(data: any, ...args: any[]): Record<string, any> | null | undefined;
}

export interface PoseDetectionResult {
    landmarks3d: Landmarks3D | null;
    landmarks2dList: (Landmarks3D | null)[];
    visibilityScoreList: (Record<string, number> | null)[];
}
