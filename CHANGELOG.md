# Changelog

All notable changes to **The Uprising Screenrecorder** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
