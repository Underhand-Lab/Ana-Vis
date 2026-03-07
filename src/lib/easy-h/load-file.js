export function loadFile(src) {
    return fetch(src).then(response => {
        if (!response.ok) {
            throw new Error(`실패: ${response.statusText}`);
        }
        return response.text();
    });
}