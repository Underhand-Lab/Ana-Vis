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
    surface: '#f8f8f8',
    box: '#f0f0f0',
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

const FONT_STORAGE_KEY = 'cvval_font_preference';
const THEME_STORAGE_KEY = 'cvval_theme_preference';

/**
 * 저장된 설정 또는 시스템 설정에 따른 테마 모드를 반환합니다.
 */
export const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    }
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

// 초기화 시 로컬 스토리지에서 저장된 글꼴 로드
if (typeof window !== 'undefined') {
    const savedFont = localStorage.getItem(FONT_STORAGE_KEY);
    if (savedFont) vars.font = savedFont;
}

/**
 * 테마 모드를 변경하는 함수입니다.
 */
export const setThemeMode = (mode: 'light' | 'dark') => {
    const target = mode === 'light' ? lightTheme : darkTheme;
    Object.assign(vars, target);

    // 테마 변경 시 기본 글꼴로 덮어씌워지는 것을 방지하기 위해 저장된 글꼴 재적용
    const savedFont = localStorage.getItem(FONT_STORAGE_KEY);
    if (savedFont) vars.font = savedFont;

    if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
};

export const setGlobalFont = (font: string) => {
    vars.font = font;
    localStorage.setItem(FONT_STORAGE_KEY, font);
};

export default vars;