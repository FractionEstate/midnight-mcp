# Changelog

All notable changes to this project will be documented in this file.

## v0.3.2 - 2026-01-09

Highlights:
- Add utility helpers for pagination, sanitization, and search query handling
- Improve Next.js integration and add HTTPS support for dev servers
- Add telemetry tracking and improve port/discovery behavior
- Add scheduled docs-sync and CI workflows, nightly docs updates
- Bug fixes: screenshot handling, filter base64 image data, general reliability updates

Full changes (selection):
- feat: Add utility functions for pagination, parameter handling, result creation, sanitization, and search query management (6b29301)
- fix: filter base64 image from screenshot result (#105) (8b8a4e5)
- fix: upgrade Next.js to 16.0.7 (CVE-2025-55182) (#106) (22f7732)
- add nextjs doc llms.txt content as resources (#92) (b892260)
- add telemetry tracking (#85) (dfffb7d)
- docs: add Google Antigravity configuration instructions to README (#111) (6751777)

(See git history for the full commit list.)
