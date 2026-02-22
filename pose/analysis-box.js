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

let processedData = null;

export function setData(data) {
    processedData = data;
    analysisBox.setData(data);
}

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

function saveToVideo(box, frameMaker) {
    const saveBtn = box.querySelector(".save");
    saveBtn.addEventListener('click', async () => {
        if (!processedData) return;

        const blob = await frameMakerDataToBlob(
            frameMaker, processedData);

        await saveBlobWithPicker(blob, "poseVideo.mp4", [{
            description: 'Video File',
            accept: {
                'video/mp4': ['.mp4']
            },
        }], true, "mp4");
    });
    
}

const MAKER_CONFIG = {
    "video": {
        src: "./template/video.html",
        btnId: "add-video-box-button",
        create: () => new PoseFrameMaker.PoseBoneFrameMaker(),
        bindUI: saveToVideo
    },
    "3d-video": {
        src: "./template/3d-video.html",
        btnId: "add-3d-video-box-button",
        create: () => new PoseFrameMaker.Pose3DFrameMaker()
    },
    "graph": {
        src: "./template/graph.html",
        btnId: "add-graph-box-button",
        create: () => new PoseFrameMaker.CustomGraphFrameMaker(analysisTool)
    },
    "table": {
        src: "./template/table.html",
        btnId: "add-table-box-button",
        create: () => new PoseFrameMaker.CustomTableFrameMaker(analysisTool)
    }
};

for (const [key, config] of Object.entries(MAKER_CONFIG))
{
    const btn = document.getElementById(config.btnId);
    if (!btn) break;

    await analysisBox.registerFrameMaker(key, config);
    btn.addEventListener('click', async () => {
        await analysisBox.addFrame(key);
        analysisSelect.closeAction();
    });
}

analysisBox.initDefault(["video", "graph"]);