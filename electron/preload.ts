import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
	hudOverlayHide: () => {
		ipcRenderer.send("hud-overlay-hide");
	},
	hudOverlayClose: () => {
		ipcRenderer.send("hud-overlay-close");
	},
	getAssetBasePath: async () => {
		// ask main process for the correct base path (production vs dev)
		return await ipcRenderer.invoke("get-asset-base-path");
	},
	getSources: async (opts: Electron.SourcesOptions) => {
		return await ipcRenderer.invoke("get-sources", opts);
	},
	switchToEditor: () => {
		return ipcRenderer.invoke("switch-to-editor");
	},
	openSourceSelector: () => {
		return ipcRenderer.invoke("open-source-selector");
	},
	selectSource: (source: any) => {
		return ipcRenderer.invoke("select-source", source);
	},
	getSelectedSource: () => {
		return ipcRenderer.invoke("get-selected-source");
	},

	storeRecordedVideo: (videoData: ArrayBuffer, fileName: string) => {
		return ipcRenderer.invoke("store-recorded-video", videoData, fileName);
	},

	getRecordedVideoPath: () => {
		return ipcRenderer.invoke("get-recorded-video-path");
	},
	setRecordingState: (recording: boolean) => {
		return ipcRenderer.invoke("set-recording-state", recording);
	},
	getCursorTelemetry: (videoPath?: string) => {
		return ipcRenderer.invoke("get-cursor-telemetry", videoPath);
	},
	onStopRecordingFromTray: (callback: () => void) => {
		const listener = () => callback();
		ipcRenderer.on("stop-recording-from-tray", listener);
		return () => ipcRenderer.removeListener("stop-recording-from-tray", listener);
	},
	openExternalUrl: (url: string) => {
		return ipcRenderer.invoke("open-external-url", url);
	},
	saveExportedVideo: (videoData: ArrayBuffer, fileName: string) => {
		return ipcRenderer.invoke("save-exported-video", videoData, fileName);
	},
	openVideoFilePicker: () => {
		return ipcRenderer.invoke("open-video-file-picker");
	},
	setCurrentVideoPath: (path: string) => {
		return ipcRenderer.invoke("set-current-video-path", path);
	},
	getCurrentVideoPath: () => {
		return ipcRenderer.invoke("get-current-video-path");
	},
	clearCurrentVideoPath: () => {
		return ipcRenderer.invoke("clear-current-video-path");
	},
	saveProject: (projectData: string, filePath?: string) => {
		return ipcRenderer.invoke("save-project", projectData, filePath);
	},
	openProject: () => {
		return ipcRenderer.invoke("open-project");
	},
	getPlatform: () => {
		return ipcRenderer.invoke("get-platform");
	},
	toggleCameraOverlay: () => {
		return ipcRenderer.invoke("toggle-camera-overlay");
	},
	setSelectedCamera: (deviceId: string | null) => {
		return ipcRenderer.invoke("set-selected-camera", deviceId);
	},
	getSelectedCamera: () => {
		return ipcRenderer.invoke("get-selected-camera");
	},
	toggleCameraEnabled: (enabled?: boolean) => {
		return ipcRenderer.invoke("toggle-camera-enabled", enabled);
	},
	getCameraEnabled: () => {
		return ipcRenderer.invoke("get-camera-enabled");
	},
	downloadVideo: (url: string) => {
		return ipcRenderer.invoke("download-video", url);
	},
	getMobileConnectionInfo: () => {
		return ipcRenderer.invoke("get-mobile-connection-info");
	},
	sendNotification: (opts: { title: string; body: string; silent?: boolean }) => {
		return ipcRenderer.invoke("send-notification", opts);
	},
	getSelectedMic: () => {
		return ipcRenderer.invoke("get-selected-mic");
	},
	setSelectedMic: (deviceId: string | null) => {
		return ipcRenderer.invoke("set-selected-mic", deviceId);
	},
	onDownloadProgress: (callback: (data: { progress: number; url: string }) => void) => {
		const listener = (_: any, data: any) => callback(data);
		ipcRenderer.on("download-progress", listener);
		return () => ipcRenderer.removeListener("download-progress", listener);
	},
});
