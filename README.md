# ⚾ CV-Val (Computer Vision based Value detector)

![⚾](public/desktop-ico.png)

**CV-Val**은 컴퓨터 비전 기술을 활용하여 야구 경기 및 훈련 영상에서 가치 있는 데이터를 추출하는 분석 도구입니다. 일반적인 카메라로 촬영된 영상에서도 전문 장비 없이 유의미한 야구 정보를 얻는 것을 목표로 합니다.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

---

## ✨ 주요 기능

- **자세 분석 (Pose Analysis)**: 관절 각도, 이동 속도, 회전 속도 및 높이 정보를 프레임별로 데이터화하여 테이블 및 차트로 제공합니다.
- **공 추적 (Ball Tracking)**: 투구 또는 타구된 공의 궤적을 추적하고 데이터를 분석합니다.
- **배트 궤적 (Bat Trajectory)**: 타격 시 배트의 이동 경로를 시각화합니다.
- **커스텀 분석 대시보드**: 사용자가 분석 모듈을 자유롭게 배치하고 크기를 조절할 수 있는 유연한 대시보드를 제공합니다. (현재 `react-grid-layout` 기반)
- **분리형 프레임워크 (Framework-First)**: 분석 엔진(`cv-val-core`)과 도메인 앱(`baseball-app`)을 분리하여 확장성을 확보합니다.
- **플러그인 아키텍처**: 새로운 분석 모델(Pose, Ball, Bat 등)을 플러그인 형태로 손쉽게 추가할 수 있습니다.
- **멀티 플랫폼 엔진**: Web, Electron 환경에서 동일한 데이터 처리 로직을 사용합니다.
- **커스텀 대시보드**: `react-grid-layout` 기반의 유연한 분석 환경을 제공합니다.

## 📱 멀티 플랫폼 지원

브릿지(Bridge) 패턴 아키텍처를 통해 하나의 코드베이스로 다양한 환경을 지원합니다.

- **Web**: 웹 브라우저 기반의 간편한 접근성 제공
- **Desktop (Electron)**: 로컬 파일 시스템 직접 접근 및 네이티브 메뉴 연동
- **Mobile (In Development)**: 모바일 최적화 및 **React Native** 기반의 네이티브 환경 이주 고려 중

## 🛠 기술 스택

- **Core**: React 18, TypeScript
- **Build Tool**: Vite
- **Desktop**: Electron
- **Layout**: React-Grid-Layout (향후 플랫폼 확장에 따라 변경 가능)
- **Styling**: CSS-in-JS (React.CSSProperties) & Shared Variables

## 📂 프로젝트 구조

```text
src/                # React bootstrap and legacy pages
@apps/              # Product shell, feature orchestration, app-specific bridges
@packages/          # Reusable analysis and panel-layout primitives
@shared/            # Shared UI, utilities, and helpers
public/             # Static assets, guides, and runtime model files
ARCHITECTURE.md     # Current project structure guide
```

구조와 책임 분리는 [`ARCHITECTURE.md`](./ARCHITECTURE.md)를 기준으로 확인하는 것이 가장 정확합니다.

## 🚀 시작하기

### 의존성 설치


```bash
npm install
```

### 개발 서버 실행
```bash
# Web 모드
npm run dev

# Electron 모드
npm run electron:dev
```

---
© 2026 Underland Lab. All rights reserved.
