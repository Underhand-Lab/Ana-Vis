import { BoxList } from "../src/easy-h/ui/box-list.js";
import { TrackFrameMaker } from "../src/cv-val/track-bat/frame-maker/frame-maker.js";
import { SaveFrameMaker } from "../src/cv-val/save-frame-maker.js";

let frameMakers = [];
let processedData = null;

const confInput = document.getElementById('confInput');
confInput.addEventListener('change', () => {
    updateImage();
});


const slider = document.getElementById('frameSlider');
slider.max = 0;

function nowIdx() {
    return parseInt(slider.value, 10);
}

// --- candidateSelect 이벤트 리스너 ---
const candidateSelect = document.getElementById('candidateSelect');

candidateSelect.addEventListener('change', () => {
    if (!processedData) return;
    const idx = nowIdx();

    // 사용자가 '선택 안 함'을 고르면 -1이 전달됩니다.
    const selectedValue = parseInt(candidateSelect.value, 10);
    processedData.setSelectedIdx(idx, selectedValue);

    updateImage();
});

function updateImage() {
    if (!processedData) return;

    const idx = nowIdx();

    // --- 후보군 Select 박스 갱신 로직 (선택 안 함 추가) ---
    const candidates = processedData.getCandidatesAt(idx);
    const frameData = processedData.getBatList()[idx];
    const currentSelected = frameData ? frameData.selectedIdx : -1;

    candidateSelect.innerHTML = ''; // 초기화

    // 1. 항상 '선택 안 함' 옵션을 맨 위에 추가
    const noneOpt = document.createElement('option');
    noneOpt.value = "-1";
    noneOpt.text = "none";
    if (currentSelected === -1) noneOpt.selected = true;
    candidateSelect.appendChild(noneOpt);

    // 2. 검출된 후보들이 있다면 리스트업
    if (candidates && candidates.length > 0) {
        candidates.forEach((cand, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.text = `${i + 1} (${(cand.confidence * 100).toFixed(0)}%)`;
            if (i === currentSelected) opt.selected = true;
            candidateSelect.appendChild(opt);
        });
    }
    // ------------------------------------------

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].setConf(parseFloat(confInput.value));
        frameMakers[i].drawImageAt(idx);
    }
}

// --- 나머지 UI 및 데이터 설정 로직 ---

slider.addEventListener('input', updateImage);

function setData(data) {
    if (data == null) return;
    processedData = data;

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].setData(data);
    }
    const frameCount = processedData.getFrameCnt();
    const maxValue = frameCount > 0 ? frameCount - 1 : 0;

    slider.max = maxValue;
    updateImage();
}

const analysisSelect = document.getElementById('analysis');
const addVideoBoxBtn = document.getElementById('add-video-box-button');
const boxList = new BoxList(document.getElementById("boxes"));

function addToolDefault(src, frameMaker, func, toBottom = true) {
    return new Promise((resolve, reject) => {
        boxList.addBoxTemplate(src, () => {
            frameMakers = frameMakers.filter(fm => fm !== frameMaker);

        }, (box) => {
            box.className = 'container neumorphism';
            func(box);
            frameMaker.setData(processedData);

            frameMakers.push(frameMaker);
            frameMaker.drawImageAt(nowIdx());
            resolve();
        });
    });

}

function addTool(src, frameMaker, func) {
    addToolDefault(src, frameMaker, func).then(() => {
        analysisSelect.closeAction();
        let bottom = document.body.scrollHeight;
        window.scrollTo({ top: bottom, left: 0, behavior: 'smooth' })

    });
}

const saveCanvas = document.createElement('canvas');
saveCanvas.style.display = 'none';
document.body.appendChild(saveCanvas);

addVideoBoxBtn.addEventListener('click', () => {

    const newFrameMaker = new TrackFrameMaker();

    addTool("../template/video-with-save.html", newFrameMaker, (box) => {
        const newCanvas = box.querySelectorAll("canvas")[0];
        const saveBtn = box.querySelectorAll(".save")[0];
        const trailInput = box.querySelectorAll(".trailInput")[0];

        const exporter = new SaveFrameMaker(newFrameMaker);
        saveBtn.addEventListener('click', async () => {
            if (processedData == null) return;
            const metadata = processedData.getVideoMetadata(0);
            const defaultDPR = window.devicePixelRatio;
            window.devicePixelRatio = 1;

            saveCanvas.width = metadata.width;
            saveCanvas.height = metadata.height;
            newFrameMaker.setInstance(saveCanvas);

            await exporter.export(processedData);
            window.devicePixelRatio = defaultDPR;
            newFrameMaker.setInstance(newCanvas);

        });

        newFrameMaker.setTrail(trailInput);
        newFrameMaker.setInstance(newCanvas);
    });
});

const newFrameMaker = new TrackFrameMaker();
// 초기 실행
addToolDefault("../template/video-with-save.html", newFrameMaker, (box) => {
    const newCanvas = box.querySelectorAll("canvas")[0];
    const saveBtn = box.querySelectorAll(".save")[0];
    const trailInput = box.querySelectorAll(".trailInput")[0];

    const exporter = new SaveFrameMaker(newFrameMaker);
    saveBtn.addEventListener('click', async () => {
        if (processedData == null) return;
        const metadata = processedData.getVideoMetadata(0);

        saveCanvas.width = metadata.width;
        saveCanvas.height = metadata.height;
        newFrameMaker.setInstance(saveCanvas);

        await exporter.export(processedData);
        
        newFrameMaker.setInstance(newCanvas);

    });

    newFrameMaker.setTrail(trailInput);
    newFrameMaker.setInstance(newCanvas);
});

export { setData };