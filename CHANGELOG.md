# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
when versioning releases.

## [Unreleased]

### Added
- Added locale-aware streamed BGM system with per-track loop constraints.
- Added dev-only BGM loop editor (playback scrubber, start/end tuning, first-pass toggle).
- Added transient-based auto-constrain workflow for loop markers.
- Added copy-constraints workflow to reuse loop data across alternate voice/version tracks.
- Added local/runtime persistence for BGM constraints to survive app closure.
- Added export and analysis scripts for BGM loop constraints.
- Added new favicon pipeline output and home menu cupcake graphic from updated source art.
- Added Supabase client wiring and profiles table store for backend user tiers.
- Added runtime free/paid gate resolution from Supabase profile entitlements.
- Added initial profile auth support (Google and email/password APIs) in auth context.

### Changed
- Switched customer portraits to sprite organizer indexing flow.
- Reworked owner portrait pipeline and dialogue mappings for locales.
- Updated locale scene/baked good asset handling and references.
- Ensured BGM editor and related debug controls are dev-only.
- Updated build config context to respond to runtime tier changes from backend profiles.

### Fixed
- Fixed non-seamless streamed loop behavior by applying explicit loop markers.
- Fixed music not switching back correctly on navigation to main menu.
- Fixed overlapping playback when adjusting loop tuning controls.
- Fixed locale track mapping so each locale uses its own intended BGM file.

## [2026-05-05]

### Added
- Introduced large sprite/audio migration and locale BGM tuning toolchain.

