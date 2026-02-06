import * as FrameMaker from '../src/cv-val/track-ball/frame-maker/index.js';
import * as Analysis from "../src/cv-val/track-ball/calc/analysis.js";
import { AnalysisBox } from "../src/cv-val/common/analysis-box.js";

const analysisBox = new AnalysisBox();
analysisBox.bindUI(document, {
    onUpdate: (frameIdx) => updateCandidateUI(frameIdx) 
});

const analysisSelect = document.getElementById('analysis');
const candidateSelect = document.getElementById('candidateSelect');
const confInput = document.getElementById('confInput');

function updateCandidateUI(frameIdx) {
    const data = analysisBox.getData();
    if (!data) return;

    const candidates = data.getCandidatesAt(frameIdx);
    const frameData = data.getBallList()[frameIdx];
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
        src: "../template/ball-video.html",
        btnId: "add-video-box-button",
        create: () => new FrameMaker.TrackFrameMaker()
    },
    "table": {
        src: "../template/table-track.html",
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
        await analysisBox.addFrameMaker(config.src, config.create());
        analysisSelect.closeAction();
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
});

// 기본 셋업
async function init() {
    await analysisBox.addFrameMaker(MAKER_CONFIG.video.src, MAKER_CONFIG.video.create());
    await analysisBox.addFrameMaker(MAKER_CONFIG.table.src, MAKER_CONFIG.table.create());
}
init();

confInput.addEventListener('change', () => {
    const data = analysisBox.getData();
    if (data) {
        data.setConf(parseFloat(confInput.value));
        analysisBox.updateAll(); // 모든 Maker 다시 그리기
    }
});

let processedData = null;

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