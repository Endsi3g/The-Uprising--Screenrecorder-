"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  hudOverlayHide: () => {
    electron.ipcRenderer.send("hud-overlay-hide");
  },
  hudOverlayClose: () => {
    electron.ipcRenderer.send("hud-overlay-close");
  },
  getAssetBasePath: async () => {
    return await electron.ipcRenderer.invoke("get-asset-base-path");
  },
  getSources: async (opts) => {
    return await electron.ipcRenderer.invoke("get-sources", opts);
  },
  switchToEditor: () => {
    return electron.ipcRenderer.invoke("switch-to-editor");
  },
  openSourceSelector: () => {
    return electron.ipcRenderer.invoke("open-source-selector");
  },
  selectSource: (source) => {
    return electron.ipcRenderer.invoke("select-source", source);
  },
  getSelectedSource: () => {
    return electron.ipcRenderer.invoke("get-selected-source");
  },
  storeRecordedVideo: (videoData, fileName) => {
    return electron.ipcRenderer.invoke("store-recorded-video", videoData, fileName);
  },
  getRecordedVideoPath: () => {
    return electron.ipcRenderer.invoke("get-recorded-video-path");
  },
  setRecordingState: (recording) => {
    return electron.ipcRenderer.invoke("set-recording-state", recording);
  },
  getCursorTelemetry: (videoPath) => {
    return electron.ipcRenderer.invoke("get-cursor-telemetry", videoPath);
  },
  onStopRecordingFromTray: (callback) => {
    const listener = () => callback();
    electron.ipcRenderer.on("stop-recording-from-tray", listener);
    return () => electron.ipcRenderer.removeListener("stop-recording-from-tray", listener);
  },
  openExternalUrl: (url) => {
    return electron.ipcRenderer.invoke("open-external-url", url);
  },
  saveExportedVideo: (videoData, fileName) => {
    return electron.ipcRenderer.invoke("save-exported-video", videoData, fileName);
  },
  openVideoFilePicker: () => {
    return electron.ipcRenderer.invoke("open-video-file-picker");
  },
  setCurrentVideoPath: (path) => {
    return electron.ipcRenderer.invoke("set-current-video-path", path);
  },
  getCurrentVideoPath: () => {
    return electron.ipcRenderer.invoke("get-current-video-path");
  },
  clearCurrentVideoPath: () => {
    return electron.ipcRenderer.invoke("clear-current-video-path");
  },
  saveProject: (projectData, filePath) => {
    return electron.ipcRenderer.invoke("save-project", projectData, filePath);
  },
  openProject: () => {
    return electron.ipcRenderer.invoke("open-project");
  },
  getPlatform: () => {
    return electron.ipcRenderer.invoke("get-platform");
  },
  toggleCameraOverlay: () => {
    return electron.ipcRenderer.invoke("toggle-camera-overlay");
  },
  setSelectedCamera: (deviceId) => {
    return electron.ipcRenderer.invoke("set-selected-camera", deviceId);
  },
  getSelectedCamera: () => {
    return electron.ipcRenderer.invoke("get-selected-camera");
  },
  toggleCameraEnabled: (enabled) => {
    return electron.ipcRenderer.invoke("toggle-camera-enabled", enabled);
  },
  getCameraEnabled: () => {
    return electron.ipcRenderer.invoke("get-camera-enabled");
  },
  downloadVideo: (url) => {
    return electron.ipcRenderer.invoke("download-video", url);
  },
  getMobileConnectionInfo: () => {
    return electron.ipcRenderer.invoke("get-mobile-connection-info");
  },
  getIdeas: () => {
    return electron.ipcRenderer.invoke("get-ideas");
  },
  saveIdeas: (ideas) => {
    return electron.ipcRenderer.invoke("save-ideas", ideas);
  },
  getDashboardProjects: () => {
    return electron.ipcRenderer.invoke("get-dashboard-projects");
  },
  saveDashboardProjects: (projects) => {
    return electron.ipcRenderer.invoke("save-dashboard-projects", projects);
  },
  sendNotification: (opts) => {
    return electron.ipcRenderer.invoke("send-notification", opts);
  },
  getSelectedMic: () => {
    return electron.ipcRenderer.invoke("get-selected-mic");
  },
  setSelectedMic: (deviceId) => {
    return electron.ipcRenderer.invoke("set-selected-mic", deviceId);
  },
  onDownloadProgress: (callback) => {
    const listener = (_, data) => callback(data);
    electron.ipcRenderer.on("download-progress", listener);
    return () => electron.ipcRenderer.removeListener("download-progress", listener);
  }
});
