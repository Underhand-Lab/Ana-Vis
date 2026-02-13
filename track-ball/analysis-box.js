import * as FrameMaker from '../src/cv-val/track-ball/frame-maker/index.js';
import * as Analysis from "../src/cv-val/track-ball/calc/analysis.js";
import { AnalysisBox } from "../src/cv-val/common/analysis-box.js";
import { frameMakerDataToBlob } from "../src/cv-val/common/frame-maker-export.js";
import { saveBlobWithPicker } from "../src/save-blob.js";

const analysisBox = new AnalysisBox();
analysisBox.bindUI(document, {
    onUpdate: (frameIdx) => updateCandidateUI(frameIdx)
});

const analysisSelect = document.getElementById('analysis');
const candidateSelect = document.getElementById('candidateSelect');
const confInput = document.getElementById('confInput');

const saveBtn = document.querySelector("#save-to-file");

saveBtn.addEventListener('click', async () => {
    if (!processedData) return;
    try {
        const blob = await processedData.toBlob();
        await saveBlobWithPicker(blob, "trackBall.cvbl", [{
            description: 'Track Ball Data File',
            accept: { 'application/cvbl': ['.cvbl'] },
        }], true, "cvbl");
    }
    catch (error) {
        console.error(error);
    }
});

function updateCandidateUI(frameIdx) {
    if (!processedData) return;

    const candidates = processedData.getCandidatesAt(frameIdx);
    const frameData = processedData.getBallList()[frameIdx];
    const currentSelected = frameData ? frameData.selectedIdx : -1;

    candidateSelect.innerHTML = '<option value="-1">none</option>';
    if (candidates) {
        candidates.forEach((cand, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.text = `${i + 1} (${(cand.confidence * 100).toFixed(0)}%)`;
            if (i === currentSelected) opt.selected = true;
            candidateSelect.appendChild(opt);
        });
    }
}

const MAKER_CONFIG = {
    "video": {
        src: "./template/video.html",
        btnId: "add-video-box-button",
        create: () => new FrameMaker.TrackFrameMaker(),
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
    "table": {
        src: "./template/table.html",
        btnId: "add-table-box-button",
        create: () => {
            const fm = new FrameMaker.CustomTableFrameMaker();
            fm.changeAnalysisTool(new Analysis.BallAnalysisTool());
            return fm;
        }
    }
};

// 이벤트 바인딩 및 초기화 (Pose와 동일한 패턴)
Object.entries(MAKER_CONFIG).forEach(([key, config]) => {
    document.getElementById(config.btnId)?.addEventListener('click', async () => {
        await analysisBox.addFrameMaker(
            config.src, config.create(), config.bindUI);
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

initDefault(["video", "table"]);

let processedData = null;

confInput.addEventListener('change', () => {
    if (processedData) {
        processedData.setConf(parseFloat(confInput.value));
        analysisBox.updateImage(); // 모든 Maker 다시 그리기
    }
});
candidateSelect.addEventListener('change', () => {
    if (processedData) {
        processedData.setSelectedIdx(analysisBox.nowIdx(), parseInt(candidateSelect.value));
        analysisBox.updateImage();
    }
});

export const setData = (data) => {
    processedData = data;
    data.setConf(parseFloat(confInput.value));
    analysisBox.setData(data);
};