# 현재 프로젝트는 아래의 구조

- 각 분석 방식마다 아래의 요소를 가짐
    - 1차 분석 결과 데이터
        - cvbl(공 추적, track-ball-data.ts), cvbt(배트 궤적, track-bat-data.ts), cvp(자세, pose-data.ts)
    - 1차 분석 결과를 기반으로 추가 분석하는 2차 분석 알고리즘
        - pose
            - analysis-velocity.ts
            - angle.ts
            - grf-tool.ts
            - velocitu.ts
        - track-ball
            - analysis.ts
    - 1차, 2차 분석 결과 시각화 컴포넌트
        - PoseGraphModule, PoseVideoModule, TrackBallVideoModule 등

# 변경 프로젝트 구조
- 모든 분석 결과는 하나의 파일로 묶임
    - cvval-data.ts
    - 각각의 분석은 타입으로 저장
        - ```CVValData.set('pose', new PoseData())```
        - ```CVValData.set('ball', new TrackBallData())```
- 2차 분석 알고리즘을 지정할 수 있음
    - ```CVValData.addPlugin('pose', new GRFTool())```
- 분석 시각화 컴포넌트는 각각의 기능을 가짐
    - VideoModule
        - CVValData.exist('pose')일 경우 포즈 그리기
        - CVValData.exist('ball')일 경우 공 궤적 그리기
        - CVValData.exist('bat')일 경우 배트 궤적 그리기
    - TableModule, GraphModule
        - CVValData.getAnalysisResults('pose' || 'ball' || 'bat')에 출력 값이 존재하는 경우 각각을 렌더링
    - 3DVideoModule
        - CVValData.exist('pose')일 경우 포즈 그리기