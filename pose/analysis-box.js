import * as PoseAnalysisTool from "../src/cv-val/pose/analysis-tool/index.js";
import * as PoseFrameMaker from '../src/cv-val/pose/frame-maker/index.js';
import { AnalysisBox } from "../src/cv-val/common/analysis-box.js";

const analysisBox = new AnalysisBox();
analysisBox.bindUI(document);

const analysisSelect = document.getElementById('analysis');

const analysisTool = {
    "angle": new PoseAnalysisTool.AngleAnalysisTool(),
    "angle-velocity": new PoseAnalysisTool.AngleVelocityAnalysisTool(),
    "velocity": new PoseAnalysisTool.VelocityAnalysisTool(),
    "height": new PoseAnalysisTool.HeightAnalysisTool(),
};

const MAKER_CONFIG = {
    "video": {
        src: "../template/pose-video.html",
        btnId: "add-video-box-button",
        create: () => new PoseFrameMaker.PoseBoneFrameMaker()
    },
    "3d-video": {
        src: "../template/3d-video.html",
        btnId: "add-3d-video-box-button",
        create: () => new PoseFrameMaker.Pose3DFrameMaker()
    },
    "graph": {
        src: "../template/graph.html",
        btnId: "add-graph-box-button",
        create: () => new PoseFrameMaker.CustomGraphFrameMaker(analysisTool)
    },
    "table": {
        src: "../template/table-pose.html",
        btnId: "add-table-box-button",
        create: () => new PoseFrameMaker.CustomTableFrameMaker(analysisTool)
    }
};

Object.entries(MAKER_CONFIG).forEach(([key, config]) => {
    const btn = document.getElementById(config.btnId);
    if (!btn) return;

    btn.addEventListener('click', async () => {
        await analysisBox.addFrameMaker(config.src, config.create());
        analysisSelect.closeAction();
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
});

async function initDefault(keys) {
    for (const key of keys) {
        const config = MAKER_CONFIG[key];
        await analysisBox.addFrameMaker(config.src, config.create());
    }
}

initDefault(["video", "graph"]);

export const setData = (data) => analysisBox.setData(data);