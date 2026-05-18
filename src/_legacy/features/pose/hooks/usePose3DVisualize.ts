import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Landmarks3D } from '../core/types';

interface PoseData {
    getLandmarks3d(): (Landmarks3D | null)[];
}

export interface PoseOptions {
    COLOR_LEFT_ARM: string;
    COLOR_RIGHT_ARM: string;
    COLOR_LEFT_LEG: string;
    COLOR_RIGHT_LEG: string;
    COLOR_TORSO: string;
    COLOR_HEAD_NECK: string;
    COLOR_JOINT: string;
    JOINT_STROKE: string;
    backgroundColor: string;
    [key: string]: any;
}

const POSE_CONNECTIONS: readonly [string, string][] = [
    ["L_SHOULDER", "L_ELBOW"], ["L_ELBOW", "L_WRIST"],
    ["R_SHOULDER", "R_ELBOW"], ["R_ELBOW", "R_WRIST"],
    ["L_HIP", "L_KNEE"], ["L_KNEE", "L_ANKLE"], ["L_ANKLE", "L_HEEL"], ["L_HEEL", "L_FOOT_INDEX"],
    ["R_HIP", "R_KNEE"], ["R_KNEE", "R_ANKLE"], ["R_ANKLE", "R_HEEL"], ["R_HEEL", "R_FOOT_INDEX"],
    ["L_SHOULDER", "R_SHOULDER"], ["L_HIP", "R_HIP"], ["L_SHOULDER", "L_HIP"], ["R_SHOULDER", "R_HIP"],
    ["NOSE", "L_SHOULDER"], ["NOSE", "R_SHOULDER"]
];

const CONNECTIONS_COLORS_KEY: Record<string, string> = {
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

export const usePose3DVisualize = (poseData: PoseData | null, canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    const [options, setOptions] = useState<PoseOptions>({
        COLOR_LEFT_ARM: "#ff0000",
        COLOR_RIGHT_ARM: "#0000ff",
        COLOR_LEFT_LEG: "#ffff00",
        COLOR_RIGHT_LEG: "#00ffff",
        COLOR_TORSO: "#00ff00",
        COLOR_HEAD_NECK: "#ffffff",
        JOINT_STROKE: "#ff0000",
        COLOR_JOINT: "#ffffff",
        backgroundColor: "rgba(0,0,0,1)"
    });

    const sceneRef = useRef(new THREE.Scene());
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const groupRef = useRef(new THREE.Group()); // 랜드마크와 선을 담을 그룹

    useEffect(() => {
        if (!canvasRef.current) return;

        const width = canvasRef.current.clientWidth;
        const height = canvasRef.current.clientHeight;

        // Scene 설정
        const scene = sceneRef.current;
        scene.background = new THREE.Color(options.backgroundColor);
        scene.add(groupRef.current);

        // Camera 설정
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 1, 2);
        cameraRef.current = camera;

        // Renderer 설정
        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
        renderer.setSize(width, height);
        rendererRef.current = renderer;

        // Controls 설정
        const controls = new OrbitControls(camera, renderer.domElement as HTMLElement);
        controlsRef.current = controls;

        // 조명 추가
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight.position.set(0, 10, 10);
        scene.add(dirLight);

        // 렌더링 루프
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationId);
            renderer.dispose();
        };
    }, [canvasRef]);

    // 배경색 변경 감지 및 반영
    useEffect(() => {
        if (sceneRef.current) {
            const color = options.backgroundColor || "rgba(0,0,0,1)";
            sceneRef.current.background = new THREE.Color(color);
        }
    }, [options.backgroundColor]);

    const drawPose = useCallback((idx: number) => {
        if (!poseData) return;

        const landmark3dList = poseData.getLandmarks3d();
        if (!landmark3dList) return;
        
        const landmarks3d = landmark3dList[idx];
        const group = groupRef.current;

        // 기존 객체 제거
        while (group.children.length > 0) {
            group.remove(group.children[0]);
        }

        if (!landmarks3d || Object.keys(landmarks3d).length === 0) {
            return;
        }

        const jointPositions: Record<string, THREE.Vector3> = {};
        const sphereGeometry = new THREE.SphereGeometry(0.02, 16, 16);

        for (const key in landmarks3d) {
            const landmark = landmarks3d[key] as [number, number, number];
            // Mediapipe Z축 반전 처리 (보통 시각화 시 반전이 필요함)
            const position = new THREE.Vector3(landmark[0], landmark[1], -landmark[2]);
            jointPositions[key] = position;

            const sphereMaterial = new THREE.MeshBasicMaterial({ 
                color: new THREE.Color(options["JOINT_STROKE"] || "#ff0000") 
            });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.copy(position);
            group.add(sphere);
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

                const color = options[colorKey] || "#ffffff";
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: new THREE.Color(color)
                });

                const points = [startPoint, endPoint];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(lineGeometry, lineMaterial);
                group.add(line);
            }
        });
    }, [poseData, options]);

    return { options, setOptions, drawPose }
}