import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import cors from "cors";
import { app, BrowserWindow, desktopCapturer, dialog, ipcMain, Notification, screen, shell } from "electron";
import express from "express";
import { RECORDINGS_DIR } from "../main";

const CURSOR_TELEMETRY_VERSION = 1;
const CURSOR_SAMPLE_INTERVAL_MS = 100; // 10Hz sampling
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

interface CursorTelemetryPoint {
	timeMs: number;
	cx: number;
	cy: number;
}

export function registerIpcHandlers(
	createEditorWindow: () => void,
	createSourceSelectorWindow: () => BrowserWindow,
	getMainWindow: () => BrowserWindow | null,
	getSourceSelectorWindow: () => BrowserWindow | null,
	onRecordingStateChange?: (recording: boolean, sourceName: string) => void,
	createCameraOverlayWindow?: () => BrowserWindow,
) {
	let selectedSource: Electron.DesktopCapturerSource | null = null;
	let selectedMicId: string | null = null;
	let currentVideoPath: string | null = null;
	let cameraOverlayWin: BrowserWindow | null = null;

	let activeCursorSamples: CursorTelemetryPoint[] = [];
	let pendingCursorSamples: CursorTelemetryPoint[] = [];
	let cursorCaptureInterval: NodeJS.Timeout | null = null;
	let cursorCaptureStartTimeMs: number = 0;

	const sampleCursorPoint = () => {
		const { x, y } = screen.getCursorScreenPoint();
		const display = screen.getDisplayNearestPoint({ x, y });
		const { x: displayX, y: displayY, width, height } = display.bounds;

		// Calculate coordinates relative to the specific display's origin
		const rx = (x - displayX) / width;
		const ry = (y - displayY) / height;

		activeCursorSamples.push({
			timeMs: Date.now() - cursorCaptureStartTimeMs,
			cx: clamp(rx, 0, 1),
			cy: clamp(ry, 0, 1),
		});
	};

	const stopCursorCapture = () => {
		if (cursorCaptureInterval) {
			clearInterval(cursorCaptureInterval);
			cursorCaptureInterval = null;
		}
	};

	ipcMain.handle("download-video", async (event, url: string) => {
		const sender = event.sender;
		
		try {
			const downloadsDir = app.getPath("downloads");
			// Use a more predictable output filename pattern for yt-dlp
			const filenameTemplate = "OpenScreen_Download_%(title)s_%(id)s.%(ext)s";
			const outputPath = path.join(downloadsDir, filenameTemplate);

			const { spawn } = await import("node:child_process");

			return new Promise((resolve) => {
				const args = [
					"--no-playlist",
					"--newline",
					"--progress",
					"--progress-template", "download:%(progress._percent_str)s",
					"-o", outputPath,
					url
				];

				const child = spawn("yt-dlp", args);
				let lastOutput = "";
				let finalFilePath = "";
				let finished = false;

				// timeout after 10 minutes
				const timeoutId = setTimeout(() => {
					if (!finished) {
						finished = true;
						child.kill("SIGKILL");
						resolve({
							success: false,
							message: "Download timed out after 10 minutes",
							error: `stderr: ${lastOutput}\nURL: ${url}`,
						});
					}
				}, 10 * 60 * 1000);

				const safeSend = (channel: string, data: any) => {
					if (!sender.isDestroyed()) {
						sender.send(channel, data);
					}
				};

				child.stdout.on("data", (data) => {
					const output = data.toString();
					lastOutput += output;

					// Parse progress: "download: 45.2%"
					const progressMatch = output.match(/download:\s*([\d.]+)%/);
					if (progressMatch) {
						const progress = parseFloat(progressMatch[1]);
						safeSend("download-progress", { progress, url });
					}

					// Look for completion message to get the actual filename
					const destMatch = output.match(/\[download\] Destination: (.*)/) || 
									 output.match(/\[ffmpeg\] Merging formats into "(.*)"/);
					if (destMatch) {
						finalFilePath = destMatch[1].trim().replace(/^"(.*)"$/, '$1');
					}
				});

				child.stderr.on("data", (data) => {
					console.warn("yt-dlp stderr:", data.toString());
				});

				child.on("close", (code) => {
					if (finished) return;
					finished = true;
					clearTimeout(timeoutId);

					if (code === 0) {
						resolve({
							success: true,
							message: "Download complete",
							path: finalFilePath || downloadsDir,
						});
					} else {
						resolve({
							success: false,
							message: `Download failed with code ${code}`,
							error: lastOutput,
						});
					}
				});

				child.on("error", (err) => {
					if (finished) return;
					finished = true;
					clearTimeout(timeoutId);

					resolve({
						success: false,
						message: "Failed to start downloader",
						error: String(err),
					});
				});
			});
		} catch (error) {
			console.error("Downloader setup error:", error);
			return {
				success: false,
				message: "Downloader setup failed",
				error: String(error),
			};
		}
	});

	// Start a tiny dashboard server for mobile access
	const mobileApp = express();
	mobileApp.use(express.json());
	mobileApp.use(cors());

	mobileApp.get("/api/projects", async (_req: any, res: any) => {
		res.json({ message: "Dashboard mobile access active" });
	});

	// Detect local IP for mobile access
	const getLocalIp = () => {
		const interfaces = os.networkInterfaces();
		for (const name of Object.keys(interfaces)) {
			for (const iface of interfaces[name]!) {
				if (iface.family === "IPv4" && !iface.internal) {
					return iface.address;
				}
			}
		}
		return "localhost";
	};

	try {
		const port = 3001;
		const localIp = getLocalIp();
		const server = mobileApp.listen(port, "0.0.0.0", () => {
			console.log(`Mobile dashboard access available at http://${localIp}:${port}`);
		});

		server.on("error", (err: any) => {
			console.error("Mobile server async error:", err);
			if (err.code === "EADDRINUSE") {
				console.error(`Port ${port} is already in use.`);
			}
		});

		ipcMain.handle("get-mobile-connection-info", () => {
			return {
				ip: localIp,
				port: port,
				url: `http://${localIp}:${port}`,
			};
		});
	} catch (err) {
		console.error("Failed to start mobile dashboard server (sync error):", err);
	}

	ipcMain.handle("get-sources", async (_, opts) => {
		const sources = await desktopCapturer.getSources(opts);
		return sources.map((source) => ({
			id: source.id,
			name: source.name,
			display_id: source.display_id,
			thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : null,
			appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
		}));
	});

	ipcMain.handle("select-source", (_, source) => {
		selectedSource = source;
		const sourceSelectorWin = getSourceSelectorWindow();
		if (sourceSelectorWin) {
			sourceSelectorWin.close();
		}
		return selectedSource;
	});

	ipcMain.handle("get-selected-source", () => {
		return selectedSource;
	});

	ipcMain.handle("open-source-selector", () => {
		const sourceSelectorWin = getSourceSelectorWindow();
		if (sourceSelectorWin) {
			sourceSelectorWin.focus();
			return;
		}
		createSourceSelectorWindow();
	});

	ipcMain.handle("switch-to-editor", () => {
		const mainWin = getMainWindow();
		if (mainWin) {
			mainWin.close();
		}
		createEditorWindow();
	});

	ipcMain.handle("store-recorded-video", async (_, videoData: ArrayBuffer, fileName: string) => {
		try {
			const videoPath = path.join(RECORDINGS_DIR, fileName);
			await fs.writeFile(videoPath, Buffer.from(videoData));
			currentVideoPath = videoPath;

			const telemetryPath = `${videoPath}.cursor.json`;
			if (pendingCursorSamples.length > 0) {
				await fs.writeFile(
					telemetryPath,
					JSON.stringify(
						{ version: CURSOR_TELEMETRY_VERSION, samples: pendingCursorSamples },
						null,
						2,
					),
					"utf-8",
				);
			}
			pendingCursorSamples = [];

			return {
				success: true,
				path: videoPath,
				message: "Video stored successfully",
			};
		} catch (error) {
			console.error("Failed to store video:", error);
			return {
				success: false,
				message: "Failed to store video",
				error: String(error),
			};
		}
	});

	ipcMain.handle("get-recorded-video-path", async () => {
		try {
			const files = await fs.readdir(RECORDINGS_DIR);
			const videoFiles = files.filter((file) => file.endsWith(".webm"));

			if (videoFiles.length === 0) {
				return { success: false, message: "No recorded video found" };
			}

			const latestVideo = videoFiles.sort().reverse()[0];
			const videoPath = path.join(RECORDINGS_DIR, latestVideo);

			return { success: true, path: videoPath };
		} catch (error) {
			console.error("Failed to get video path:", error);
			return { success: false, message: "Failed to get video path", error: String(error) };
		}
	});

	ipcMain.handle("set-recording-state", (_, recording: boolean) => {
		if (recording) {
			stopCursorCapture();
			activeCursorSamples = [];
			pendingCursorSamples = [];
			cursorCaptureStartTimeMs = Date.now();
			sampleCursorPoint();
			cursorCaptureInterval = setInterval(sampleCursorPoint, CURSOR_SAMPLE_INTERVAL_MS);
		} else {
			stopCursorCapture();
			pendingCursorSamples = [...activeCursorSamples];
			activeCursorSamples = [];
		}

		const source = selectedSource || { name: "Screen" };
		if (onRecordingStateChange) {
			onRecordingStateChange(recording, source.name);
		}
	});

	ipcMain.handle("get-cursor-telemetry", async (_, videoPath?: string) => {
		const inputPath = videoPath ?? currentVideoPath;
		if (!inputPath) {
			return { success: true, samples: [] };
		}

		// Sanitize input to prevent path traversal
		// Resolve filename only and join with recordings directory
		const fileName = path.basename(inputPath);
		const telemetryPath = path.join(RECORDINGS_DIR, `${fileName}.cursor.json`);
		try {
			const content = await fs.readFile(telemetryPath, "utf-8");
			const parsed = JSON.parse(content);
			const rawSamples = Array.isArray(parsed)
				? parsed
				: Array.isArray(parsed?.samples)
					? parsed.samples
					: [];

			const samples: CursorTelemetryPoint[] = rawSamples
				.filter((sample: unknown) => Boolean(sample && typeof sample === "object"))
				.map((sample: unknown) => {
					const point = sample as Partial<CursorTelemetryPoint>;
					return {
						timeMs:
							typeof point.timeMs === "number" && Number.isFinite(point.timeMs)
								? Math.max(0, point.timeMs)
								: 0,
						cx:
							typeof point.cx === "number" && Number.isFinite(point.cx)
								? clamp(point.cx, 0, 1)
								: 0.5,
						cy:
							typeof point.cy === "number" && Number.isFinite(point.cy)
								? clamp(point.cy, 0, 1)
								: 0.5,
					};
				})
				.sort((a: CursorTelemetryPoint, b: CursorTelemetryPoint) => a.timeMs - b.timeMs);

			return { success: true, samples };
		} catch (error) {
			const nodeError = error as NodeJS.ErrnoException;
			if (nodeError.code === "ENOENT") {
				return { success: true, samples: [] };
			}
			console.error("Failed to load cursor telemetry:", error);
			return {
				success: false,
				message: "Failed to load cursor telemetry",
				error: String(error),
				samples: [],
			};
		}
	});

	ipcMain.handle("open-external-url", async (_, url: string) => {
		try {
			const parsed = new URL(url);
			const allowedProtocols = ["https:", "http:", "mailto:"];
			if (!allowedProtocols.includes(parsed.protocol)) {
				console.error("Security warning: Blocked opening external URL with unsupported protocol:", parsed.protocol);
				return { success: false, message: "Unsupported protocol" };
			}

			await shell.openExternal(url);
			return { success: true };
		} catch (error) {
			console.error("Failed to open URL:", error);
			return { success: false, error: String(error) };
		}
	});

	// Return base path for assets so renderer can resolve file:// paths in production
	ipcMain.handle("get-asset-base-path", () => {
		try {
			if (app.isPackaged) {
				return path.join(process.resourcesPath, "assets");
			}
			return path.join(app.getAppPath(), "public", "assets");
		} catch (err) {
			console.error("Failed to resolve asset base path:", err);
			return null;
		}
	});

	ipcMain.handle("save-exported-video", async (_, videoData: ArrayBuffer, fileName: string) => {
		try {
			// Determine file type from extension
			const isGif = fileName.toLowerCase().endsWith(".gif");
			const filters = isGif
				? [{ name: "GIF Image", extensions: ["gif"] }]
				: [{ name: "MP4 Video", extensions: ["mp4"] }];

			const result = await dialog.showSaveDialog({
				title: isGif ? "Save Exported GIF" : "Save Exported Video",
				defaultPath: path.join(app.getPath("downloads"), fileName),
				filters,
				properties: ["createDirectory", "showOverwriteConfirmation"],
			});

			if (result.canceled || !result.filePath) {
				return {
					success: false,
					cancelled: true,
					message: "Export cancelled",
				};
			}

			await fs.writeFile(result.filePath, Buffer.from(videoData));

			return {
				success: true,
				path: result.filePath,
				message: "Video exported successfully",
			};
		} catch (error) {
			console.error("Failed to save exported video:", error);
			return {
				success: false,
				message: "Failed to save exported video",
				error: String(error),
			};
		}
	});

	ipcMain.handle("open-video-file-picker", async () => {
		try {
			const result = await dialog.showOpenDialog({
				title: "Select Video File",
				defaultPath: RECORDINGS_DIR,
				filters: [
					{ name: "Video Files", extensions: ["webm", "mp4", "mov", "avi", "mkv"] },
					{ name: "All Files", extensions: ["*"] },
				],
				properties: ["openFile"],
			});

			if (result.canceled || result.filePaths.length === 0) {
				return { success: false, cancelled: true };
			}

			return {
				success: true,
				path: result.filePaths[0],
			};
		} catch (error) {
			console.error("Failed to open file picker:", error);
			return {
				success: false,
				message: "Failed to open file picker",
				error: String(error),
			};
		}
	});

	ipcMain.handle("set-current-video-path", (_, path: string) => {
		currentVideoPath = path;
		return { success: true };
	});

	ipcMain.handle("get-current-video-path", () => {
		return currentVideoPath ? { success: true, path: currentVideoPath } : { success: false };
	});

	ipcMain.handle("clear-current-video-path", () => {
		currentVideoPath = null;
		return { success: true };
	});

	ipcMain.handle("toggle-camera-overlay", () => {
		if (cameraOverlayWin && !cameraOverlayWin.isDestroyed()) {
			cameraOverlayWin.close();
			cameraOverlayWin = null;
			return false;
		} else {
			if (createCameraOverlayWindow) {
				cameraOverlayWin = createCameraOverlayWindow();
			}
			return true;
		}
	});

	ipcMain.handle("save-project", async (_, projectData: string, filePath?: string) => {
		try {
			let targetPath = filePath;
			if (!targetPath) {
				const result = await dialog.showSaveDialog({
					title: "Save OpenScreen Project",
					defaultPath: path.join(app.getPath("documents"), "Unnamed Project.osp"),
					filters: [{ name: "OpenScreen Project", extensions: ["osp"] }],
					properties: ["createDirectory", "showOverwriteConfirmation"],
				});

				if (result.canceled || !result.filePath) {
					return { success: false, cancelled: true };
				}
				targetPath = result.filePath;
			}

			await fs.writeFile(targetPath, projectData, "utf-8");

			return {
				success: true,
				path: targetPath,
				message: "Project saved successfully",
			};
		} catch (error) {
			console.error("Failed to save project:", error);
			return {
				success: false,
				message: "Failed to save project",
				error: String(error),
			};
		}
	});

	ipcMain.handle("open-project", async () => {
		try {
			const result = await dialog.showOpenDialog({
				title: "Open OpenScreen Project",
				filters: [
					{ name: "OpenScreen Project", extensions: ["osp"] },
					{ name: "All Files", extensions: ["*"] },
				],
				properties: ["openFile"],
			});

			if (result.canceled || result.filePaths.length === 0) {
				return { success: false, cancelled: true };
			}

			const filePath = result.filePaths[0];
			const data = await fs.readFile(filePath, "utf-8");

			return {
				success: true,
				path: filePath,
				data,
			};
		} catch (error) {
			console.error("Failed to open project:", error);
			return {
				success: false,
				message: "Failed to open project",
				error: String(error),
			};
		}
	});

	ipcMain.handle("get-platform", () => {
		return process.platform;
	});

	// WebCam Support
	let selectedCameraId: string | null = null;
	let isCameraEnabled = false;

	ipcMain.handle("get-camera-sources", async () => {
		await desktopCapturer.getSources({ types: ["window", "screen"] }); // dummy call to ensure permission check if needed, though camera uses separate API
		// Note: Camera devices are handled in renderer via navigator.mediaDevices
		// But we use IPC to persist the CHOICE
		return { success: true };
	});

	ipcMain.handle("set-selected-camera", (_, deviceId: string | null) => {
		selectedCameraId = deviceId;
		return { success: true };
	});

	ipcMain.handle("get-selected-camera", () => {
		return selectedCameraId;
	});

	ipcMain.handle("toggle-camera-enabled", (_, enabled?: boolean) => {
		isCameraEnabled = enabled !== undefined ? enabled : !isCameraEnabled;
		return isCameraEnabled;
	});

	ipcMain.handle("get-camera-enabled", () => {
		return isCameraEnabled;
	});

	// Audio Selection
	ipcMain.handle("set-selected-mic", (_, deviceId: string | null) => {
		selectedMicId = deviceId;
		return { success: true };
	});

	ipcMain.handle("get-selected-mic", () => {
		return selectedMicId;
	});

	// OS Notifications
	ipcMain.handle("send-notification", (_, { title, body, silent = false }: { title: string; body: string; silent?: boolean }) => {
		if (Notification.isSupported()) {
			const iconPath = app.isPackaged 
				? path.join(process.resourcesPath, "public", "uprising-logo.png")
				: path.join(app.getAppPath(), "public", "uprising-logo.png");
				
			new Notification({
				title,
				body,
				silent,
				icon: iconPath
			}).show();
			return { success: true };
		}
		return { success: false, error: "Notifications not supported" };
	});
}
