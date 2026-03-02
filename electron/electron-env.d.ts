/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
	interface ProcessEnv {
		/**
		 * The built directory structure
		 *
		 * ```tree
		 * ├─┬─┬ dist
		 * │ │ └── index.html
		 * │ │
		 * │ ├─┬ dist-electron
		 * │ │ ├── main.js
		 * │ │ └── preload.js
		 * │
		 * ```
		 */
		APP_ROOT: string;
		/** /dist/ or /public/ */
		VITE_PUBLIC: string;
	}
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
	electronAPI: {
		getSources: (opts: Electron.SourcesOptions) => Promise<ProcessedDesktopSource[]>;
		switchToEditor: () => Promise<void>;
		openSourceSelector: () => Promise<void>;
		selectSource: (source: any) => Promise<any>;
		getSelectedSource: () => Promise<any>;
		storeRecordedVideo: (
			videoData: ArrayBuffer,
			fileName: string,
		) => Promise<{ success: boolean; path?: string; message?: string }>;
		getRecordedVideoPath: () => Promise<{ success: boolean; path?: string; message?: string }>;
		setRecordingState: (recording: boolean) => Promise<void>;
		getCursorTelemetry: (
			videoPath?: string,
		) => Promise<{
			success: boolean;
			samples: CursorTelemetryPoint[];
			message?: string;
			error?: string;
		}>;
		onStopRecordingFromTray: (callback: () => void) => () => void;
		openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
		saveExportedVideo: (
			videoData: ArrayBuffer,
			fileName: string,
		) => Promise<{ success: boolean; path?: string; message?: string; cancelled?: boolean }>;
		openVideoFilePicker: () => Promise<{ success: boolean; path?: string; cancelled?: boolean }>;
		setCurrentVideoPath: (path: string) => Promise<{ success: boolean }>;
		getCurrentVideoPath: () => Promise<{ success: boolean; path?: string }>;
		clearCurrentVideoPath: () => Promise<{ success: boolean }>;
		getPlatform: () => Promise<string>;
		hudOverlayHide: () => void;
		hudOverlayClose: () => void;
		saveProject: (
			projectData: string,
			filePath?: string,
		) => Promise<{
			success: boolean;
			path?: string;
			message?: string;
			error?: string;
			cancelled?: boolean;
		}>;
		openProject: () => Promise<{
			success: boolean;
			path?: string;
			data?: string;
			message?: string;
			error?: string;
			cancelled?: boolean;
		}>;
		downloadVideo: (
			url: string,
		) => Promise<{ success: boolean; message: string; error?: string; output?: string }>;
		// WebCam support
		setSelectedCamera: (deviceId: string | null) => Promise<{ success: boolean }>;
		getSelectedCamera: () => Promise<string | null>;
		toggleCameraEnabled: (enabled?: boolean) => Promise<boolean>;
		getCameraEnabled: () => Promise<boolean>;
		toggleCameraOverlay: () => Promise<boolean>;
		sendNotification: (opts: { title: string; body: string; silent?: boolean }) => Promise<{ success: boolean; error?: string }>;
		setSelectedMic: (deviceId: string | null) => Promise<{ success: boolean }>;
		getSelectedMic: () => Promise<string | null>;
	};
}

interface ProcessedDesktopSource {
	id: string;
	name: string;
	display_id: string;
	thumbnail: string | null;
	appIcon: string | null;
}

interface CursorTelemetryPoint {
	timeMs: number;
	cx: number;
	cy: number;
}
