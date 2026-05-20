export interface ThemeVars {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    box: string;
    text: string;
    font: string;
}

export const lightTheme: ThemeVars = {
    primary: '#6799fa',
    secondary: 'rgb(28, 36, 74)',
    background: '#ccc',
    surface: '#d8d8d8',
    box: '#ddd',
    text: '#1c244a',
    font: "'KBO-Dia-Gothic_medium', Arial, sans-serif",
};

export const darkTheme: ThemeVars = {
    primary: '#6799fa',
    secondary: 'rgb(28, 36, 74)',
    background: '#101010',
    surface: '#313131',
    box: '#212121',
    text: '#ddd',
    font: "'KBO-Dia-Gothic_medium', Arial, sans-serif",
};

/**
 * 시스템(OS) 설정에 따른 테마 모드를 반환합니다.
 */
export const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
};

/**
 * 애플리케이션 전역에서 참조할 가변 변수 객체입니다.
 * Object.assign을 통해 참조 주소를 유지하며 값을 변경합니다.
 */
const initialMode = getSystemTheme();
export const vars: ThemeVars = { ...(initialMode === 'dark' ? darkTheme : lightTheme) };

/**
 * 테마 모드를 변경하는 함수입니다.
 */
export const setThemeMode = (mode: 'light' | 'dark') => {
    const target = mode === 'light' ? lightTheme : darkTheme;
    Object.assign(vars, target);
};

export default vars;