import { useState, useCallback, useRef, useEffect } from 'react';

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

export const usePose3DVisualize = (poseData, renderer) => {
    const [options, setOptions] = useState({
        COLOR_LEFT_ARM: "#ff0000",
        COLOR_RIGHT_ARM: "#0000ff",
        COLOR_LEFT_LEG: "#ffff00",
        COLOR_RIGHT_LEG: "#00ffff",
        COLOR_TORSO: "#00ff00",
        COLOR_HEAD_NECK: "#ffffff",
        JOINT_STROKE: "#ff0000"

    })

    const offscreenRef = useRef(null);

    useEffect(() => {
        if (!offscreenRef.current) {
            offscreenRef.current = document.createElement('canvas');
        }
    }, []);


    const drawImageAt = useCallback((idx) => {
        if (this.data == null) return;

        this.lastDrawIdx = idx;
        const landmarks3d = this.landmark3dList[idx];

        while (this.scene.children.length > 0) {
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
    });

    return { options, setOptions, drawImageAt }
}