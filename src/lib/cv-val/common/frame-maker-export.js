import { MediabunnyImageListToVideo } from "../../image-list-to-video/media-bunny.js"

const videoMaker = new MediabunnyImageListToVideo();

export async function frameMakerDataToBlob(frameMaker, trackData) {

    const frameCount = trackData.getFrameCnt();

    if (frameCount === 0) return;

    const metadata = trackData.getVideoMetadata(0);
    const fps = metadata.fps || 24;

    await videoMaker.init();

    try {
        for (let i = 0; i < frameCount; i++) {
            const canvas = frameMaker.getImageAt(i);
            const blob = await new Promise(
                res => canvas.toBlob(res, 'image/jpeg', 0.9));
            
            await videoMaker.addImage(i, blob);
        }
        const outputData = await videoMaker.export(fps);

        return outputData;

    } catch (error) {
        console.error(error);
        alert("저장 중 오류 발생");
    } finally {
        videoMaker.postprocess();
    }
}