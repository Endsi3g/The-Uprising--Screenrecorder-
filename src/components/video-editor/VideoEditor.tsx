import type { Span } from "dnd-timeline";
import { ChevronLeft, Gauge } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useCommandHistory } from "@/hooks/useCommandHistory";
import { getAssetPath } from "@/lib/assetPath";
import {
	calculateOutputDimensions,
	type ExportFormat,
	type ExportProgress,
	type ExportQuality,
	type ExportResult,
	type ExportSettings,
	GIF_SIZE_PRESETS,
	type GifFrameRate,
	type GifSizePreset,
} from "@/lib/exporter";
import { type AspectRatio, getAspectRatioValue } from "@/utils/aspectRatioUtils";
import { getPerformanceMode } from "@/utils/systemCapabilities";
import { ChangelogDialog } from "../changelog/ChangelogDialog";
import { ExportDialog } from "./ExportDialog";
import PlaybackControls from "./PlaybackControls";
import { ProjectMenu } from "./ProjectMenu";
import { SettingsPanel } from "./SettingsPanel";
import TimelineEditor from "./timeline/TimelineEditor";
import {
	type AnnotationRegion,
	type CaptionRegion,
	type CropRegion,
	type CursorTelemetryPoint,
	clampFocusToDepth,
	DEFAULT_ANNOTATION_POSITION,
	DEFAULT_ANNOTATION_SIZE,
	DEFAULT_ANNOTATION_STYLE,
	DEFAULT_CROP_REGION,
	DEFAULT_FIGURE_DATA,
	DEFAULT_ZOOM_DEPTH,
	type FigureData,
	type TrimRegion,
	type ZoomDepth,
	type ZoomFocus,
	type ZoomRegion,
} from "./types";
import { UndoRedoControls } from "./UndoRedoControls";
import VideoPlayback, { VideoPlaybackRef } from "./VideoPlayback";

const WALLPAPER_COUNT = 18;
const WALLPAPER_PATHS = Array.from(
	{ length: WALLPAPER_COUNT },
	(_, i) => `/wallpapers/wallpaper${i + 1}.jpg`,
);

export default function VideoEditor({
	initialVideoPath,
	onBackToDashboard,
}: {
	initialVideoPath: string | null;
	onBackToDashboard: () => void;
}) {
	const [videoPath, setVideoPath] = useState<string | null>(initialVideoPath);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [wallpaper, setWallpaper] = useState<string>(WALLPAPER_PATHS[0]);
	const [shadowIntensity, setShadowIntensity] = useState(0);
	const [showBlur, setShowBlur] = useState(false);
	const [motionBlurEnabled, setMotionBlurEnabled] = useState(false);
	const [borderRadius, setBorderRadius] = useState(0);
	const [padding, setPadding] = useState(50);
	const [cropRegion, setCropRegion] = useState<CropRegion>(DEFAULT_CROP_REGION);
	const [zoomRegions, setZoomRegions] = useState<ZoomRegion[]>([]);
	const [cursorTelemetry, setCursorTelemetry] = useState<CursorTelemetryPoint[]>([]);
	const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
	const [trimRegions, setTrimRegions] = useState<TrimRegion[]>([]);
	const [selectedTrimId, setSelectedTrimId] = useState<string | null>(null);
	const [annotationRegions, setAnnotationRegions] = useState<AnnotationRegion[]>([]);
	const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
	const [captionRegions, setCaptionRegions] = useState<CaptionRegion[]>([]);
	const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
	const [exportError, setExportError] = useState<string | null>(null);
	const [showExportDialog, setShowExportDialog] = useState(false);
	const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
	const [exportQuality, setExportQuality] = useState<ExportQuality>("good");
	const [exportFormat, setExportFormat] = useState<ExportFormat>("mp4");
	const [gifFrameRate, setGifFrameRate] = useState<GifFrameRate>(15);
	const [gifLoop, setGifLoop] = useState(true);
	const [gifSizePreset, setGifSizePreset] = useState<GifSizePreset>("medium");
	const [customExportWidth, setCustomExportWidth] = useState(1920);
	const [customExportHeight, setCustomExportHeight] = useState(1080);
	const [customExportBitrate, setCustomExportBitrate] = useState(30);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [showCursorHighlighter, setShowCursorHighlighter] = useState(true);

	const videoPlaybackRef = useRef<VideoPlaybackRef>(null);
	const nextZoomIdRef = useRef(1);
	const nextTrimIdRef = useRef(1);
	const nextAnnotationIdRef = useRef(1);
	const nextAnnotationZIndexRef = useRef(1); // Track z-index for stacking order
	const exporterRef = useRef<any>(null);

	const [currentProjectPath, setCurrentProjectPath] = useState<string | null>(null);
	const lastSavedProjectDataRef = useRef<string | null>(null);

	const { executeCommand, undo, redo, canUndo, canRedo, clearHistory } = useCommandHistory();

	const getProjectData = useCallback(() => {
		return JSON.stringify({
			videoPath,
			cropRegion,
			zoomRegions,
			trimRegions,
			annotationRegions,
			captionRegions,
			wallpaper,
			shadowIntensity,
			showBlur,
			motionBlurEnabled,
			borderRadius,
			padding,
			aspectRatio,
		});
	}, [
		videoPath,
		cropRegion,
		zoomRegions,
		trimRegions,
		annotationRegions,
		wallpaper,
		shadowIntensity,
		showBlur,
		motionBlurEnabled,
		borderRadius,
		padding,
		aspectRatio,
		showCursorHighlighter,
		playbackRate,
	]);

	// Initial save ref on first load
	useEffect(() => {
		if (lastSavedProjectDataRef.current === null && !loading) {
			lastSavedProjectDataRef.current = getProjectData();
		}
	}, [getProjectData, loading]);

	const hasUnsavedChanges =
		!loading &&
		lastSavedProjectDataRef.current !== null &&
		getProjectData() !== lastSavedProjectDataRef.current;

	const loadProjectData = useCallback(
		(dataStr: string) => {
			try {
				const data = JSON.parse(dataStr);
				if (data.videoPath !== undefined) setVideoPath(data.videoPath);
				if (data.cropRegion !== undefined) setCropRegion(data.cropRegion);
				if (data.zoomRegions !== undefined) setZoomRegions(data.zoomRegions);
				if (data.trimRegions !== undefined) setTrimRegions(data.trimRegions);
				if (data.annotationRegions !== undefined) setAnnotationRegions(data.annotationRegions);
				if (data.captionRegions !== undefined) setCaptionRegions(data.captionRegions);
				if (data.wallpaper !== undefined) setWallpaper(data.wallpaper);
				if (data.shadowIntensity !== undefined) setShadowIntensity(data.shadowIntensity);
				if (data.showBlur !== undefined) setShowBlur(data.showBlur);
				if (data.motionBlurEnabled !== undefined) setMotionBlurEnabled(data.motionBlurEnabled);
				if (data.borderRadius !== undefined) setBorderRadius(data.borderRadius);
				if (data.padding !== undefined) setPadding(data.padding);
				if (data.aspectRatio !== undefined) setAspectRatio(data.aspectRatio);
				if (data.playbackRate !== undefined) setPlaybackRate(data.playbackRate);
				if (data.showCursorHighlighter !== undefined)
					setShowCursorHighlighter(data.showCursorHighlighter);

				clearHistory();
				lastSavedProjectDataRef.current = dataStr;
			} catch (err) {
				toast.error("Failed to load project data");
				console.error(err);
			}
		},
		[clearHistory],
	);

	const handleNewProject = useCallback(() => {
		setVideoPath(null);
		setCropRegion(DEFAULT_CROP_REGION);
		setZoomRegions([]);
		setTrimRegions([]);
		setAnnotationRegions([]);
		setWallpaper(WALLPAPER_PATHS[0]);
		setShadowIntensity(0);
		setShowBlur(false);
		setMotionBlurEnabled(false);
		setBorderRadius(0);
		setPadding(50);
		setAspectRatio("16:9");
		clearHistory();
		setCurrentProjectPath(null);
		setTimeout(() => {
			lastSavedProjectDataRef.current = getProjectData();
		}, 0);
	}, [clearHistory, getProjectData]);

	const handleOpenProject = useCallback(async () => {
		const result = await window.electronAPI.openProject();
		if (!result.cancelled && result.success && result.data && result.path) {
			loadProjectData(result.data);
			setCurrentProjectPath(result.path);
			toast.success("Project opened successfully");
		} else if (result.error) {
			toast.error(result.message || "Failed to open project");
		}
	}, [loadProjectData]);

	const handleSaveProject = useCallback(async () => {
		const data = getProjectData();
		const result = await window.electronAPI.saveProject(data, currentProjectPath || undefined);
		if (!result.cancelled && result.success && result.path) {
			setCurrentProjectPath(result.path);
			lastSavedProjectDataRef.current = data;
			toast.success("Project saved successfully");
		} else if (result.error) {
			toast.error(result.message || "Failed to save project");
		}
	}, [getProjectData, currentProjectPath]);

	const handleSaveProjectAs = useCallback(async () => {
		const data = getProjectData();
		const result = await window.electronAPI.saveProject(data);
		if (!result.cancelled && result.success && result.path) {
			setCurrentProjectPath(result.path);
			lastSavedProjectDataRef.current = data;
			toast.success("Project saved successfully");
		} else if (result.error) {
			toast.error(result.message || "Failed to save project");
		}
	}, [getProjectData]);

	const handleExportVideoMenu = useCallback(() => {
		setExportFormat("mp4");
		setTimeout(() => setShowExportDialog(true), 0);
	}, []);

	const handleExportGifMenu = useCallback(() => {
		setExportFormat("gif");
		setTimeout(() => setShowExportDialog(true), 0);
	}, []);

	// Use a ref to keep track of current state without triggering useCallback updates
	const stateRef = useRef({
		zoomRegions,
		trimRegions,
		annotationRegions,
		captionRegions,
		selectedZoomId,
		selectedTrimId,
		selectedAnnotationId,
		selectedCaptionId,
	});
	useEffect(() => {
		stateRef.current = {
			zoomRegions,
			trimRegions,
			annotationRegions,
			captionRegions,
			selectedZoomId,
			selectedTrimId,
			selectedAnnotationId,
			selectedCaptionId,
		};
	}, [
		zoomRegions,
		trimRegions,
		annotationRegions,
		captionRegions,
		selectedZoomId,
		selectedTrimId,
		selectedAnnotationId,
		selectedCaptionId,
	]);

	// Add global keyboard shortcut for Undo/Redo
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Allow inputs their normal behavior (undo text)
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) {
					redo();
				} else {
					undo();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [undo, redo]);

	// Helper to convert file path to proper file:// URL
	const toFileUrl = useCallback((filePath: string): string => {
		// If it's already a file URL, return it as is
		if (filePath.startsWith("file://")) {
			return filePath;
		}

		// Normalize path separators to forward slashes
		const normalized = filePath.replace(/\\/g, "/");

		// Check if it's a Windows absolute path (e.g., C:/Users/...)
		if (normalized.match(/^[a-zA-Z]:/)) {
			const fileUrl = `file:///${normalized}`;
			return fileUrl;
		}

		// Unix-style absolute path
		const fileUrl = `file://${normalized}`;
		return fileUrl;
	}, []);

	const fromFileUrl = (fileUrl: string): string => {
		if (!fileUrl.startsWith("file://")) {
			return fileUrl;
		}

		try {
			const url = new URL(fileUrl);
			return decodeURIComponent(url.pathname);
		} catch {
			return fileUrl.replace(/^file:\/\//, "");
		}
	};

	useEffect(() => {
		async function loadVideo() {
			try {
				const result = await window.electronAPI.getCurrentVideoPath();

				if (result.success && result.path) {
					const videoUrl = toFileUrl(result.path);
					setVideoPath(videoUrl);
				} else {
					setError("No video to load. Please record or select a video.");
				}
			} catch (err) {
				setError("Error loading video: " + String(err));
			} finally {
				setLoading(false);
			}
		}
		loadVideo();
	}, []);

	useEffect(() => {
		let mounted = true;

		async function loadCursorTelemetry() {
			if (!videoPath) {
				if (mounted) {
					setCursorTelemetry([]);
				}
				return;
			}

			try {
				const result = await window.electronAPI.getCursorTelemetry(fromFileUrl(videoPath));
				if (mounted) {
					setCursorTelemetry(result.success ? result.samples : []);
				}
			} catch (telemetryError) {
				console.warn("Unable to load cursor telemetry:", telemetryError);
				if (mounted) {
					setCursorTelemetry([]);
				}
			}
		}

		loadCursorTelemetry();

		return () => {
			mounted = false;
		};
	}, [videoPath]);

	// Initialize default wallpaper with resolved asset path
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const resolvedPath = await getAssetPath("wallpapers/wallpaper1.jpg");
				if (mounted) {
					setWallpaper(resolvedPath);
				}
			} catch (err) {
				// If resolution fails, keep the fallback
				console.warn("Failed to resolve default wallpaper path:", err);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	function togglePlayPause() {
		const playback = videoPlaybackRef.current;
		const video = playback?.video;
		if (!playback || !video) return;

		if (isPlaying) {
			playback.pause();
		} else {
			playback.play().catch((err) => console.error("Video play failed:", err));
		}
	}

	function handleSeek(time: number) {
		const video = videoPlaybackRef.current?.video;
		if (!video) return;
		video.currentTime = time;
	}

	const handleSelectZoom = useCallback((id: string | null) => {
		setSelectedZoomId(id);
		if (id) setSelectedTrimId(null);
	}, []);

	const handleSelectTrim = useCallback((id: string | null) => {
		setSelectedTrimId(id);
		if (id) {
			setSelectedZoomId(null);
			setSelectedAnnotationId(null);
		}
	}, []);

	const handleSelectAnnotation = useCallback((id: string | null) => {
		setSelectedAnnotationId(id);
		if (id) {
			setSelectedZoomId(null);
			setSelectedTrimId(null);
		}
	}, []);

	const handleZoomAdded = useCallback(
		(span: Span) => {
			const id = `zoom-${nextZoomIdRef.current++}`;
			const newRegion: ZoomRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				depth: DEFAULT_ZOOM_DEPTH,
				focus: { cx: 0.5, cy: 0.5 },
			};

			const prev = stateRef.current.zoomRegions;
			const next = [...prev, newRegion];

			executeCommand({
				execute: () => {
					setZoomRegions(next);
					setSelectedZoomId(id);
					setSelectedTrimId(null);
					setSelectedAnnotationId(null);
				},
				undo: () => {
					setZoomRegions(prev);
					setSelectedZoomId(null);
				},
			});
		},
		[executeCommand],
	);

	const handleZoomSuggested = useCallback(
		(span: Span, focus: ZoomFocus) => {
			const id = `zoom-${nextZoomIdRef.current++}`;
			const newRegion: ZoomRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				depth: DEFAULT_ZOOM_DEPTH,
				focus: clampFocusToDepth(focus, DEFAULT_ZOOM_DEPTH),
			};

			const prev = stateRef.current.zoomRegions;
			const next = [...prev, newRegion];

			executeCommand({
				execute: () => {
					setZoomRegions(next);
					setSelectedZoomId(id);
					setSelectedTrimId(null);
					setSelectedAnnotationId(null);
				},
				undo: () => {
					setZoomRegions(prev);
					setSelectedZoomId(null);
				},
			});
		},
		[executeCommand],
	);

	const handleTrimAdded = useCallback(
		(span: Span) => {
			const id = `trim-${nextTrimIdRef.current++}`;
			const newRegion: TrimRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
			};

			const prev = stateRef.current.trimRegions;
			const next = [...prev, newRegion];

			executeCommand({
				execute: () => {
					setTrimRegions(next);
					setSelectedTrimId(id);
					setSelectedZoomId(null);
					setSelectedAnnotationId(null);
				},
				undo: () => {
					setTrimRegions(prev);
					setSelectedTrimId(null);
				},
			});
		},
		[executeCommand],
	);

	const handleZoomSpanChange = useCallback(
		(id: string, span: Span) => {
			const prev = stateRef.current.zoomRegions;
			const next = prev.map((region) =>
				region.id === id
					? {
							...region,
							startMs: Math.round(span.start),
							endMs: Math.round(span.end),
						}
					: region,
			);

			executeCommand({
				execute: () => setZoomRegions(next),
				undo: () => setZoomRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleTrimSpanChange = useCallback(
		(id: string, span: Span) => {
			const prev = stateRef.current.trimRegions;
			const next = prev.map((region) =>
				region.id === id
					? {
							...region,
							startMs: Math.round(span.start),
							endMs: Math.round(span.end),
						}
					: region,
			);

			executeCommand({
				execute: () => setTrimRegions(next),
				undo: () => setTrimRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleZoomFocusChange = useCallback(
		(id: string, focus: ZoomFocus) => {
			const prev = stateRef.current.zoomRegions;
			const next = prev.map((region) =>
				region.id === id
					? {
							...region,
							focus: clampFocusToDepth(focus, region.depth),
						}
					: region,
			);

			executeCommand({
				execute: () => setZoomRegions(next),
				undo: () => setZoomRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleZoomDepthChange = useCallback(
		(depth: ZoomDepth) => {
			if (!stateRef.current.selectedZoomId) return;
			const prev = stateRef.current.zoomRegions;
			const next = prev.map((region) =>
				region.id === stateRef.current.selectedZoomId
					? {
							...region,
							depth,
							focus: clampFocusToDepth(region.focus, depth),
						}
					: region,
			);

			executeCommand({
				execute: () => setZoomRegions(next),
				undo: () => setZoomRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleZoomDelete = useCallback(
		(id: string) => {
			const prev = stateRef.current.zoomRegions;
			const next = prev.filter((region) => region.id !== id);
			const prevSelectedId = stateRef.current.selectedZoomId;

			executeCommand({
				execute: () => {
					setZoomRegions(next);
					if (stateRef.current.selectedZoomId === id) setSelectedZoomId(null);
				},
				undo: () => {
					setZoomRegions(prev);
					setSelectedZoomId(prevSelectedId);
				},
			});
		},
		[executeCommand],
	);

	const handleTrimDelete = useCallback(
		(id: string) => {
			const prev = stateRef.current.trimRegions;
			const next = prev.filter((region) => region.id !== id);
			const prevSelectedId = stateRef.current.selectedTrimId;

			executeCommand({
				execute: () => {
					setTrimRegions(next);
					if (stateRef.current.selectedTrimId === id) setSelectedTrimId(null);
				},
				undo: () => {
					setTrimRegions(prev);
					setSelectedTrimId(prevSelectedId);
				},
			});
		},
		[executeCommand],
	);

	const handleAnnotationAdded = useCallback(
		(span: Span) => {
			const id = `annotation-${nextAnnotationIdRef.current++}`;
			const zIndex = nextAnnotationZIndexRef.current++; // Assign z-index based on creation order
			const newRegion: AnnotationRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				type: "text",
				content: "Enter text...",
				position: { ...DEFAULT_ANNOTATION_POSITION },
				size: { ...DEFAULT_ANNOTATION_SIZE },
				style: { ...DEFAULT_ANNOTATION_STYLE },
				zIndex,
			};

			const prev = stateRef.current.annotationRegions;
			const next = [...prev, newRegion];

			executeCommand({
				execute: () => {
					setAnnotationRegions(next);
					setSelectedAnnotationId(id);
					setSelectedZoomId(null);
					setSelectedTrimId(null);
				},
				undo: () => {
					setAnnotationRegions(prev);
					setSelectedAnnotationId(null);
				},
			});
		},
		[executeCommand],
	);

	const handleAnnotationSpanChange = useCallback(
		(id: string, span: Span) => {
			const prev = stateRef.current.annotationRegions;
			const next = prev.map((region) =>
				region.id === id
					? {
							...region,
							startMs: Math.round(span.start),
							endMs: Math.round(span.end),
						}
					: region,
			);

			executeCommand({
				execute: () => setAnnotationRegions(next),
				undo: () => setAnnotationRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleAnnotationDelete = useCallback(
		(id: string) => {
			const prev = stateRef.current.annotationRegions;
			const next = prev.filter((region) => region.id !== id);
			const prevSelectedId = stateRef.current.selectedAnnotationId;

			executeCommand({
				execute: () => {
					setAnnotationRegions(next);
					if (stateRef.current.selectedAnnotationId === id) {
						setSelectedAnnotationId(null);
					}
				},
				undo: () => {
					setAnnotationRegions(prev);
					setSelectedAnnotationId(prevSelectedId);
				},
			});
		},
		[executeCommand],
	);

	const handleAnnotationContentChange = useCallback(
		(id: string, content: string) => {
			const prev = stateRef.current.annotationRegions;
			const next = prev.map((region) => {
				if (region.id !== id) return region;

				// Store content in type-specific fields
				if (region.type === "text") {
					return { ...region, content, textContent: content };
				} else if (region.type === "image") {
					return { ...region, content, imageContent: content };
				} else {
					return { ...region, content };
				}
			});

			executeCommand({
				execute: () => setAnnotationRegions(next),
				undo: () => setAnnotationRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleAnnotationTypeChange = useCallback(
		(id: string, type: AnnotationRegion["type"]) => {
			const prev = stateRef.current.annotationRegions;
			const next = prev.map((region) => {
				if (region.id !== id) return region;

				const updatedRegion = { ...region, type };

				// Restore content from type-specific storage
				if (type === "text") {
					updatedRegion.content = region.textContent || "Enter text...";
				} else if (type === "image") {
					updatedRegion.content = region.imageContent || "";
				} else if (type === "figure") {
					updatedRegion.content = "";
					if (!region.figureData) {
						updatedRegion.figureData = { ...DEFAULT_FIGURE_DATA };
					}
				}

				return updatedRegion;
			});

			executeCommand({
				execute: () => setAnnotationRegions(next),
				undo: () => setAnnotationRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleAnnotationStyleChange = useCallback(
		(id: string, style: Partial<AnnotationRegion["style"]>) => {
			const prev = stateRef.current.annotationRegions;
			const next = prev.map((region) =>
				region.id === id ? { ...region, style: { ...region.style, ...style } } : region,
			);

			executeCommand({
				execute: () => setAnnotationRegions(next),
				undo: () => setAnnotationRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleAnnotationFigureDataChange = useCallback(
		(id: string, figureData: FigureData) => {
			const prev = stateRef.current.annotationRegions;
			const next = prev.map((region) => (region.id === id ? { ...region, figureData } : region));

			executeCommand({
				execute: () => setAnnotationRegions(next),
				undo: () => setAnnotationRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleAnnotationPositionChange = useCallback(
		(id: string, position: { x: number; y: number }) => {
			const prev = stateRef.current.annotationRegions;
			const next = prev.map((region) => (region.id === id ? { ...region, position } : region));

			executeCommand({
				execute: () => setAnnotationRegions(next),
				undo: () => setAnnotationRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleAnnotationSizeChange = useCallback(
		(id: string, size: { width: number; height: number }) => {
			const prev = stateRef.current.annotationRegions;
			const next = prev.map((region) => (region.id === id ? { ...region, size } : region));

			executeCommand({
				execute: () => setAnnotationRegions(next),
				undo: () => setAnnotationRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleCaptionAdded = useCallback(
		(span: Span) => {
			const prev = stateRef.current.captionRegions;
			const newCaption: CaptionRegion = {
				id: "caption-" + uuidv4(),
				startMs: span.start,
				endMs: span.end,
				text: "New Caption",
				style: { ...DEFAULT_ANNOTATION_STYLE, backgroundColor: "rgba(0,0,0,0.5)" },
			};
			const next = [...prev, newCaption];

			executeCommand({
				execute: () => setCaptionRegions(next),
				undo: () => setCaptionRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleCaptionSpanChange = useCallback(
		(id: string, span: Span) => {
			const prev = stateRef.current.captionRegions;
			const next = prev.map((region) =>
				region.id === id ? { ...region, startMs: span.start, endMs: span.end } : region,
			);

			executeCommand({
				execute: () => setCaptionRegions(next),
				undo: () => setCaptionRegions(prev),
			});
		},
		[executeCommand],
	);

	const handleCaptionDelete = useCallback(
		(id: string) => {
			const prev = stateRef.current.captionRegions;
			const next = prev.filter((region) => region.id !== id);

			executeCommand({
				execute: () => setCaptionRegions(next),
				undo: () => setCaptionRegions(prev),
			});
		},
		[executeCommand],
	);

	// Global Tab prevention
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Tab") {
				// Allow tab only in inputs/textareas
				if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
					return;
				}
				e.preventDefault();
			}

			if (e.key === " " || e.code === "Space") {
				// Allow space only in inputs/textareas
				if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
					return;
				}
				e.preventDefault();

				const playback = videoPlaybackRef.current;
				if (playback?.video) {
					if (playback.video.paused) {
						playback.play().catch(console.error);
					} else {
						playback.pause();
					}
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
	}, []);

	useEffect(() => {
		if (selectedZoomId && !zoomRegions.some((region) => region.id === selectedZoomId)) {
			setSelectedZoomId(null);
		}
	}, [selectedZoomId, zoomRegions]);

	useEffect(() => {
		if (selectedTrimId && !trimRegions.some((region) => region.id === selectedTrimId)) {
			setSelectedTrimId(null);
		}
	}, [selectedTrimId, trimRegions]);

	useEffect(() => {
		if (
			selectedAnnotationId &&
			!annotationRegions.some((region) => region.id === selectedAnnotationId)
		) {
			setSelectedAnnotationId(null);
		}
	}, [selectedAnnotationId, annotationRegions]);

	const handleExport = useCallback(
		async (settings: ExportSettings) => {
			if (!videoPath) {
				toast.error("No video loaded");
				return;
			}

			const video = videoPlaybackRef.current?.video;
			if (!video) {
				toast.error("Video not ready");
				return;
			}

			setIsExporting(true);
			setExportProgress(null);
			setExportError(null);

			try {
				const wasPlaying = isPlaying;
				if (wasPlaying) {
					videoPlaybackRef.current?.pause();
				}

				const aspectRatioValue = getAspectRatioValue(aspectRatio);
				const sourceWidth = video.videoWidth || 1920;
				const sourceHeight = video.videoHeight || 1080;

				// Get preview CONTAINER dimensions for scaling
				const playbackRef = videoPlaybackRef.current;
				const containerElement = playbackRef?.containerRef?.current;
				const previewWidth = containerElement?.clientWidth || 1920;
				const previewHeight = containerElement?.clientHeight || 1080;

				if (exporterRef.current) {
					exporterRef.current.terminate();
					exporterRef.current = null;
				}

				// Use the query parameter to ensure it's loaded as a worker
				const workerUrl = new URL("../../lib/exporter/export.worker.ts", import.meta.url);
				const worker = new Worker(workerUrl, { type: "module" });
				exporterRef.current = worker;

				const handleExportResult = async (result: ExportResult, ext: string) => {
					if (result.success && result.blob) {
						const arrayBuffer = await result.blob.arrayBuffer();
						const timestamp = Date.now();
						const fileName = `export-${timestamp}.${ext}`;

						const saveResult = await window.electronAPI.saveExportedVideo(arrayBuffer, fileName);

						if (saveResult.cancelled) {
							toast.info("Export cancelled");
						} else if (saveResult.success) {
							toast.success(`Video exported successfully to ${saveResult.path}`);
							// Send OS notification
							if ((window.electronAPI as any).sendNotification) {
								(window.electronAPI as any).sendNotification({
									title: "Export Complete",
									body: `Your video has been saved to ${saveResult.path}`,
								});
							}
						} else {
							setExportError(saveResult.message || "Failed to save video");
							toast.error(saveResult.message || "Failed to save video");
						}
					} else {
						setExportError(result.error || "Export failed");
						toast.error(result.error || "Export failed");
					}

					setIsExporting(false);
					if (exporterRef.current) {
						exporterRef.current.terminate();
						exporterRef.current = null;
					}
					setShowExportDialog(false);
					setExportProgress(null);
					if (wasPlaying) {
						videoPlaybackRef.current?.play();
					}
				};

				worker.onmessage = async (e) => {
					const { type, progress, result, error } = e.data;
					if (type === "progress") {
						setExportProgress(progress);
					} else if (type === "done") {
						await handleExportResult(result, settings.format === "gif" ? "gif" : "mp4");
					} else if (type === "error") {
						const errStr = error || (result && result.error) || "Export failed";
						setExportError(errStr);
						toast.error(`Export failed: ${errStr}`);
						setIsExporting(false);
						if (exporterRef.current) {
							exporterRef.current.terminate();
							exporterRef.current = null;
						}
						setShowExportDialog(false);
						setExportProgress(null);
						if (wasPlaying) {
							videoPlaybackRef.current?.play();
						}
					}
				};

				worker.onerror = (error) => {
					console.error("Worker error:", error);
					setExportError(error.message);
					toast.error(`Export failed: ${error.message}`);
					setIsExporting(false);
					if (exporterRef.current) {
						exporterRef.current.terminate();
						exporterRef.current = null;
					}
					setShowExportDialog(false);
					setExportProgress(null);
					if (wasPlaying) {
						videoPlaybackRef.current?.play();
					}
				};

				if (settings.format === "gif" && settings.gifConfig) {
					// GIF Export
					const config = {
						videoUrl: toFileUrl(videoPath), // MUST USE file:// URL for web worker fetch
						width: settings.gifConfig.width,
						height: settings.gifConfig.height,
						frameRate: settings.gifConfig.frameRate,
						loop: settings.gifConfig.loop,
						sizePreset: settings.gifConfig.sizePreset,
						wallpaper,
						zoomRegions,
						trimRegions,
						showShadow: shadowIntensity > 0,
						shadowIntensity,
						showBlur,
						motionBlurEnabled,
						borderRadius,
						padding,
						videoPadding: padding,
						cropRegion,
						annotationRegions,
						captionRegions,
						cursorTelemetry,
						showCursorHighlighter,
						playbackRate,
						previewWidth,
						previewHeight,
					};

					worker.postMessage({ type: "start", format: "gif", config });
				} else {
					// MP4 Export
					const quality = settings.quality || exportQuality;
					let exportWidth: number;
					let exportHeight: number;
					let bitrate: number;

					if (quality === "source") {
						// Use source resolution
						exportWidth = sourceWidth;
						exportHeight = sourceHeight;

						if (aspectRatioValue === 1) {
							// Square (1:1): use smaller dimension to avoid codec limits
							const baseDimension = Math.floor(Math.min(sourceWidth, sourceHeight) / 2) * 2;
							exportWidth = baseDimension;
							exportHeight = baseDimension;
						} else if (aspectRatioValue > 1) {
							// Landscape: find largest even dimensions that exactly match aspect ratio
							const baseWidth = Math.floor(sourceWidth / 2) * 2;
							let found = false;
							for (let w = baseWidth; w >= 100 && !found; w -= 2) {
								const h = Math.round(w / aspectRatioValue);
								if (h % 2 === 0 && Math.abs(w / h - aspectRatioValue) < 0.0001) {
									exportWidth = w;
									exportHeight = h;
									found = true;
								}
							}
							if (!found) {
								exportWidth = baseWidth;
								exportHeight = Math.floor(baseWidth / aspectRatioValue / 2) * 2;
							}
						} else {
							// Portrait: find largest even dimensions that exactly match aspect ratio
							const baseHeight = Math.floor(sourceHeight / 2) * 2;
							let found = false;
							for (let h = baseHeight; h >= 100 && !found; h -= 2) {
								const w = Math.round(h * aspectRatioValue);
								if (w % 2 === 0 && Math.abs(w / h - aspectRatioValue) < 0.0001) {
									exportWidth = w;
									exportHeight = h;
									found = true;
								}
							}
							if (!found) {
								exportHeight = baseHeight;
								exportWidth = Math.floor((baseHeight * aspectRatioValue) / 2) * 2;
							}
						}

						const perfMode = getPerformanceMode();
						const bitrateMultiplier = perfMode === "low" ? 0.3 : perfMode === "balanced" ? 0.6 : 1;

						// Calculate visually lossless bitrate matching screen recording optimization
						const totalPixels = exportWidth * exportHeight;
						bitrate = 30_000_000 * bitrateMultiplier;
						if (totalPixels > 1920 * 1080 && totalPixels <= 2560 * 1440) {
							bitrate = 50_000_000 * bitrateMultiplier;
						} else if (totalPixels > 2560 * 1440) {
							bitrate = 80_000_000 * bitrateMultiplier;
						}
					} else if (quality === "custom") {
						// Use custom dimensions and bitrate
						exportWidth = Math.floor(customExportWidth / 2) * 2;
						exportHeight = Math.floor(customExportHeight / 2) * 2;
						bitrate = customExportBitrate * 1_000_000; // Convert Mbps to bps
					} else {
						// Use quality-based target resolution (medium/good)
						const targetHeight = quality === "medium" ? 720 : 1080;

						// Calculate dimensions maintaining aspect ratio
						exportHeight = Math.floor(targetHeight / 2) * 2;
						exportWidth = Math.floor((exportHeight * aspectRatioValue) / 2) * 2;

						const perfMode = getPerformanceMode();
						const bitrateMultiplier = perfMode === "low" ? 0.3 : perfMode === "balanced" ? 0.6 : 1;

						// Adjust bitrate for lower resolutions
						const totalPixels = exportWidth * exportHeight;
						if (totalPixels <= 1280 * 720) {
							bitrate = 10_000_000 * bitrateMultiplier;
						} else if (totalPixels <= 1920 * 1080) {
							bitrate = 20_000_000 * bitrateMultiplier;
						} else {
							bitrate = 30_000_000 * bitrateMultiplier;
						}
					}

					const config = {
						videoUrl: toFileUrl(videoPath), // MUST USE file:// URL for web worker fetch
						width: exportWidth,
						height: exportHeight,
						frameRate: 60,
						bitrate,
						codec: "avc1.640033",
						wallpaper,
						zoomRegions,
						trimRegions,
						showShadow: shadowIntensity > 0,
						shadowIntensity,
						showBlur,
						motionBlurEnabled,
						borderRadius,
						padding,
						cropRegion,
						annotationRegions,
						captionRegions,
						cursorTelemetry,
						showCursorHighlighter,
						playbackRate,
						previewWidth,
						previewHeight,
					};

					worker.postMessage({ type: "start", format: "mp4", config });
				}
			} catch (error) {
				console.error("Export error:", error);
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				setExportError(errorMessage);
				toast.error(`Export failed: ${errorMessage}`);
				setIsExporting(false);
				if (exporterRef.current) {
					exporterRef.current.terminate();
					exporterRef.current = null;
				}
				setShowExportDialog(false);
				setExportProgress(null);
			}
		},
		[
			videoPath,
			wallpaper,
			zoomRegions,
			trimRegions,
			shadowIntensity,
			showBlur,
			motionBlurEnabled,
			borderRadius,
			padding,
			cropRegion,
			annotationRegions,
			isPlaying,
			aspectRatio,
			exportQuality,
			customExportWidth,
			customExportHeight,
			customExportBitrate,
			toFileUrl,
		],
	);

	const handleOpenExportDialog = useCallback(() => {
		if (!videoPath) {
			toast.error("No video loaded");
			return;
		}

		const video = videoPlaybackRef.current?.video;
		if (!video) {
			toast.error("Video not ready");
			return;
		}

		// Build export settings from current state
		const sourceWidth = video.videoWidth || 1920;
		const sourceHeight = video.videoHeight || 1080;
		const gifDimensions = calculateOutputDimensions(
			sourceWidth,
			sourceHeight,
			gifSizePreset,
			GIF_SIZE_PRESETS,
		);

		const settings: ExportSettings = {
			format: exportFormat,
			quality: exportFormat === "mp4" ? exportQuality : undefined,
			gifConfig:
				exportFormat === "gif"
					? {
							frameRate: gifFrameRate,
							loop: gifLoop,
							sizePreset: gifSizePreset,
							width: gifDimensions.width,
							height: gifDimensions.height,
						}
					: undefined,
		};

		setShowExportDialog(true);
		setExportError(null);

		// Start export immediately
		handleExport(settings);
	}, [videoPath, exportFormat, exportQuality, gifFrameRate, gifLoop, gifSizePreset, handleExport]);

	const handleCancelExport = useCallback(() => {
		if (exporterRef.current) {
			exporterRef.current.postMessage({ type: "cancel" });
			toast.info("Export cancellation initiated");
			setShowExportDialog(false);
			setIsExporting(false);
			setExportProgress(null);
			setExportError(null);
		}
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="text-foreground">Loading video...</div>
			</div>
		);
	}
	if (error) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="text-destructive">{error}</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen bg-[#09090b] text-slate-200 overflow-hidden selection:bg-[#3B82F6]/30">
			<div className="h-10 flex-shrink-0 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 flex items-center px-6 z-50 gap-4 drag">
				<div className="flex items-center gap-2 no-drag">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10 rounded-md"
						onClick={onBackToDashboard}
						title="Back to Dashboard"
					>
						<ChevronLeft size={18} />
					</Button>
					<div className="w-[1px] h-4 bg-white/10 mx-2" />
					<ProjectMenu
						onNewProject={handleNewProject}
						onOpenProject={handleOpenProject}
						onSaveProject={handleSaveProject}
						onSaveProjectAs={handleSaveProjectAs}
						onExportVideo={handleExportVideoMenu}
						onExportGif={handleExportGifMenu}
						hasUnsavedChanges={hasUnsavedChanges}
					/>
				</div>
				<div
					className="flex items-center gap-2"
					style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
				>
					<UndoRedoControls canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
				</div>

				{/* Project Title */}
				<div className="flex-1 flex justify-center text-sm font-medium text-slate-400">
					{currentProjectPath ? currentProjectPath.split(/[/\\]/).pop() : "Unnamed Project"}
					{hasUnsavedChanges && <span className="ml-1 text-slate-500">*</span>}
				</div>

				<div
					className="flex-1 flex justify-end"
					style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
				>
					<ChangelogDialog />
				</div>
			</div>

			<div className="flex-1 p-5 gap-4 flex min-h-0 relative">
				{/* Left Column - Video & Timeline */}
				<div className="flex-[7] flex flex-col gap-3 min-w-0 h-full">
					<PanelGroup direction="vertical" className="gap-3">
						{/* Top section: video preview and controls */}
						<Panel defaultSize={70} minSize={40}>
							<div className="w-full h-full flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
								{/* Video preview */}
								<div
									className="w-full flex justify-center items-center"
									style={{ flex: "1 1 auto", margin: "6px 0 0" }}
								>
									<div
										className="relative"
										style={{
											width: "auto",
											height: "100%",
											aspectRatio: getAspectRatioValue(aspectRatio),
											maxWidth: "100%",
											margin: "0 auto",
											boxSizing: "border-box",
										}}
									>
										<VideoPlayback
											aspectRatio={aspectRatio}
											ref={videoPlaybackRef}
											videoPath={videoPath || ""}
											onDurationChange={setDuration}
											onTimeUpdate={setCurrentTime}
											currentTime={currentTime}
											onPlayStateChange={setIsPlaying}
											onError={setError}
											wallpaper={wallpaper}
											zoomRegions={zoomRegions}
											selectedZoomId={selectedZoomId}
											onSelectZoom={handleSelectZoom}
											onZoomFocusChange={handleZoomFocusChange}
											isPlaying={isPlaying}
											showShadow={shadowIntensity > 0}
											shadowIntensity={shadowIntensity}
											showBlur={showBlur}
											motionBlurEnabled={motionBlurEnabled}
											borderRadius={borderRadius}
											padding={padding}
											cropRegion={cropRegion}
											trimRegions={trimRegions}
											annotationRegions={annotationRegions}
											selectedAnnotationId={selectedAnnotationId}
											onSelectAnnotation={handleSelectAnnotation}
											onAnnotationPositionChange={handleAnnotationPositionChange}
											onAnnotationSizeChange={handleAnnotationSizeChange}
											showCursorHighlighter={showCursorHighlighter}
										/>
									</div>
								</div>
								{/* Playback controls */}
								<div
									className="w-full flex justify-center items-center"
									style={{
										height: "48px",
										flexShrink: 0,
										padding: "6px 12px",
										margin: "6px 0 6px 0",
									}}
								>
									<div style={{ width: "100%", maxWidth: "700px" }}>
										<div className="flex items-center gap-4">
											<div className="flex-grow">
												<PlaybackControls
													isPlaying={isPlaying}
													currentTime={currentTime}
													duration={duration}
													onTogglePlayPause={togglePlayPause}
													onSeek={handleSeek}
												/>
											</div>
											<div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors group">
												<Gauge
													size={14}
													className="text-slate-400 group-hover:text-[#3B82F6] transition-colors"
												/>
												<select
													value={playbackRate}
													onChange={(e) => setPlaybackRate(Number(e.target.value))}
													className="bg-transparent text-[11px] font-medium text-slate-300 border-none focus:ring-0 cursor-pointer hover:text-white p-0"
													title="Playback Speed"
												>
													<option value="0.5" className="bg-[#09090b]">
														0.5x
													</option>
													<option value="0.75" className="bg-[#09090b]">
														0.75x
													</option>
													<option value="1" className="bg-[#09090b]">
														1x
													</option>
													<option value="1.25" className="bg-[#09090b]">
														1.25x
													</option>
													<option value="1.5" className="bg-[#09090b]">
														1.5x
													</option>
													<option value="2" className="bg-[#09090b]">
														2x
													</option>
												</select>
											</div>
										</div>
									</div>
								</div>
							</div>
						</Panel>

						<PanelResizeHandle className="h-3 bg-[#09090b]/80 hover:bg-[#09090b] transition-colors rounded-full mx-4 flex items-center justify-center">
							<div className="w-8 h-1 bg-white/20 rounded-full"></div>
						</PanelResizeHandle>

						{/* Timeline section */}
						<Panel defaultSize={30} minSize={20}>
							<div className="h-full bg-[#09090b] rounded-2xl border border-white/5 shadow-lg overflow-hidden flex flex-col">
								<TimelineEditor
									videoDuration={duration}
									currentTime={currentTime}
									onSeek={handleSeek}
									cursorTelemetry={cursorTelemetry}
									zoomRegions={zoomRegions}
									onZoomAdded={handleZoomAdded}
									onZoomSuggested={handleZoomSuggested}
									onZoomSpanChange={handleZoomSpanChange}
									onZoomDelete={handleZoomDelete}
									selectedZoomId={selectedZoomId}
									onSelectZoom={handleSelectZoom}
									trimRegions={trimRegions}
									onTrimAdded={handleTrimAdded}
									onTrimSpanChange={handleTrimSpanChange}
									onTrimDelete={handleTrimDelete}
									selectedTrimId={selectedTrimId}
									onSelectTrim={handleSelectTrim}
									annotationRegions={annotationRegions}
									onAnnotationAdded={handleAnnotationAdded}
									onAnnotationSpanChange={handleAnnotationSpanChange}
									onAnnotationDelete={handleAnnotationDelete}
									selectedAnnotationId={selectedAnnotationId}
									onSelectAnnotation={handleSelectAnnotation}
									captionRegions={captionRegions}
									onCaptionAdded={handleCaptionAdded}
									onCaptionSpanChange={handleCaptionSpanChange}
									onCaptionDelete={handleCaptionDelete}
									selectedCaptionId={selectedCaptionId}
									onSelectCaption={setSelectedCaptionId}
									aspectRatio={aspectRatio}
									onAspectRatioChange={setAspectRatio}
									showCursorHighlighter={showCursorHighlighter}
									onShowCursorHighlighterChange={setShowCursorHighlighter}
								/>
							</div>
						</Panel>
					</PanelGroup>
				</div>

				{/* Right section: settings panel */}
				<SettingsPanel
					selected={wallpaper}
					onWallpaperChange={setWallpaper}
					selectedZoomDepth={
						selectedZoomId ? zoomRegions.find((z) => z.id === selectedZoomId)?.depth : null
					}
					onZoomDepthChange={(depth) => selectedZoomId && handleZoomDepthChange(depth)}
					selectedZoomId={selectedZoomId}
					onZoomDelete={handleZoomDelete}
					selectedTrimId={selectedTrimId}
					onTrimDelete={handleTrimDelete}
					shadowIntensity={shadowIntensity}
					onShadowChange={setShadowIntensity}
					showBlur={showBlur}
					onBlurChange={setShowBlur}
					motionBlurEnabled={motionBlurEnabled}
					onMotionBlurChange={setMotionBlurEnabled}
					borderRadius={borderRadius}
					onBorderRadiusChange={setBorderRadius}
					padding={padding}
					onPaddingChange={setPadding}
					cropRegion={cropRegion}
					onCropChange={setCropRegion}
					aspectRatio={aspectRatio}
					videoElement={videoPlaybackRef.current?.video || null}
					exportQuality={exportQuality}
					onExportQualityChange={setExportQuality}
					exportFormat={exportFormat}
					onExportFormatChange={setExportFormat}
					gifFrameRate={gifFrameRate}
					onGifFrameRateChange={setGifFrameRate}
					gifLoop={gifLoop}
					onGifLoopChange={setGifLoop}
					gifSizePreset={gifSizePreset}
					onGifSizePresetChange={setGifSizePreset}
					gifOutputDimensions={calculateOutputDimensions(
						videoPlaybackRef.current?.video?.videoWidth || 1920,
						videoPlaybackRef.current?.video?.videoHeight || 1080,
						gifSizePreset,
						GIF_SIZE_PRESETS,
					)}
					customExportWidth={customExportWidth}
					onCustomExportWidthChange={setCustomExportWidth}
					customExportHeight={customExportHeight}
					onCustomExportHeightChange={setCustomExportHeight}
					customExportBitrate={customExportBitrate}
					onCustomExportBitrateChange={setCustomExportBitrate}
					onExport={handleOpenExportDialog}
					selectedAnnotationId={selectedAnnotationId}
					annotationRegions={annotationRegions}
					onAnnotationContentChange={handleAnnotationContentChange}
					onAnnotationTypeChange={handleAnnotationTypeChange}
					onAnnotationStyleChange={handleAnnotationStyleChange}
					onAnnotationFigureDataChange={handleAnnotationFigureDataChange}
					onAnnotationDelete={handleAnnotationDelete}
				/>
			</div>

			<Toaster theme="dark" className="pointer-events-auto" />

			<ExportDialog
				isOpen={showExportDialog}
				onClose={() => setShowExportDialog(false)}
				progress={exportProgress}
				isExporting={isExporting}
				error={exportError}
				onCancel={handleCancelExport}
				exportFormat={exportFormat}
			/>
		</div>
	);
}
