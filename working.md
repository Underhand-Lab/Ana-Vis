# Current Task

## Goal

* Make `npm run lint` ignore generated Android and iOS folders so linting stays focused on source code.

## Plan

* [x] Read the existing task instructions and capture project state.
* [x] Inspect the lint configuration and generated platform folders.
* [x] Add ignore rules for `android` and `ios` in ESLint config.
* [x] Verify `npm run lint` no longer traverses generated platform output.

## Progress

* Root `working.md` is being used to track task state.
* The repository includes generated Android and iOS folders from Capacitor.
* ESLint is configured through `eslint.config.ts`.
* Added global ignore rules for `android/**` and `ios/**` so linting stays within source code.
* The latest lint run no longer reported `android` or `ios` files, so the ignore rules are effective.

## Decisions

* Ignore generated platform directories at the ESLint level instead of deleting them.
* Keep the change limited to lint behavior and avoid altering build outputs.

## Pending

* Run `npm run lint` again to confirm the ignore rules resolve the heap issue.

## Issues

* Generated platform folders are present in the repository and can overwhelm repo-wide tools if they are not ignored.
* `npm run lint` still fails for unrelated existing ESLint/TypeScript parsing issues outside the ignored folders.

## Change Log

* 2026-06-19: Initial task created
* 2026-06-19: Project analysis recorded
