import * as FrameMaker from '../src/cv-val/track-ball/frame-maker/index.js';
import * as Analysis from "../src/cv-val/track-ball/calc/analysis.js";
import { BoxList } from "../src/easy-h/ui/box-list.js";

let frameMakers = [];
let processedData = null;

const confInput = document.getElementById('confInput');
confInput.addEventListener('change', () => {
    if (processedData == null) return;
    processedData.setConf(parseFloat(confInput.value));
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

    const frameIdx = nowIdx();

    // --- 후보군 Select 박스 갱신 로직 (선택 안 함 추가) ---
    const candidates = processedData.getCandidatesAt(frameIdx);
    const frameData = processedData.getBallList()[frameIdx];
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

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].drawImageAt(frameIdx);
    }

}

slider.addEventListener('input', updateImage);

function setData(data) {

    if (data == null) return;

    processedData = data;
    processedData.setConf(parseFloat(confInput.value));

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].setData(data);
    }

    const frameCount = processedData.getFrameCnt();
    slider.max = frameCount > 0 ? frameCount - 1 : 0;
    
    console.log(processedData);

    updateImage();

}

const analysisSelect = document.getElementById('analysis')

const addVideoBoxBtn = document.getElementById('add-video-box-button');
const addTableBoxBtn = document.getElementById('add-table-box-button');

const boxList = new BoxList(document.getElementById("boxes"));

function addToolDefault(src, frameMaker, func, toBottom = true) {
    return new Promise((resolve, reject) => {
        boxList.addBoxTemplate(src, () => {
            frameMakers = frameMakers.filter(fm => fm !== frameMaker);
    
        }, (box) => {
            box.className = 'container neumorphism';
            func(frameMaker, box);
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

const frameMakerInitializer = {
    "video": function(frameMaker, box) {
            const newCanvas = box.querySelectorAll("canvas")[0];
            frameMaker.setInstance(newCanvas);
    },
    "table": function(frameMaker, box) {
            const newDiv = box.getElementsByClassName("table")[0];
            frameMaker.setInstance(newDiv);

            frameMaker.changeAnalysisTool(
                new Analysis.BallAnalysisTool());
        }

}

addVideoBoxBtn.addEventListener('click', () => {
    const newPoseFrameMaker = new FrameMaker.TrackFrameMaker();
    console.log("add");
    addTool("../template/video.html",
        newPoseFrameMaker, frameMakerInitializer["video"]);

});

addTableBoxBtn.addEventListener('click', () => {
    const newTableFrameMaker = new FrameMaker.CustomTableFrameMaker();

    console.log("add");
    addTool("../template/table-track.html",
        newTableFrameMaker, frameMakerInitializer["table"]);

});

const newPoseFrameMaker = new FrameMaker.TrackFrameMaker();

addToolDefault("../template/video.html",
    newPoseFrameMaker, frameMakerInitializer["video"]).then(() => {
        const newTableFrameMaker = new FrameMaker.CustomTableFrameMaker();

        addToolDefault("../template/table-track.html",
            newTableFrameMaker, frameMakerInitializer["table"]);

    });


export { setData }