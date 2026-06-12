# Agent Execution Rules & Constraints

## 1. Context & State Management

* 모든 작업 진행 상황, 현재 설계 구조, 결정 사항, 다음 작업 목록을 루트의 `working.md`에 유지한다.
* 새 작업 시작 시 `working.md`를 우선 읽어 현재 상태를 파악한다.
* 현재 사용자 요청과 `working.md`가 충돌할 경우 사용자 요청을 우선한다.
* `working.md`와 실제 코드 상태가 다를 경우 실제 코드를 최우선 기준으로 판단한다.
* 주요 설계 변경 또는 작업 완료 시 `working.md`를 즉시 갱신한다.

---

## 2. Planning

* 구현 전에 3~7단계 수준의 간단하고 명확한 작업 계획을 수립한다.
* 수립한 계획은 즉시 `working.md`에 기록한다.
* 완료된 항목은 체크박스 형태(`- [ ]` → `- [x]`)로 실시간 관리한다.
* 계획 달성을 위해 필요한 하위 작업은 수행할 수 있다.
* 사용자 요구 범위를 확장하는 작업은 수행하지 않는다.

---

## 3. Scope Control

* 오직 요청된 범위의 코드만 수정한다.
* 범위 밖의 문제를 발견하면 `working.md`에 기록만 하고 임의 수정하지 않는다.
* 대규모 리팩토링은 반드시 사용자 승인 후 진행한다.
* 기존 정상 동작을 변경하는 수정은 필요성을 확인한 후 진행한다.
* 요구사항에 명시되지 않은 기능 추가를 금지한다.

---

## 4. Code Generation & Architecture

* 단일 파일은 200줄 이하(Soft Cap)를 유지한다.
* 300줄 이상이 예상되면 파일 분리를 검토한다.
* DTO, Schema, 상수 정의 파일은 예외로 허용한다.
* 파일 분할 시 결합도를 낮추고 역할과 책임을 명확히 분리한다.
* 필요 시 Strategy, Adapter, Interface 등의 패턴을 활용한다.
* 과도한 설명성 주석은 작성하지 않는다.
* 코드 자체가 의도를 설명할 수 있도록 작성한다.

---

## 5. Destructive Change Protection

* 사용자 요청 없이 공개 API(Public Interface)를 변경하지 않는다.
* 사용자 요청 없이 DB 스키마를 변경하지 않는다.
* 사용자 요청 없이 의존성을 추가하거나 제거하지 않는다.
* 사용자 요청 없이 설정 파일의 의미나 파라미터를 변경하지 않는다.
* 사용자 요청 없이 데이터 마이그레이션을 수행하지 않는다.

---

## 6. Execution & Verification

* 구현 완료 후 빌드 또는 테스트를 1회 수행한다.
* 실패 시 자동 수정은 최대 1회까지만 허용한다.
* 직전 수정과 동일한 시도를 반복하지 않는다.
* 재실패 시 즉시 작업을 중단한다.
* 실패 원인과 에러 내용을 `working.md`에 기록한다.
* 추측 기반의 반복 수정(Trial & Error)은 금지한다.

---

## 7. Git Rules

* 사용자 요청 없이 commit 하지 않는다.
* 사용자 요청 없이 push 하지 않는다.
* 사용자 요청 없이 branch를 생성하거나 변경하지 않는다.
* 사용자 요청 없이 rebase 하지 않는다.
* `git reset --hard`는 사용자 승인 없이 수행하지 않는다.
* force push는 사용자 승인 없이 수행하지 않는다.

---

## 8. Communication Style (Low-Context)

* 불필요한 인사말, 배경 설명, 미사여구를 생략한다.
* 결과 중심으로 간결하게 보고한다.

### 작업 성공 시 보고 규격

[변경 파일 위치]

* 파일 경로 목록

[핵심 변경 사항]

* 수정 내용 요약

[working.md 업데이트 완료]

---

### 작업 실패 시 보고 규격

[실패 단계]

* 계획 단계 / 구현 단계 / 빌드 단계 등

[에러 원인]

* 핵심 에러 정보

[working.md 업데이트 완료]

---

## 9. Working.md Template

# Current Task

## Goal

*

## Plan

* [ ] Step 1
* [ ] Step 2
* [ ] Step 3

## Progress

*

## Decisions

*

## Pending

*

## Issues

*

## Change Log

* YYYY-MM-DD: Initial task created
