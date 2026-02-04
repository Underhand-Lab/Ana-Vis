import * as PoseAnalysis from "../src/cv-val/pose/analysis-tool/index.js";
import * as PoseFrameMaker from '../src/cv-val/pose/frame-maker/index.js';
import { BoxList } from "../src/easy-h/ui/box-list.js"

const currentFrameIdxSpan = document.getElementById('currentFrameIdx');
const totalFramesSpan = document.getElementById('totalFrames');

let frameMakers = [];
let processedData = null;

const slider = document.getElementById('frameSlider');
slider.max = 0;

function nowIdx() {
    return parseInt(slider.value, 10);
}

function updateImage() {

    if (!processedData) return;

    const frameIdx = nowIdx();

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].drawImageAt(frameIdx);
    }

}

slider.addEventListener('input', updateImage);

function setData(data) {

    if (data == null) return;

    processedData = data;

    for (let i = 0; i < frameMakers.length; i++) {
        frameMakers[i].setData(processedData);
    }

    const frameCount = processedData.getFrameCnt();
    slider.max = frameCount > 0 ? frameCount - 1 : 0;

    updateImage();

}

const analysisSelect = document.getElementById('analysis');

const addVideoBoxBtn =
    document.getElementById('add-video-box-button');
const add3dVideoBoxBtn =
    document.getElementById('add-3d-video-box-button');
const addGraphBoxBtn =
    document.getElementById('add-graph-box-button');
const addTableBoxBtn =
    document.getElementById('add-table-box-button');

const boxList = new BoxList(document.getElementById("boxes"));

const analysisTool = {
    "angle": new PoseAnalysis.AngleAnalysisTool(),
    "angle-velocity": new PoseAnalysis.AngleVelocityAnalysisTool(),
    "velocity": new PoseAnalysis.VelocityAnalysisTool(),
    "height": new PoseAnalysis.HeightAnalysisTool(),
}

const frameMakerInitializer = {
    "video": function (frameMaker, box) {
        const newCanvas = box.querySelectorAll("canvas")[0];
        frameMaker.setInstance(newCanvas);
        
        const leftArmPicker = box.querySelectorAll(".color-left-arm")[0];
        leftArmPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_LEFT_ARM", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });
        
        const rightArmPicker = box.querySelectorAll(".color-right-arm")[0];
        rightArmPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_RIGHT_ARM", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });
        
        const leftLegPicker = box.querySelectorAll(".color-left-leg")[0];
        leftLegPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_LEFT_LEG", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });
        
        const rightLegPicker = box.querySelectorAll(".color-right-leg")[0];
        rightLegPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_RIGHT_LEG", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });
        
        const torsoPicker = box.querySelectorAll(".color-torso")[0];
        torsoPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_TORSO", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });

        const headPicker = box.querySelectorAll(".color-head")[0];
        headPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_HEAD_NECK", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });

        const jointPicker = box.querySelectorAll(".color-joint")[0];
        jointPicker.addEventListener('change', (e) => {
            frameMaker.setColor("JOINT_STROKE", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });
    },
    "3d-video": function (frameMaker, box) {
        const newCanvas = box.querySelectorAll("canvas")[0];
        frameMaker.setInstance(newCanvas);
        const leftArmPicker = box.querySelectorAll(".color-left-arm")[0];
        leftArmPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_LEFT_ARM", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });
        
        const rightArmPicker = box.querySelectorAll(".color-right-arm")[0];
        rightArmPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_RIGHT_ARM", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });
        
        const leftLegPicker = box.querySelectorAll(".color-left-leg")[0];
        leftLegPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_LEFT_LEG", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });
        
        const rightLegPicker = box.querySelectorAll(".color-right-leg")[0];
        rightLegPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_RIGHT_LEG", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });
        
        const torsoPicker = box.querySelectorAll(".color-torso")[0];
        torsoPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_TORSO", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });

        const headPicker = box.querySelectorAll(".color-head")[0];
        headPicker.addEventListener('change', (e) => {
            frameMaker.setColor("COLOR_HEAD_NECK", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });

        const jointPicker = box.querySelectorAll(".color-joint")[0];
        jointPicker.addEventListener('change', (e) => {
            frameMaker.setColor("JOINT_STROKE", e.target.value);
            frameMaker.drawImageAt(nowIdx());
        });
    },
    "graph": function (frameMaker, box) {

        const newCanvas = box.querySelectorAll("canvas")[0];
        frameMaker.setInstance(newCanvas);

        const options = box.querySelectorAll("select")[0];

        options.addEventListener("change", () => {
            frameMaker.changeAnalysisTool(analysisTool[options.value]);
            frameMaker.drawImageAt(nowIdx());
        });

        frameMaker.changeAnalysisTool(analysisTool[options.value]);
    },
    "table": function (frameMaker, box) {
        const newDiv = box.getElementsByClassName("table")[0];
        frameMaker.setInstance(newDiv);

        const options = box.querySelectorAll("select")[0];

        options.addEventListener("change", () => {
            frameMaker.changeAnalysisTool(analysisTool[options.value]);
            frameMaker.drawImageAt(nowIdx());
        });

        frameMaker.changeAnalysisTool(analysisTool[options.value]);
    }
}

function addToolDefault(src, frameMaker, func) {
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
        window.scrollTo({ top: bottom, left: 0, behavior: 'smooth' });
    })
}

addVideoBoxBtn.addEventListener('click', () => {
    const newPoseFrameMaker = new PoseFrameMaker.PoseBoneFrameMaker();
    addTool("../template/pose-video.html",
        newPoseFrameMaker, frameMakerInitializer["video"]);

});

add3dVideoBoxBtn.addEventListener('click', () => {
    const newPoseFrameMaker = new PoseFrameMaker.Pose3DFrameMaker();

    addTool("../template/3d-video.html",
        newPoseFrameMaker, frameMakerInitializer["3d-video"]);

});

addGraphBoxBtn.addEventListener('click', () => {
    const newGraphFrameMaker = new PoseFrameMaker.CustomGraphFrameMaker();

    addTool("../template/graph.html",
        newGraphFrameMaker, frameMakerInitializer["graph"]);

});

addTableBoxBtn.addEventListener('click', () => {
    const newTableFrameMaker = new PoseFrameMaker.CustomTableFrameMaker();

    addTool("../template/table-pose.html",
        newTableFrameMaker, frameMakerInitializer["table"]);

});

const newPoseFrameMaker = new PoseFrameMaker.PoseBoneFrameMaker();

addToolDefault("../template/pose-video.html", newPoseFrameMaker,
    frameMakerInitializer["video"]).then(() => {

        const newGraphFrameMaker = new PoseFrameMaker.CustomGraphFrameMaker();

        addToolDefault("../template/graph.html",
            newGraphFrameMaker, frameMakerInitializer["graph"]);

    });

export { setData }