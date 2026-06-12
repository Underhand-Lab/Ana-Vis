# Agent Execution Rules & Constraints

## 1. Context & State Management (Cost Saving)
- 모든 작업 진행 상황, 현재 설계 구조, 다음 할 일 목록을 루트의 `working.md` 파일에 요약본으로 실시간 저장하라.
- 다음 턴(Task)을 시작할 때는 이전의 긴 대화 기록을 새로 읽지 말고, 오직 이 `working.md` 파일만 읽고 맥락을 파악하라.

## 2. Code Generation & Architecture
- 한 파일에 코드 줄 수가 너무 많아지지 않게 여러 파일로 분할하라. (소프트캡 200줄 제한)
- 파일을 분할할 때는 결합도를 낮추고 쉽게 교체 가능한(Consumable) 구조로 설계하라. 역할 분담을 위해 필요 시 인터페이스나 디자인 패턴(Strategy, Adapter 등)을 적극 활용하라.
- 코드 내부에 과도한 설명성 주석 작성을 금지한다. 코드는 간결하고 명확하게 작성하라.

## 3. Execution & Loop Prevention
- 에이전트는 코드 수정 후 최대 1회만 빌드/테스트를 수행한다.
- 만약 컴파일 에러나 테스트 실패가 발생하면 스스로 수정을 반복하지 마라. 즉시 중단하고 에러 원인을 `working.md`에 기록한 뒤 사용자에게 제어권을 넘겨라.

## 4. Communication Style
- 불필요한 미사여구나 인사말, 장황한 설명은 생략한다. (Low-Context)
- 작업 완료 시 오직 [변경 파일 위치], [핵심 변경 사항], [`working.md` 업데이트 완료] 3가지만 컴팩트하게 보고하라.