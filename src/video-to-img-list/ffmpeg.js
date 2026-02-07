const { createFFmpeg, fetchFile } = FFmpeg;

export class FFMPEGVideoConverter {
    constructor() {
        this.ffmpeg = createFFmpeg({
            mainName: 'main',
            corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
        });
        this.isLoaded = false;
    }

    async load() {
        if (this.isLoaded) return;
        await this.ffmpeg.load();
        this.isLoaded = true;
        console.log('FFmpeg 로드 완료.');
    }

    /**
     * 메타데이터와 비트맵 배열을 객체 형태로 한 번에 반환합니다.
     */
    async convert(file) {
        if (!file) throw new Error('비디오 파일이 없습니다.');
        if (!this.isLoaded) await this.load();

        const inputFileName = file.name;
        const outputFileName = 'output_%d.png';
        let ffmpegLogs = '';

        // 1. 로그를 가로채서 메타데이터 파싱 준비
        this.ffmpeg.setLogger(({ type, message }) => {
            if (type === 'fferr') {
                ffmpegLogs += message + '\n';
            }
        });

        // 2. 파일 쓰기
        this.ffmpeg.FS('writeFile', inputFileName, await fetchFile(file));

        try {
            // 3. 변환 실행 (추출과 동시에 로그 생성)
            await this.ffmpeg.run('-i', inputFileName, outputFileName);
        } catch (error) {
            if (error.status !== 0) {
                console.error("FFmpeg 실제 에러 발생:", error);
                throw error;
            }
        } finally {
            // 로그 수집 중단
            this.ffmpeg.setLogger(() => { });
        }

        // 4. 메타데이터 파싱
        const match = ffmpegLogs.match(/(\d{2,5})x(\d{2,5}).+?(\d+(?:\.\d+)?)\s+fps/);
        const metadata = match ? {
            width: parseInt(match[1], 10),
            height: parseInt(match[2], 10),
            fps: parseFloat(match[3]),
        } : null;

        // 5. 생성된 이미지 파일 읽기
        const fileNames = this.ffmpeg.FS('readdir', '/')
            .filter((f) => f.startsWith('output_'))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)[0]);
                const numB = parseInt(b.match(/\d+/)[0]);
                return numA - numB;
            });

        const imageList = [];
        for (const fileName of fileNames) {
            const data = this.ffmpeg.FS('readFile', fileName);
            const blob = new Blob([data.buffer], { type: 'image/png' });
            const bitmap = await createImageBitmap(blob);
            imageList.push(bitmap);
            
            // 메모리 해제를 위해 가상 파일 시스템에서 삭제
            this.ffmpeg.FS('unlink', fileName);
        }

        // 6. 원본 입력 파일 삭제
        this.ffmpeg.FS('unlink', inputFileName);

        // 결과 반환
        return {
            imageList,
            metadata
        };
    }
}