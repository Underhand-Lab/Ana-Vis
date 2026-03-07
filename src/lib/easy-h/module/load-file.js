export async function loadFile(src) {
    const response = await fetch(src);
    if (!response.ok) {
        throw new Error(`실패: ${response.statusText}`);
    }
    return await response.text();
}