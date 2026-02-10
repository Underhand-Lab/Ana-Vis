export async function saveBlobWithPicker(
    blob, suggestedName = "default.txt", types, excludeAcceptAllOption = false, endsWith = "txt") {
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: types,
                excludeAcceptAllOption: excludeAcceptAllOption
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (err) {
            if (err.name !== 'AbortError')
                console.error("저장 실패:", err);
        }
    } else {
        // 2. 미지원 브라우저 (폴백: 기본 다운로드 방식)
        const fileName = prompt("파일 이름을 입력하세요:", suggestedName) || suggestedName;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName.endsWith(endsWith) ? fileName : fileName + endsWith;
        a.click();
        URL.revokeObjectURL(url);
    }
}
