# Current Task

## Goal

* Process the items listed in `todo.md`.

## Plan

* [x] Read `todo.md`, current `working.md`, lint config, and worktree state.
* [x] Handle documentation and onboarding TODO items.
* [x] Handle lint/generated-folder TODO items.
* [x] Inspect feature and platform TODO items, then implement safe scoped fixes.
* [x] Run one verification pass and record results.
* [x] Update `todo.md` checkboxes according to completed work.

## Progress

* Current `todo.md` has documentation, lint quality, feature behavior, platform support, and structure cleanup items.
* `eslint.config.ts` currently ignores `dist`, `android/**`, and `ios/**`, but not `expo-app/dist`.
* Expanded `ARCHITECTURE.md` with data flow, module lifecycle, save formats, platform matrix, build asset notes, feature registry loading, and structure cleanup decisions.
* Renamed `public/guide/tarck-ball.md` to `public/guide/track-ball.md` and updated feature guides for the current UI flow.
* Added `typescript-eslint`, updated ESLint ignores/config, and verified `npm run lint` exits successfully with warnings only.
* Added `npm run test:data` for PoseData, TrackBallData, TrackBatData, and CVValData storage smoke coverage.
* Added processing error messages and common cancellation flow in `useProcessor`/`Processor`/`VideoProcessorModal`.
* Added a bat analysis tool and aligned `hasEditor` with existing edit modules.
* Added a Pose 3D empty state when pose data is absent.
* Measured model/build assets: `public/external/models` is about 1.0GB with 272 files; `dist` is about 1.0GB after web build.
* Verification passed: `npm run test:data`, `npm run lint`, `npm run build:web`, and sequential `npm run build:electron`.

## Decisions

* Treat `todo.md` as the authoritative task list.
* Avoid large refactors or public API changes while processing TODO items.

## Pending

* None for this TODO processing task.

## Issues

* `npm install -D typescript-eslint` reported existing audit issues: 34 vulnerabilities.
* Vite still reports large chunk warnings because the main application bundle exceeds 500kB.
* Detector cancellation stops the common processing flow between async detector steps; immediate abort inside a model's own `process()` call would require a detector-level abort contract.

## Change Log

* 2026-07-27: Documentation analysis task created.
* 2026-07-27: Updated `README.md` and `todo.md`; recorded lint verification failure.
* 2026-07-27: Electron startup error investigation started.
* 2026-07-27: Fixed Electron updater import/initialization and fullscreen IPC handler; verified Electron dev startup.
* 2026-07-27: Started processing `todo.md`.
* 2026-07-27: Completed `todo.md` implementation, documentation, and verification pass.
