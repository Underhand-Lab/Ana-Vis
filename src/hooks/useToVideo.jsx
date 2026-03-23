import { MediabunnyImageListToVideo as ImageListToVideo }
    from "../lib/image-list-to-video/media-bunny";


export const exportVideo = async (drawFunc, frameCount, conf) => {

    const videoExporter = new ImageListToVideo();
    
    try {
        for (let i = 0; i < frameCount; i++) {
            // 공통 합성 함수 사용 (화면 재생에 영향 주지 않음)
            const composite = drawFunc(i);
            if (composite) {
                const bitmap = await new Promise(
                    res => composite.toBlob(res, 'image/png', 1));
                await videoExporter.addImage(i, bitmap);
            }
        }

        const fps = conf.fps ? conf.fps : 30;
        const name = conf.name ? conf.name : 'video';

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