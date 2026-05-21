import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CVValData } from '@packages/cv-val/core/cvval-data';
import featureName, { POSE_CONNECTIONS, CONNECTIONS_COLORS_KEY } from '../ constant';
import { PoseData } from '../core/pose-data';
import { useThreeScene } from './useThreeScene'

interface PoseOptions {
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

export const usePose3DFrame = (data: CVValData | null, canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
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

    const { groupRef } = useThreeScene(canvasRef, options.backgroundColor);

    const jointsPool = useRef<Map<string, THREE.Mesh>>(new Map());
    const linesPool = useRef<Map<string, THREE.Line>>(new Map());
    const sphereGeometryRef = useRef(new THREE.SphereGeometry(0.02, 16, 16));

    useEffect(() => {
        return () => {
            sphereGeometryRef.current.dispose();
            jointsPool.current.forEach(mesh => {
                (mesh.material as THREE.Material).dispose();
            });
            linesPool.current.forEach(line => {
                line.geometry.dispose();
                (line.material as THREE.Material).dispose();
            });
        };
    }, []);

    const drawPose = useCallback((idx: number) => {
        if (!data || !data.exist(featureName)) return;

        const poseData = data.get(featureName) as PoseData;

        const landmark3dList = poseData.getLandmarks3d();
        if (!landmark3dList) return;
        
        const landmarks3d = landmark3dList[idx];
        const group = groupRef.current;

        // 모든 기존 객체를 일단 숨김 처리 (풀링)
        jointsPool.current.forEach(j => j.visible = false);
        linesPool.current.forEach(l => l.visible = false);

        if (!landmarks3d || Object.keys(landmarks3d).length === 0) {
            return;
        }

        const jointPositions: Record<string, THREE.Vector3> = {};

        for (const key in landmarks3d) {
            const landmark = landmarks3d[key] as [number, number, number];
            const position = new THREE.Vector3(landmark[0], landmark[1], -landmark[2]);
            jointPositions[key] = position;

            let sphere = jointsPool.current.get(key);
            
            if (!sphere) {
                // 새로운 메쉬 생성 및 풀에 저장
                const material = new THREE.MeshBasicMaterial();
                sphere = new THREE.Mesh(sphereGeometryRef.current, material);
                jointsPool.current.set(key, sphere);
                group.add(sphere);
            }

            sphere.visible = true;
            sphere.position.copy(position);
            (sphere.material as THREE.MeshBasicMaterial).color.set(
                options["JOINT_STROKE"] || "#ff0000");
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

                const lineKey = `${startKey}-${endKey}`;
                let line = linesPool.current.get(lineKey);
                const color = options[colorKey] || "#ffffff";

                if (!line) {
                    // 새로운 라인 객체 생성 및 풀에 저장
                    const material = new THREE.LineBasicMaterial();
                    const geometry = new THREE.BufferGeometry();
                    line = new THREE.Line(geometry, material);
                    linesPool.current.set(lineKey, line);
                    group.add(line);
                }

                line.visible = true;
                line.geometry.setFromPoints([startPoint, endPoint]);
                (line.material as THREE.LineBasicMaterial).color.set(color);
            }
        });
    }, [data, options]);

    return { options, setOptions, drawPose }
}