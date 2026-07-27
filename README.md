# CV-Val

CV-Val은 야구 영상에서 자세, 공, 배트 움직임을 추출하고 검증하기 위한 컴퓨터 비전 분석 도구입니다. 하나의 React/TypeScript 코드베이스로 웹, Electron 데스크톱, Capacitor 모바일 빌드를 지원하며, 분석 결과를 패널형 대시보드에서 영상, 그래프, 테이블, 편집 도구로 확인하는 것을 목표로 합니다.

## 주요 기능

* 자세 분석: MediaPipe Pose 모델을 사용해 관절 각도, 각속도, 속도, 높이, GRF 관련 지표를 계산합니다.
* 공 추적: YOLO 기반 모델로 야구공 위치를 추적하고 궤적 데이터를 분석합니다.
* 배트 추적: YOLO segmentation 모델로 배트 후보와 궤적을 다룹니다.
* 패널 대시보드: Video, Pose 3D, Graph, Table, EditTrackBall, EditTrackBat 모듈을 추가하고 재배치할 수 있습니다.
* 데이터 파일 처리: `.cvp`, `.cvbl`, `.cvbt`, `.cvval` 분석 데이터와 주요 비디오 파일을 불러오고 저장합니다.
* 런타임 모델 로딩: `public/external/models` 아래의 MediaPipe, YOLO 모델 파일을 브라우저/Electron 런타임에서 사용합니다.
* 플랫폼 브리지: 웹, Electron, 모바일 환경별 파일 처리와 내비게이션 차이를 브리지 계층으로 흡수합니다.

## 기술 스택

* Frontend: React 19, TypeScript, Vite
* Desktop: Electron, electron-vite, electron-builder
* Mobile: Capacitor Android/iOS
* CV/ML: MediaPipe Tasks Vision, TensorFlow.js, YOLO web model assets
* Visualization: Chart.js, Three.js
* UI/Layout: React Resizable Panels, React Grid Layout, custom UI bridge components
* Media: Mediabunny
* Localization: i18next, react-i18next

## 프로젝트 구조

```text
src/
  main.tsx              # React bootstrap
  App.tsx               # HashRouter, external file bridge, main AppPage 연결
  _legacy/              # 이전 페이지 구현 보관 영역

@apps/
  FeatureRegistry.ts    # 기능별 detector/tool/module 등록
  pages/                # 현재 앱 shell
  features/             # pose, track-ball, track-bat, app 설정 UI
  common/               # 플랫폼별 브리지와 외부 파일 핸들러

@packages/
  cv-val/               # 분석 데이터, detector/processor, 모듈, hooks
  panel-layout/         # 재사용 가능한 패널 레이아웃 시스템

@shared/
  bridges/              # UI bridge abstraction
  components/           # 공용 컴포넌트
  service/              # 영상/이미지 변환 서비스
  utils/                # 저장, 내보내기, i18n, 수학 유틸

public/
  external/models/      # 런타임 CV 모델 파일
  guide/                # 기능별 Markdown 가이드
```

상세한 책임 분리는 [ARCHITECTURE.md](./ARCHITECTURE.md)를 함께 참고하세요.

## 실행 방법

```bash
npm install
npm run dev
```

Electron 개발 모드:

```bash
npm run dev:electron
```

빌드:

```bash
npm run build:web
npm run build:electron
npm run build:mobile
```

플랫폼 프로젝트 동기화 및 열기:

```bash
npm run build:ios
npm run build:android
```

검사:

```bash
npm run lint
```

## 데이터와 모델

분석 기능은 `@apps/FeatureRegistry.ts`에 등록된 detector와 analysis tool 구성을 기준으로 동작합니다. 모델 파일은 저장소의 `public/external/models`에 포함되어 있으며, 빌드 결과에서 상대 경로 `./external/models/...`로 로드됩니다.

현재 등록된 기능:

* `pose`: MediaPipe Heavy/Full/Lite 모델, 각도/각속도/속도/높이/GRF 분석
* `ball`: YOLO11 계열 ball detector, 공 분석 도구
* `bat`: YOLO11 segmentation 계열 bat detector, 배트 분석 도구, 배트 영상/편집 플러그인

## 기능 가이드

* [자세 분석 가이드](./public/guide/pose.md)
* [공 추적 가이드](./public/guide/track-ball.md)
* [배트 추적 가이드](./public/guide/track-bat.md)

## 개발 참고

* 새 분석 도메인은 `@apps/features/<domain>`에 기능별 데이터, detector, plugin, tool을 추가한 뒤 `@apps/FeatureRegistry.ts`에 등록합니다.
* 공통 분석 흐름이나 패널 모듈은 `@packages/cv-val` 또는 `@packages/panel-layout`에 둡니다.
* 플랫폼 차이는 `@apps/common/bridges`와 `@shared/bridges`를 통해 처리합니다.
* `src/_legacy`는 참고용 영역으로 보고, 명시적인 마이그레이션 작업이 없으면 신규 기능의 기준으로 삼지 않습니다.

## 라이선스

© 2026 Underland Lab. All rights reserved.
