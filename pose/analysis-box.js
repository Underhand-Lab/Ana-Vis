import * as PoseAnalysisTool from "../src/cv-val/pose/analysis-tool/index.js";
import * as PoseFrameMaker from '../src/cv-val/pose/frame-maker/index.js';
import { AnalysisBox } from "../src/cv-val/common/analysis-box.js";
import { frameMakerDataToBlob } from "../src/cv-val/common/frame-maker-export.js";
import { saveBlobWithPicker } from "../src/save-blob.js";

const analysisBox = new AnalysisBox();
analysisBox.bindUI(document);

const analysisSelect = document.getElementById('analysis');

const analysisTool = {
    "angle": new PoseAnalysisTool.AngleAnalysisTool(),
    "angle-velocity": new PoseAnalysisTool.AngleVelocityAnalysisTool(),
    "velocity": new PoseAnalysisTool.VelocityAnalysisTool(),
    "height": new PoseAnalysisTool.HeightAnalysisTool(),
};

const saveBtn = document.querySelector("#save-to-file");

saveBtn.addEventListener('click', async () => {
    if (!processedData) return;
    try {
        const blob = await processedData.toBlob();
        await saveBlobWithPicker(blob, "pose.cvp", [{
            description: 'Pose Data File',
            accept: { 'application/cvp': ['.cvp'] },
        }], true, ".cvp");
    }
    catch (error) {
        console.error(error);
    }
});

const MAKER_CONFIG = {
    "video": {
        src: "../template/pose-video.html",
        btnId: "add-video-box-button",
        create: () => new PoseFrameMaker.PoseBoneFrameMaker(),
        bindUI: (box, frameMaker) => {
            const saveBtn = box.querySelector(".save");
            saveBtn.addEventListener('click', async () => {
                if (!processedData) return;

                const blob = await frameMakerDataToBlob(
                    frameMaker, processedData);

                await saveBlobWithPicker(blob, "trackBallVideo.mp4", [{
                    description: 'Video File',
                    accept: {
                        'video/mp4': ['.mp4']
                    },
                }], true, "mp4");
            });

        }
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
        await analysisBox.addFrameMaker(
            config.src, config.create(), config.bindUI);
    }
}

initDefault(["video", "graph"]);

let processedData = null;

export function setData(data) {
    processedData = data;
    analysisBox.setData(data);
}