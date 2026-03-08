import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron";
import { autoUpdater } from "electron-updater";
import { registerIpcHandlers } from "./ipc/handlers";
import { getRecordingsDir } from "./paths";
import {
	createCameraOverlayWindow,
	createEditorWindow,
	createHudOverlayWindow,
	createSourceSelectorWindow,
	registerWindowsIpcHandlers,
} from "./windows";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Performance / Hardware Acceleration Flags
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("enable-hardware-overlays", "single-fullscreen");
app.commandLine.appendSwitch("ignore-gpu-blocklist");

async function ensureRecordingsDir() {
	try {
		await fs.mkdir(getRecordingsDir(), { recursive: true });
		console.log("RECORDINGS_DIR:", getRecordingsDir());
		console.log("User Data Path:", app.getPath("userData"));
	} catch (error) {
		console.error("Failed to create recordings directory:", error);
	}
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
	? path.join(process.env.APP_ROOT, "public")
	: RENDERER_DIST;

// Window references
let mainWindow: BrowserWindow | null = null;
let sourceSelectorWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let selectedSourceName = "";

// Tray Icons
const defaultTrayIcon = getTrayIcon("openscreen.png");
const recordingTrayIcon = getTrayIcon("rec-button.png");

function createWindow() {
	mainWindow = createHudOverlayWindow();
}

function createTray() {
	tray = new Tray(defaultTrayIcon);
}

function getTrayIcon(filename: string) {
	return nativeImage
		.createFromPath(path.join(process.env.VITE_PUBLIC || RENDERER_DIST, filename))
		.resize({
			width: 24,
			height: 24,
			quality: "best",
		});
}

function updateTrayMenu(recording: boolean = false) {
	if (!tray) return;
	const trayIcon = recording ? recordingTrayIcon : defaultTrayIcon;
	const trayToolTip = recording ? `Recording: ${selectedSourceName}` : "The Screenrecorder";
	const menuTemplate = recording
		? [
				{
					label: "Stop Recording",
					click: () => {
						if (mainWindow && !mainWindow.isDestroyed()) {
							mainWindow.webContents.send("stop-recording-from-tray");
						}
					},
				},
			]
		: [
				{
					label: "Open",
					click: () => {
						if (mainWindow && !mainWindow.isDestroyed()) {
							mainWindow.isMinimized() && mainWindow.restore();
						} else {
							createWindow();
						}
					},
				},
				{
					label: "Quit",
					click: () => {
						app.quit();
					},
				},
			];
	tray.setImage(trayIcon);
	tray.setToolTip(trayToolTip);

	const updateMenu = [
		{ type: "separator" as const },
		{
			label: "Check for Updates...",
			click: () => {
				autoUpdater.checkForUpdatesAndNotify();
			},
		},
	];

	tray.setContextMenu(Menu.buildFromTemplate([...menuTemplate, ...updateMenu]));
}

function createEditorWindowWrapper() {
	if (mainWindow) {
		mainWindow.close();
		mainWindow = null;
	}
	mainWindow = createEditorWindow();
}

function createSourceSelectorWindowWrapper() {
	sourceSelectorWindow = createSourceSelectorWindow();
	sourceSelectorWindow?.on("closed", () => {
		sourceSelectorWindow = null;
	});
	return sourceSelectorWindow;
}

// On macOS, applications and their menu bar stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	// Keep app running (macOS behavior)
});

app.on("activate", () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// Register all IPC handlers when app is ready
app.whenReady().then(async () => {
	// Listen for HUD overlay quit event (macOS only)
	ipcMain.on("hud-overlay-close", () => {
		app.quit();
	});
	createTray();
	updateTrayMenu();
	// Ensure recordings directory exists
	await ensureRecordingsDir();

	registerWindowsIpcHandlers();
	registerIpcHandlers(
		createEditorWindowWrapper,
		createSourceSelectorWindowWrapper,
		() => mainWindow,
		() => sourceSelectorWindow,
		(recording: boolean, sourceName: string) => {
			selectedSourceName = sourceName;
			if (!tray) createTray();
			updateTrayMenu(recording);
			if (!recording) {
				if (mainWindow) mainWindow.restore();
			}
		},
		() => {
			return createCameraOverlayWindow();
		},
	);

	// Auto Update configuration
	autoUpdater.on("update-available", () => {
		console.log("Update available.");
	});
	autoUpdater.on("update-downloaded", () => {
		console.log("Update downloaded; will install in 5 seconds");
	});
	autoUpdater.checkForUpdatesAndNotify();

	createWindow();
});
