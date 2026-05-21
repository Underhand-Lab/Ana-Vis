import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const useThreeScene = (canvasRef: React.RefObject<HTMLCanvasElement | null>, backgroundColor: string) => {
    const sceneRef = useRef(new THREE.Scene());
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const groupRef = useRef(new THREE.Group());

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.parentElement) return;

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        const scene = sceneRef.current;
        scene.background = new THREE.Color(backgroundColor);
        scene.add(groupRef.current);

        const camera = new THREE.PerspectiveCamera(75, width / height || 1, 0.1, 1000);
        camera.position.set(0, 1, 2);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(width, height, false);
        rendererRef.current = renderer;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry && rendererRef.current && cameraRef.current) {
                const { width: w, height: h } = entry.contentRect;
                cameraRef.current.aspect = w / h;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(w, h, false);
            }
        });
        resizeObserver.observe(canvas.parentElement!);

        const controls = new OrbitControls(camera, renderer.domElement as HTMLElement);
        controlsRef.current = controls;

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight.position.set(0, 10, 10);
        scene.add(dirLight);

        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationId);
            resizeObserver.disconnect();
            renderer.dispose();
        };
    }, [canvasRef]);

    useEffect(() => {
        if (sceneRef.current) {
            sceneRef.current.background = new THREE.Color(backgroundColor);
        }
    }, [backgroundColor]);

    return { sceneRef, cameraRef, rendererRef, controlsRef, groupRef };
};