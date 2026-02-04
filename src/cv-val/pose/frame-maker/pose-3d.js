import { IPoseFrameMaker } from "./pose.interface.js";
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

const POSE_CONNECTIONS = [
    ["L_SHOULDER", "L_ELBOW"], ["L_ELBOW", "L_WRIST"],
    ["R_SHOULDER", "R_ELBOW"], ["R_ELBOW", "R_WRIST"],
    ["L_HIP", "L_KNEE"], ["L_KNEE", "L_ANKLE"], ["L_ANKLE", "L_HEEL"], ["L_HEEL", "L_FOOT_INDEX"],
    ["R_HIP", "R_KNEE"], ["R_KNEE", "R_ANKLE"], ["R_ANKLE", "R_HEEL"], ["R_HEEL", "R_FOOT_INDEX"],
    ["L_SHOULDER", "R_SHOULDER"], ["L_HIP", "R_HIP"], ["L_SHOULDER", "L_HIP"], ["R_SHOULDER", "R_HIP"],
    ["NOSE", "L_SHOULDER"], ["NOSE", "R_SHOULDER"]
];

const CONNECTIONS_COLORS_KEY = {
    "L_SHOULDER,L_ELBOW": "COLOR_LEFT_ARM",
    "L_ELBOW,L_WRIST": "COLOR_LEFT_ARM",

    "R_SHOULDER,R_ELBOW": "COLOR_RIGHT_ARM",
    "R_ELBOW,R_WRIST": "COLOR_RIGHT_ARM",

    "L_HIP,L_KNEE": "COLOR_LEFT_LEG",
    "L_KNEE,L_ANKLE": "COLOR_LEFT_LEG",
    "L_ANKLE,L_HEEL": "COLOR_LEFT_LEG",
    "L_HEEL,L_FOOT_INDEX": "COLOR_LEFT_LEG",

    "R_HIP,R_KNEE": "COLOR_RIGHT_LEG",
    "R_KNEE,R_ANKLE": "COLOR_RIGHT_LEG",
    "R_ANKLE,R_HEEL": "COLOR_RIGHT_LEG",
    "R_HEEL,R_FOOT_INDEX": "COLOR_RIGHT_LEG",

    "L_SHOULDER,R_SHOULDER": "COLOR_TORSO",
    "L_HIP,R_HIP": "COLOR_TORSO",
    "L_SHOULDER,L_HIP": "COLOR_TORSO",
    "R_SHOULDER,R_HIP": "COLOR_TORSO",

    "NOSE,L_SHOULDER": "COLOR_HEAD_NECK",
    "NOSE,R_SHOULDER": "COLOR_HEAD_NECK"
};

export class Pose3DFrameMaker extends IPoseFrameMaker {
    constructor() {
        super();
        this.canvas3d = null;
        this.colorPalette = {
            "COLOR_LEFT_ARM": "#ff0000",
            "COLOR_RIGHT_ARM": "#0000ff",
            "COLOR_LEFT_LEG": "#ffff00",
            "COLOR_RIGHT_LEG": "#00ffff",
            "COLOR_TORSO": "#00ff00",
            "COLOR_HEAD_NECK": "#ffffff",
            "JOINT_STROKE": "#ff0000"
        };
    }
    setInstance(canvas3d) {
        this.canvas3d = canvas3d;
        this.init3DScene();
    }

    init3DScene() {
        this.scene = new THREE.Scene();
        
        // 캔버스의 초기 클라이언트 크기를 사용
        const initialWidth = this.canvas3d.clientWidth;
        const initialHeight = this.canvas3d.clientHeight;

        this.camera = new THREE.PerspectiveCamera(75, initialWidth / initialHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas3d, antialias: true });
        
        // 렌더러의 크기만 설정하고 스타일은 CSS가 관리하도록 설정
        this.renderer.setSize(initialWidth, initialHeight, false);
        this.camera.position.z = 2;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.directionalLight.position.set(5, 5, 5);
        this.scene.add(this.directionalLight);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.animate();
    }

    onWindowResize() {
        // 캔버스의 실제 클라이언트 크기를 사용
        const newWidth = this.canvas3d.clientWidth;
        const newHeight = this.canvas3d.clientHeight;

        this.camera.aspect = newWidth / newHeight;
        this.camera.updateProjectionMatrix();

        // 렌더러의 크기만 설정하고 스타일은 변경하지 않음 (false)
        this.renderer.setSize(newWidth, newHeight, false); 
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setData(processedData) {
        if (processedData == null) return;
        this.processedData = processedData;
        this.targetIdx = 0;
        this.landmark3dList = processedData.getLandmarks3d(this.targetIdx);
        this.lastIdx = 0;
    }

    setColor(key, colorValue) {
        if (this.colorPalette[key] !== undefined) {
            this.colorPalette[key] = colorValue;
        }
    }

    drawImageAt(idx) {
        if (this.processedData == null) return;

        this.lastIdx = idx;
        const landmarks3d = this.landmark3dList[idx];

        while(this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        this.scene.add(this.directionalLight);

        if (!landmarks3d || Object.keys(landmarks3d).length === 0) {
            return;
        }

        const jointPositions = {};
        const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);

        for (const key in landmarks3d) {
            const landmark = landmarks3d[key];
            const position = new THREE.Vector3(landmark[0], landmark[1], -landmark[2]);
            jointPositions[key] = position;

            const sphereMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.colorPalette["JOINT_STROKE"]) });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.copy(position);
            this.scene.add(sphere);
        }

        POSE_CONNECTIONS.forEach(connection => {
            const startKey = connection[0];
            const endKey = connection[1];
            const startPoint = jointPositions[startKey];
            const endPoint = jointPositions[endKey];
            
            if (startPoint && endPoint) {
                let colorKey = CONNECTIONS_COLORS_KEY[`${startKey},${endKey}`];
                if (!colorKey) {
                    colorKey = CONNECTIONS_COLORS_KEY[`${endKey},${startKey}`];
                }

                const color = this.colorPalette[colorKey];

                const lineMaterial = new THREE.LineBasicMaterial({
                    color: new THREE.Color(color)
                });
                const points = [startPoint, endPoint];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                this.scene.add(line);
            }
        });
    }
}