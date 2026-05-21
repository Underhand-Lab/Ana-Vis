// 색상 문자열(Hex 또는 RGBA)을 [R, G, B, A(0-255)] 배열로 변환
export const getRgba = (colorStr: string): [number, number, number, number] => {
    if (!colorStr) return [0, 0, 0, 0];

    const rgbaMatch = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1]);
        const g = parseInt(rgbaMatch[2]);
        const b = parseInt(rgbaMatch[3]);
        const a = (rgbaMatch[4] !== undefined && rgbaMatch[4] !== "") ? Math.round(parseFloat(rgbaMatch[4]) * 255) : 255;
        return [r, g, b, a];
    }

    if (colorStr.startsWith('#')) {
        const r = parseInt(colorStr.slice(1, 3), 16);
        const g = parseInt(colorStr.slice(3, 5), 16);
        const b = parseInt(colorStr.slice(5, 7), 16);
        return [r, g, b, 255];
    }

    return [255, 255, 255, 255];
};