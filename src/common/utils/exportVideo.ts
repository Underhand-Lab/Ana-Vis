import { MediabunnyImageListToVideo as ImageListToVideo }
    from "../lib/image-list-to-video/media-bunny";

interface ExportConfig {
    fps?: number;
    name?: string;
}

export const exportVideo = async (
    drawFunc: (index: number) => HTMLCanvasElement | null,
    frameCount: number,
    conf: ExportConfig
): Promise<void> => {

    const videoExporter = new ImageListToVideo();
    
    try {
        for (let i = 0; i < frameCount; i++) {
            // 공통 합성 함수 사용 (화면 재생에 영향 주지 않음)
            const composite = drawFunc(i) as HTMLCanvasElement | null;
            if (composite) {
                const blob = await new Promise<Blob | null>((resolve) =>
                    composite.toBlob((b) => resolve(b), 'image/png', 1)
                );
                if (blob) {
                    await videoExporter.addImage(i, blob);
                }
            }
        }

        const fps = conf.fps ?? 30;
        const name = conf.name ?? 'video';

        const videoBlob = await videoExporter.export(fps);

        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error("Export Failed:", error);
    } finally {
        videoExporter.postprocess();
    }
};