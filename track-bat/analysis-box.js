import { AnalysisBox } from "../src/cv-val/common/analysis-box.js";
import { TrackBatFrameMaker } from "../src/cv-val/track-bat/frame-maker/frame-maker.js";
import { frameMakerExport } from "../src/cv-val/common/frame-maker-export.js";

// 1. AnalysisBox 인스턴스 생성 및 공통 UI 바인딩
const analysisBox = new AnalysisBox();
analysisBox.bindUI(document, {
    // 슬라이더 이동 시 후보군(Candidate) UI도 함께 갱신되도록 콜백 등록
    onUpdate: (frameIdx) => updateCandidateUI(frameIdx)
});

const candidateSelect = document.getElementById('candidateSelect');
const confInput = document.getElementById('confInput');
const analysisSelect = document.getElementById('analysis');
const addVideoBoxBtn = document.getElementById('add-video-box-button');

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
        
        await frameMakerExport(frameMaker, processedData);
        console.log("배트 분석 영상 저장 완료");
        frameMaker.drawImageAt(analysisBox.nowIdx());
    });
};

// --- 이벤트 리스너 설정 ---

// 신뢰도(Confidence) 변경 시 데이터 갱신 및 전체 리렌더링
confInput.addEventListener('change', () => {
    if (processedData) {
        processedData.setConf(parseFloat(confInput.value));
        analysisBox.updateImage(); // 모든 Maker 다시 그리기
    }
});

// 후보군 선택 변경 시
candidateSelect.addEventListener('change', () => {
    if (processedData) {
        processedData.setSelectedIdx(analysisBox.nowIdx(), parseInt(candidateSelect.value));
        analysisBox.updateImage();
    }
});

// 도구 추가 버튼 클릭 이벤트
addVideoBoxBtn.addEventListener('click', async () => {
    const videoFrameMaker = new TrackBatFrameMaker();
    await analysisBox.addFrameMaker(
        "../template/bat-video.html",
        videoFrameMaker,
        (box) => batVideoUIBinder(box, videoFrameMaker)
    );
    analysisSelect.closeAction();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
});

export const setData = (data) => {
    processedData = data;
    data.setConf(parseFloat(confInput.value));
    analysisBox.setData(data);
};

// 초기 기본 도구 로드
async function init() {
    const videoFrameMaker = new TrackBatFrameMaker();
    await analysisBox.addFrameMaker(
        "../template/bat-video.html",
        videoFrameMaker,
        (box) => batVideoUIBinder(box, videoFrameMaker)
    );
}

init();