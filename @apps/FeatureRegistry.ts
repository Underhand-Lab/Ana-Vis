import { IAnalysisTool } from '@packages/cv-val/data/cvval-types';
import { AnalysisModule } from '@cv-val/types/analysis-module';
import { VideoModuleBuilder } from '@cv-val/modules/VideoModule';
import GraphModule from '@cv-val/modules/GraphModule';
import TableModule from '@cv-val/modules/TableModule';
import createEditorModule from '@packages/cv-val/modules/EditorModule';

// Pose 관련
import { PoseData } from '@apps/features/pose/core/pose-data';
import * as PoseDetector from '@apps/features/pose/core/pose-detector';
import * as PoseAnalysisTool from "@apps/features/pose/tool";
import Pose3DVideoModule from '@apps/features/pose/modules/Pose3DVideoModule';
import { PoseVideoPlugin } from '@apps/features/pose/video-plugin/PoseVideoPlugin';
import { GRFVideoPlugin } from '@apps/features/pose/video-plugin/GRFVideoPlugin';

// Ball 관련
import { TrackBallData } from "@apps/features/track-ball/data/track-ball-data";
import * as BallDetector from '@apps/features/track-ball/detector';
import * as BallAnalysis from "@apps/features/track-ball/video-tool/analysis";
import { TrackBallVideoPlugin } from '@apps/features/track-ball/plugin/TrackBallVideoPlugin';

// Bat 관련
import { TrackBatData } from "@apps/features/track-bat/data/track-bat-data";
import * as BatDetector from '@apps/features/track-bat/detector';
import * as BatAnalysis from "@apps/features/track-bat/video-tool/analysis";
import { TrackBatVideoPlugin } from '@apps/features/track-bat/video-plugin/TrackBatVideoPlugin';
import { TrackBallEditorPlugin } from '@apps/features/track-ball/editor-plugin/TrackBallEditorPlugin';
import { TrackBatEditorPlugin } from '@apps/features/track-bat/editor-plugin/TrackBatEditorPlugin';

export interface FeatureConfig {
    label: string;
    extension: string;
    description: string;
    DataClass: any;
    detectors: Record<string, any>;
    tools: IAnalysisTool[];
    hasEditor: boolean;
    defaultConf?: number;
}

export const FEATURE_REGISTRY: Record<string, FeatureConfig> = {
    pose: {
        label: '자세 분석',
        extension: '.cvp',
        description: 'Pose Data File',
        DataClass: PoseData,
        detectors: {
            "MP Heavy": new PoseDetector.MediaPipePoseDetector("./external/models/mediapipe/pose_landmarker_heavy.task"),
            "MP Full": new PoseDetector.MediaPipePoseDetector("./external/models/mediapipe/pose_landmarker_full.task"),
            "MP Lite": new PoseDetector.MediaPipePoseDetector("./external/models/mediapipe/pose_landmarker_lite.task"),
        },
        tools: [
            new PoseAnalysisTool.AngleAnalysisTool(),
            new PoseAnalysisTool.AngleVelocityAnalysisTool(),
            new PoseAnalysisTool.VelocityAnalysisTool(),
            new PoseAnalysisTool.HeightAnalysisTool(),
            new PoseAnalysisTool.GRFAnalysisTool(),
        ],
        hasEditor: false,
    },
    ball: {
        label: '공 추적',
        extension: '.cvbl',
        description: 'Track Ball Data File',
        DataClass: TrackBallData,
        detectors: {
            "YOLO11x Ball": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11x_web_model/model.json", 32),
            "YOLO11l Ball": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11l_web_model/model.json", 32),
            "YOLO11m Ball": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11m_web_model/model.json", 32),
            "YOLO11n Ball": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11n_web_model/model.json", 32),
            "YOLO11s Ball": new BallDetector.YOLOBallDetector("./external/models/yolo11/yolo11s_web_model/model.json", 32),
        },
        tools: [new BallAnalysis.BallAnalysisTool()],
        hasEditor: true,
    },
    bat: {
        label: '배트 추적',
        extension: '.cvbt',
        description: 'Track Bat Data File',
        DataClass: TrackBatData,
        detectors: {
            "YOLO11x Bat": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11x-seg_web_model/model.json", 34),
            "YOLO11l Bat": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11l-seg_web_model/model.json", 34),
            "YOLO11m Bat": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11m-seg_web_model/model.json", 34),
            "YOLO11n Bat": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11n-seg_web_model/model.json", 34),
            "YOLO11s Bat": new BatDetector.YOLOBatDetector("./external/models/yolo11/yolo11s-seg_web_model/model.json", 34),
        },
        tools: [new BatAnalysis.BatAnalysisTool()],
        hasEditor: true,
    }
};

export const ALL_DETECTORS = Object.entries(FEATURE_REGISTRY).reduce((acc, [key, cfg]) => {
    acc[key] = cfg.detectors;
    return acc;
}, {} as Record<string, any>);

const UNIVERSAL_VIDEO_MODULE = new VideoModuleBuilder()
    .addPlugin(new PoseVideoPlugin())
    .addPlugin(new GRFVideoPlugin())
    .addPlugin(new TrackBallVideoPlugin())
    .addPlugin(new TrackBatVideoPlugin())
    .build();

const EDIT_TRACK_BALL_MODULE = createEditorModule([new TrackBallVideoPlugin()], [TrackBallEditorPlugin], 'edit-track-ball', 'edit-track-ball');
const EDIT_TRACK_BAT_MODULE = createEditorModule([new TrackBatVideoPlugin()], [TrackBatEditorPlugin], 'edit-track-bat', 'edit-track-bat');

export const ALL_AVAILABLE_MODULES: Record<string, AnalysisModule<any>> = {
    "Video": UNIVERSAL_VIDEO_MODULE,
    "Pose 3D": Pose3DVideoModule, // Pose 3D는 Pose 데이터가 있을 때만 유의미하지만, 모듈 자체는 항상 사용 가능
    "Graph": GraphModule,
    "Table": TableModule,
    "EditTrackBall": EDIT_TRACK_BALL_MODULE,
    "EditTrackBat": EDIT_TRACK_BAT_MODULE,
};
