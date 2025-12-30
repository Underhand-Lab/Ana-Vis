const dictdict = {};
let langKey = 'en';
let defaultKey = null;
let observers = new Set();
let pendingKey = null;

// 로딩 추적을 위한 상태 변수
let pendingSources = new Set();

function isLoaded() {
    if (pendingSources.size === 0) return true;
    if (langKey && langKey in dictdict) return true;
    
    return false;
}

/** 관찰자에게 알림 */
function notify() {
    if (!isLoaded()) return;
    
    observers.forEach(obs => {
        if (typeof obs.onChange === 'function') obs.onChange();
    });
}

/** [중요] 로드 상태 추적 함수들 */
export function registerPendingSource(src) {
    pendingSources.add(src);
}

export function resolvePendingSource(src) {
    pendingSources.delete(src);
    notify();
}

export function getTranslation(key) {

    if (dictdict[langKey] && key in dictdict[langKey]) {
        return dictdict[langKey][key];
    }
    
    // 2. 기본 언어(default) 사전 확인
    if (defaultKey && dictdict[defaultKey] && key in dictdict[defaultKey]) {
        return dictdict[defaultKey][key];
    }

    return key;
}

export function addDictionary(key, dict, src) {
    const keys = key.split(" ");
    
    // HTML에 작성된 e-text-set 중 첫 번째 요소의 src를 가져옴
    const firstSet = document.querySelector('e-text-set');
    const firstSrc = firstSet ? firstSet.getAttribute('src') : null;

    // 현재 로드된 src가 HTML상 첫 번째 src와 일치한다면 이 녀석이 주인공(default)
    if (defaultKey == null && src === firstSrc) {
        defaultKey = keys[0];
    }

    for (let k of keys) {
        dictdict[k] = dict;
    }

    if (pendingKey && keys.includes(pendingKey)) {
        langKey = pendingKey;
        pendingKey = null;
    }
    notify();
}

export function setKey(key) {
    langKey = key;
    notify();
}

export function addObserver(observer) {
    observers.add(observer);
    if (!isLoaded()) return;
    if (typeof observer.onChange === 'function') observer.onChange();
}

export function removeObserver(observer) {
    observers.delete(observer);
}

const urlParams = new URLSearchParams(window.location.search);
const urlLang = urlParams.get('lang');

if (urlLang) langKey = urlLang;
else langKey = navigator.language.split('-')[0];