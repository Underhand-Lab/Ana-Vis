# Project Architecture

## Overview

CV-Val is a Vite-based React application that targets web, Electron desktop, and Capacitor mobile builds from a single codebase.

The current codebase is organized around three top-level layers:

* `@apps` for product-level screens, feature orchestration, and app-specific bridges
* `@packages` for reusable analysis and panel-layout primitives
* `@shared` for UI primitives, utilities, and cross-app helpers

## Current Structure

```text
src/
  main.tsx          # React bootstrap
  App.tsx           # Hash router + platform bridges
  _legacy/          # Older page implementations kept for reference

@apps/
  pages/            # App shell and top-level pages
  features/         # Domain features such as pose, ball, and bat
  common/           # App-specific bridges and handlers

@packages/
  cv-val/           # Core data, detectors, hooks, and modules
  panel-layout/     # Generic panel layout system

@shared/
  bridges/          # UI bridge abstraction
  components/       # Shared UI components
  utils/            # Shared utilities
  service/          # Media / export helpers

public/
  external/models/  # Runtime model assets
  guide/            # Markdown guides
  *.md              # Home page content blocks
```

## Design Notes

* `AppPage` is the current composition root for the main product UI.
* `FeatureRegistry` acts as the feature wiring layer for detectors, analysis tools, and modules.
* `src/_legacy/pages` should be treated as historical or fallback code unless a migration explicitly targets it.
* `public/external/models` is large by design because model assets are loaded at runtime by the browser/Electron app.

## Practical Guidance

* Add new feature-specific code under `@apps/features/<domain>` when it belongs to a product flow.
* Add reusable analysis or layout primitives under `@packages`.
* Add generic UI and utility code under `@shared`.
* Prefer updating `FeatureRegistry` and the domain feature folder together when introducing a new analysis feature.

