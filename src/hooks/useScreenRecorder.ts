import { fixWebmDuration } from "@fix-webm-duration/fix";
import { useEffect, useRef, useState } from "react";

// Target visually lossless 4K @ 60fps; fall back gracefully when hardware cannot keep up
const TARGET_FRAME_RATE = 60;
const MIN_FRAME_RATE = 30;
const TARGET_WIDTH = 3840;
const TARGET_HEIGHT = 2160;
const FOUR_K_PIXELS = TARGET_WIDTH * TARGET_HEIGHT;
const QHD_WIDTH = 2560;
const QHD_HEIGHT = 1440;
const QHD_PIXELS = QHD_WIDTH * QHD_HEIGHT;

// Bitrates (bits per second) per resolution tier
const BITRATE_4K = 45_000_000;
const BITRATE_QHD = 28_000_000;
const BITRATE_BASE = 18_000_000;
const HIGH_FRAME_RATE_THRESHOLD = 60;
const HIGH_FRAME_RATE_BOOST = 1.7;

// Fallback track settings when the driver reports nothing
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

// Codec alignment: VP9/AV1 require dimensions divisible by 2
const CODEC_ALIGNMENT = 2;

const RECORDER_TIMESLICE_MS = 1000;
const CHROME_MEDIA_SOURCE = "desktop";
const RECORDING_FILE_PREFIX = "recording-";
const VIDEO_FILE_EXTENSION = ".webm";

type UseScreenRecorderReturn = {
	recording: boolean;
	toggleRecording: () => void;
};

export function useScreenRecorder(): UseScreenRecorderReturn {
	const [recording, setRecording] = useState(false);
	const mediaRecorder = useRef<MediaRecorder | null>(null);
	const stream = useRef<MediaStream | null>(null);
	const chunks = useRef<Blob[]>([]);
	const startTime = useRef<number>(0);

	const selectMimeType = () => {
		const preferred = [
			"video/webm;codecs=av1",
			"video/webm;codecs=h264",
			"video/webm;codecs=vp9",
			"video/webm;codecs=vp8",
			"video/webm",
		];

		return preferred.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
	};

	const computeBitrate = (width: number, height: number) => {
		const pixels = width * height;
		const highFrameRateBoost =
			TARGET_FRAME_RATE >= HIGH_FRAME_RATE_THRESHOLD ? HIGH_FRAME_RATE_BOOST : 1;

		if (pixels >= FOUR_K_PIXELS) {
			return Math.round(BITRATE_4K * highFrameRateBoost);
		}

		if (pixels >= QHD_PIXELS) {
			return Math.round(BITRATE_QHD * highFrameRateBoost);
		}

		return Math.round(BITRATE_BASE * highFrameRateBoost);
	};

	const stopRecording = useRef(() => {
		if (mediaRecorder.current?.state === "recording") {
			if (stream.current) {
				stream.current.getTracks().forEach((track) => track.stop());
			}
			mediaRecorder.current.stop();
			setRecording(false);

			window.electronAPI?.setRecordingState(false);
		}
	});

	useEffect(() => {
		let cleanup: (() => void) | undefined;

		if (window.electronAPI?.onStopRecordingFromTray) {
			cleanup = window.electronAPI.onStopRecordingFromTray(() => {
				stopRecording.current();
			});
		}

		return () => {
			if (cleanup) cleanup();

			if (mediaRecorder.current?.state === "recording") {
				mediaRecorder.current.stop();
			}
			if (stream.current) {
				stream.current.getTracks().forEach((track) => track.stop());
				stream.current = null;
			}
		};
	}, []);

	const startRecording = async () => {
		try {
			const selectedSource = await window.electronAPI.getSelectedSource();
			if (!selectedSource) {
				alert("Please select a source to record");
				return;
			}

			const cameraEnabled = await window.electronAPI.getCameraEnabled();
			const cameraId = await window.electronAPI.getSelectedCamera();

			// 1. Get Desktop Stream
			const desktopStream = await (navigator.mediaDevices as any).getUserMedia({
				audio: {
					mandatory: {
						chromeMediaSource: CHROME_MEDIA_SOURCE,
						chromeMediaSourceId: selectedSource.id,
					},
				},
				video: {
					mandatory: {
						chromeMediaSource: CHROME_MEDIA_SOURCE,
						chromeMediaSourceId: selectedSource.id,
						maxWidth: TARGET_WIDTH,
						maxHeight: TARGET_HEIGHT,
						maxFrameRate: TARGET_FRAME_RATE,
						minFrameRate: MIN_FRAME_RATE,
					},
				},
			});

			// 2. Get Camera Stream (if enabled)
			let cameraStream: MediaStream | null = null;
			if (cameraEnabled) {
				try {
					cameraStream = await navigator.mediaDevices.getUserMedia({
						video: cameraId
							? { deviceId: { exact: cameraId }, width: 1280, height: 720 }
							: { width: 1280, height: 720 },
						audio: false,
					});
				} catch (err) {
					console.warn("Could not access camera for PiP:", err);
				}
			}

			// 3. Get Microphone Stream
			let micStream: MediaStream | null = null;
			try {
				micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			} catch (micErr) {
				console.warn("Could not access microphone:", micErr);
			}

			// 4. Mix Audio
			const audioContext = new AudioContext();
			const mixedDest = audioContext.createMediaStreamDestination();
			let hasAudio = false;

			if (desktopStream.getAudioTracks().length > 0) {
				audioContext.createMediaStreamSource(desktopStream).connect(mixedDest);
				hasAudio = true;
			}
			if (micStream && micStream.getAudioTracks().length > 0) {
				audioContext.createMediaStreamSource(micStream).connect(mixedDest);
				hasAudio = true;
			}

			// 5. Canvas Compositing (PiP)
			const videoTrack = desktopStream.getVideoTracks()[0];
			const { width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT } = videoTrack.getSettings();

			const canvas = document.createElement("canvas");
			canvas.width = Math.floor(width / CODEC_ALIGNMENT) * CODEC_ALIGNMENT;
			canvas.height = Math.floor(height / CODEC_ALIGNMENT) * CODEC_ALIGNMENT;
			const ctx = canvas.getContext("2d", { alpha: false });

			if (!ctx) throw new Error("Could not get canvas context");

			const desktopVideo = document.createElement("video");
			desktopVideo.srcObject = desktopStream;
			desktopVideo.muted = true;
			await desktopVideo.play();

			let cameraVideo: HTMLVideoElement | null = null;
			if (cameraStream) {
				cameraVideo = document.createElement("video");
				cameraVideo.srcObject = cameraStream;
				cameraVideo.muted = true;
				await cameraVideo.play();
			}

			let animationId: number;
			const render = () => {
				// Draw Desktop
				ctx.drawImage(desktopVideo, 0, 0, canvas.width, canvas.height);

				// Draw Camera PiP (Circular)
				if (cameraVideo) {
					const pipSize = Math.min(canvas.width, canvas.height) * 0.15;
					const padding = 20;
					const x = canvas.width - pipSize - padding;
					const y = canvas.height - pipSize - padding;

					ctx.save();
					ctx.beginPath();
					ctx.arc(x + pipSize / 2, y + pipSize / 2, pipSize / 2, 0, Math.PI * 2);
					ctx.clip();

					// Mirror camera horizontal
					ctx.translate(x + pipSize, y);
					ctx.scale(-1, 1);
					ctx.drawImage(cameraVideo, 0, 0, pipSize, pipSize);
					ctx.restore();

					// Border
					ctx.strokeStyle = "white";
					ctx.lineWidth = 3;
					ctx.beginPath();
					ctx.arc(x + pipSize / 2, y + pipSize / 2, pipSize / 2, 0, Math.PI * 2);
					ctx.stroke();
				}

				animationId = requestAnimationFrame(render);
			};
			render();

			// 6. Final Stream
			const canvasStream = canvas.captureStream(TARGET_FRAME_RATE);
			const finalStream = new MediaStream();
			finalStream.addTrack(canvasStream.getVideoTracks()[0]);
			if (hasAudio) {
				finalStream.addTrack(mixedDest.stream.getAudioTracks()[0]);
			}

			stream.current = finalStream;
			// Store streams for cleanup
			const allStreams = [desktopStream, cameraStream, micStream].filter(Boolean) as MediaStream[];

			const videoBitsPerSecond = computeBitrate(canvas.width, canvas.height);
			const mimeType = selectMimeType();

			chunks.current = [];
			const recorder = new MediaRecorder(finalStream, { mimeType, videoBitsPerSecond });
			mediaRecorder.current = recorder;

			recorder.ondataavailable = (e) => {
				if (e.data && e.data.size > 0) chunks.current.push(e.data);
			};

			recorder.onstop = async () => {
				cancelAnimationFrame(animationId);
				allStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
				desktopVideo.srcObject = null;
				if (cameraVideo) cameraVideo.srcObject = null;

				if (chunks.current.length === 0) return;
				const duration = Date.now() - startTime.current;
				const buggyBlob = new Blob(chunks.current, { type: mimeType });
				chunks.current = [];
				const videoFileName = `${RECORDING_FILE_PREFIX}${Date.now()}${VIDEO_FILE_EXTENSION}`;

				try {
					const videoBlob = await fixWebmDuration(buggyBlob, duration);
					const arrayBuffer = await videoBlob.arrayBuffer();
					const videoResult = await window.electronAPI.storeRecordedVideo(
						arrayBuffer,
						videoFileName,
					);
					if (videoResult.success && videoResult.path) {
						await window.electronAPI.setCurrentVideoPath(videoResult.path);
					}
					await window.electronAPI.switchToEditor();
				} catch (error) {
					console.error("Error saving recording:", error);
				}
			};

			recorder.start(RECORDER_TIMESLICE_MS);
			startTime.current = Date.now();
			setRecording(true);
			window.electronAPI?.setRecordingState(true);
		} catch (error) {
			console.error("Failed to start recording:", error);
			setRecording(false);
		}
	};

	const toggleRecording = () => {
		recording ? stopRecording.current() : startRecording();
	};

	return { recording, toggleRecording };
}
