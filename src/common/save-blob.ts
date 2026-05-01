export interface FileType {
    description?: string;
    accept: Record<string, string[]>;
}

/**
 * Blob 데이터를 파일로 저장합니다.
 * 현대적인 브라우저에서는 File System Access API를 사용하여 사용자가 직접 저장 경로와 파일 이름을 선택할 수 있습니다.
 */
export async function saveBlobWithPicker(
    blob: Blob,
    suggestedName: string = "default.txt",
    types?: FileType[],
    excludeAcceptAllOption: boolean = false,
    endsWith: string = ".txt"
): Promise<void> {
    const win = window as any;

    // Electron 환경인지 확인
    const isElectron = win.electron || (win.process && win.process.type);

    if (isElectron && win.electron?.ipcRenderer) {
        // Electron 환경에서는 IPC를 통해 메인 프로세스의 네이티브 저장 대화상자 호출 권장
        // (이 기능을 쓰려면 main.ts에서 해당 IPC 통신 처리가 필요합니다)
        try {
            const arrayBuffer = await blob.arrayBuffer();
            await win.electron.ipcRenderer.invoke('save-file-dialog', {
                content: new Uint8Array(arrayBuffer),
                suggestedName
            });
            return;
        } catch (e) {
            console.warn("Electron native save failed, falling back to web API", e);
        }
    }

    // 1. File System Access API 지원 여부 확인 (경로 및 이름 선택 가능)
    if ('showSaveFilePicker' in win) {
        try {
            const handle = await win.showSaveFilePicker({
                suggestedName: suggestedName,
                types: types,
                excludeAcceptAllOption: excludeAcceptAllOption
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (err: any) {
            // 사용자가 저장을 취소한 경우(AbortError)를 제외하고 에러를 출력합니다.
            if (err.name !== 'AbortError') {
                console.error("저장 실패:", err);
            }
        }
    } else {
        // 2. 미지원 브라우저 (폴백: 기본 다운로드 방식)
        // 브라우저 보안 정책상 직접적인 경로 지정은 불가능하며, 설정된 기본 다운로드 폴더에 저장됩니다.
        const fileName = prompt("파일 이름을 입력하세요:", suggestedName) || suggestedName;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        const finalExtension = endsWith.startsWith('.') ? endsWith : `.${endsWith}`;
        a.download = fileName.endsWith(finalExtension) ? fileName : fileName + finalExtension;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}