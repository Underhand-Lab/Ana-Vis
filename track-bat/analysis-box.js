import { AnalysisBox } from "../src/cv-val/common/analysis-box.js";
import { TrackBatFrameMaker } from "../src/cv-val/track-bat/frame-maker/frame-maker.js";
import { frameMakerDataToBlob } from "../src/cv-val/common/frame-maker-export.js";
import { saveBlobWithPicker } from "../src/save-blob.js";

const analysisBox = new AnalysisBox();
analysisBox.bindUI(document, {
    onUpdate: (frameIdx) => updateCandidateUI(frameIdx)
});

const candidateSelect = document.getElementById('candidateSelect');
const confInput = document.getElementById('confInput');
const analysisSelect = document.getElementById('analysis');

const saveBtn = document.querySelector("#save-to-file");

saveBtn.addEventListener('click', async () => {
    if (!processedData) return;
    try {
        const blob = await processedData.toBlob();
        await saveBlobWithPicker(blob, "trackBat.cvbt", [{
            description: 'Track Bat Data File',
            accept: { 'application/cvbt': ['.cvbt'] },
        }], true, "cvbt");
    }
    catch (error) {
        console.error(error);
    }
});

let processedData = null;

function updateCandidateUI(frameIdx) {
    if (!processedData) return;

    const candidates = processedData.getCandidatesAt(frameIdx);
    const frameData = processedData.getBatList()[frameIdx];
    const currentSelected = frameData ? frameData.selectedIdx : -1;

    candidateSelect.innerHTML = '<option value="-1">none</option>';
    if (candidates && candidates.length > 0) {
        candidates.forEach((cand, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.text = `${i + 1} (${(cand.confidence * 100).toFixed(0)}%)`;
            if (i === currentSelected) opt.selected = true;
            candidateSelect.appendChild(opt);
        });
    }
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, parseInt(alpha)];
}

const batVideoUIBinder = (box, frameMaker) => {
    const saveBtn = box.querySelector(".save");
    const trailInput = box.querySelector(".trailInput");
    const batColor = box.querySelector(".bat-color");
    const batColorAlpha = box.querySelector(".bat-color-alpha");
    const trailColor = box.querySelector(".trail-color");
    const trailColorAlpha = box.querySelector(".trail-color-alpha");

    const colorChange = () => {
        frameMaker.setColors(
            hexToRgba(batColor.value, batColorAlpha.value),
            hexToRgba(trailColor.value, trailColorAlpha.value)
        );
        frameMaker.drawImageAt(analysisBox.nowIdx());
    };

    // 색상 관련 이벤트 등록
    [batColor, batColorAlpha, trailColor, trailColorAlpha].forEach(el => {
        el.addEventListener('change', colorChange);
    });

    // 궤적 및 캔버스 기본 바인딩
    frameMaker.setTrail(trailInput);
    frameMaker.bindUI(box);
    colorChange();

    saveBtn.addEventListener('click', async () => {
        if (!processedData) return;

        const blob = await frameMakerDataToBlob(
            frameMaker, processedData);

        await saveBlobWithPicker(blob, "trackBatVideo.mp4", [{
            description: 'Video File',
            accept: {
                'video/mp4': ['.mp4']
            },
        }], true, "mp4");
        
    });
};

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

const MAKER_CONFIG = {
    "video": {
        src: "./template/video.html",
        btnId: "add-video-box-button",
        create: () => new TrackBatFrameMaker(),
        bindUI: batVideoUIBinder
    },

}

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

const uploadInput = document.getElementById('plugin-upload');

uploadInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await analysisBox.registerPlugin(file);
    
    analysisSelect.closeAction();
    e.target.value = "";

});

export function setData(data) {
    processedData = data;
    data.setConf(parseFloat(confInput.value));
    analysisBox.setData(data);
};

analysisBox.initDefault(["video"]);