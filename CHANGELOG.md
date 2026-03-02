# Changelog

All notable changes to **The Uprising Screenrecorder** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.1] - 2026-03-02

### Added

- **Cursor Visualization**: Added toggleable cursor highlighters in the editor and during export for clearer UI walkthroughs.
- **Empty States**: Added "No cameras/microphones found" fallbacks in the source selector for better user feedback.
- **Project Deletion Guard**: Added a confirmation prompt before deleting projects from the dashboard.

### Changed

- **Improved Downloader**: Refactored `download-video` to use `spawn` for real-time progress updates and automatic project integration.
- **App Title**: Updated window title to "The Uprising Screen Recorder".
- **Enhanced Types**: Improved ElectronAPI TypeScript definitions for audio devices, ensuring better code reliability.

### Fixed

- **Notification Assets**: Fixed broken icon paths in packaged Windows builds for completion alerts.
- **Rename Logic**: Fixed a bug where cancelling project renaming with Escape would still trigger a rename via blur.
- **Multimonitor Cursors**: Fixed coordinate normalization for cursor telemetry on multi-monitor setups.
- **Recording Stability**: Added safeguards against `localStorage` errors and failed video saves preventing editor activation.

## [1.2.0] - 2026-03-01

### Added

- **Dual Audio Mixing**: Simultaneous capture and mixing of System Audio and Microphone.
- **WebCam PiP Integration**: Real-time circular webcam overlay (Picture-in-Picture) mirrored and composited into recordings.
- **Speed Control**: Variable playback speed from 0.5x to 4x, preserved during export.
- **Project Dashboard**: A new high-fidelity landing screen inspired by Premiere Pro.
- **Notes & Ideas Board**: Built-in system for planning videos and saving research.
- **Idea Downloader**: Integrated `yt-dlp` support for YouTube and Instagram video downloads.
- **Mobile Access**: Local server allowing mobile devices to view and edit notes/ideas.
- **Custom Fonts**: Support for user-installed fonts in annotations.
- **Cursor Telemetry**: 100% rendering of smooth cursor paths in exported videos.
- **AI Automatic Captions**: Browser-based Speech-to-Text, optimized for French (fr-FR).
- **Caption Export**: Captions rendered directly into exported MP4 and GIF files.
- **Discord-Style Changelog**: In-app "What's New" dialog with version history.
- **GitHub Release Automation**: Tag-based CI/CD with multi-platform builds and release notes.

### Changed

- **Rebranding**: Complete UI overhaul to a professional Indigo Blue theme.
- **Project Structure**: Renamed to "The Screenrecorder" with updated metadata.
- **Performance**: Optimized export worker for better memory management on low-end devices.
- **Caption Hook**: Improved word-count based timing for more natural subtitle durations.

### Fixed

- **File Protocol**: Resolved double-protocol error in video loading.
- **Accessibility**: Added descriptive titles and labels for screen readers.
- **Stability**: Fixed memory leaks during long recording sessions.
- **Custom Fonts**: Fixed missing `loadAllCustomFonts` import in App entry point.

---
*Based on the original [OpenScreen](https://github.com/siddharthvaddem/openscreen) foundation by Siddharth Vaddem.*
