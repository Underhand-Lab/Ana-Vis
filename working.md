# Current Task

## Goal

* Restore and complete the project structure cleanup after merge loss.

## Plan

* [x] Read the existing task instructions and capture project state.
* [x] Inspect the current app entry points, README, and legacy pages.
* [x] Remove unused legacy page implementations under `src/_legacy`.
* [x] Simplify `src/App.tsx` and `src/main.tsx` so bootstrap responsibilities are clear.
* [x] Update README and architecture notes to reflect the real folder layout.
* [x] Verify `npm run lint` still passes after the cleanup.

## Progress

* The repository currently has legacy page files under `src/_legacy/pages` that are no longer used by the active app shell.
* `src/App.tsx` currently mixes routing with a mobile drag-and-drop polyfill.
* `src/main.tsx` still contains i18n bootstrap only, so it is a good place to own runtime setup.
* The unused legacy page implementations were deleted again.
* The mobile drag-and-drop polyfill now lives in `src/main.tsx`.
* README and architecture notes now reflect the actual folder roles instead of the older layout.
* `npm run lint` passes with zero warnings and zero errors.

## Decisions

* Remove dead legacy page code instead of keeping it documented-only.
* Move runtime bootstrap concerns into `src/main.tsx` and keep `src/App.tsx` focused on composition.

## Pending

* None for this task.

## Issues

* None currently noted for this cleanup.

## Change Log

* 2026-06-19: Initial task created
* 2026-06-19: Project analysis recorded
