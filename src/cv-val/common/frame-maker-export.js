import { FFMPEGImageListToVideo } from "../../image-list-to-video/FFMPEG.js";
import { MediabunnyImageListToVideo } from "../../image-list-to-video/media-bunny.js"

const videoMaker = new FFMPEGImageListToVideo();

export async function frameMakerExport(frameMaker, trackData) {

    const frameCount = trackData.getFrameCnt();

    if (frameCount === 0) return;

    const metadata = trackData.getVideoMetadata(0);
    const fps = metadata.fps || 24;

    console.log(fps);

    await videoMaker.init();

    try {
        for (let i = 0; i < frameCount; i++) {
            const canvas = frameMaker.getImageAt(i);
            const blob = await new Promise(
                res => canvas.toBlob(res, 'image/jpeg', 0.9));
            
            await videoMaker.addImage(i, blob);
        }

        console.log(fps);
        const outputData = await videoMaker.export(fps);
        console.log(outputData);
        download(outputData, `analysis_${Date.now()}.mp4`);

    } catch (error) {
        console.log(error);
        alert("저장 중 오류 발생");
    } finally {
        videoMaker.postprocess();
    }
}

function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}