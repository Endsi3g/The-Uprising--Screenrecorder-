import { useEffect, useState } from "react";
import { MdMic, MdVideocam, MdVideocamOff } from "react-icons/md";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import styles from "./SourceSelector.module.css";

interface DesktopSource {
	id: string;
	name: string;
	thumbnail: string | null;
	display_id: string;
	appIcon: string | null;
}

export function SourceSelector() {
	const [sources, setSources] = useState<DesktopSource[]>([]);
	const [selectedSource, setSelectedSource] = useState<DesktopSource | null>(null);
	const [loading, setLoading] = useState(true);
	const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
	const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
	const [cameraEnabled, setCameraEnabled] = useState(false);
	const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
	const [selectedMic, setSelectedMic] = useState<string | null>(null);

	useEffect(() => {
		async function fetchSources() {
			setLoading(true);
			try {
				const rawSources = await window.electronAPI.getSources({
					types: ["screen", "window"],
					thumbnailSize: { width: 320, height: 180 },
					fetchWindowIcons: true,
				});
				setSources(
					rawSources.map((source) => ({
						id: source.id,
						name:
							source.id.startsWith("window:") && source.name.includes(" — ")
								? source.name.split(" — ")[1] || source.name
								: source.name,
						thumbnail: source.thumbnail,
						display_id: source.display_id,
						appIcon: source.appIcon,
					})),
				);
			} catch (error) {
				console.error("Error loading sources:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchSources();

		async function fetchCameras() {
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const videoDevices = devices.filter((d) => d.kind === "videoinput");
				setCameras(videoDevices);

				const lastCamera = await window.electronAPI.getSelectedCamera();
				const isEnabled = await window.electronAPI.getCameraEnabled();

				setSelectedCamera(lastCamera || videoDevices[0]?.deviceId || null);
				setCameraEnabled(isEnabled);
			} catch (error) {
				console.error("Error loading cameras:", error);
			}
		}

		async function fetchAudioDevices() {
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const micDevices = devices.filter((d) => d.kind === "audioinput");
				setMicrophones(micDevices);

				const lastMic = await window.electronAPI.getSelectedMic();
				setSelectedMic(lastMic || micDevices[0]?.deviceId || null);
			} catch (error) {
				console.error("Error loading microphones:", error);
			}
		}
		fetchCameras();
		fetchAudioDevices();
	}, []);

	const screenSources = sources.filter((s) => s.id.startsWith("screen:"));
	const windowSources = sources.filter((s) => s.id.startsWith("window:"));

	const handleSourceSelect = (source: DesktopSource) => setSelectedSource(source);

	const handleShare = async () => {
		if (selectedSource) {
			await window.electronAPI.setSelectedCamera(selectedCamera);
			await window.electronAPI.toggleCameraEnabled(cameraEnabled);
			await window.electronAPI.setSelectedMic(selectedMic);
			await window.electronAPI.selectSource(selectedSource);
		}
	};

	const toggleCamera = async () => {
		const newState = await window.electronAPI.toggleCameraOverlay();
		setCameraEnabled(newState);
	};

	if (loading) {
		return (
			<div
				className={`h-full flex items-center justify-center ${styles.glassContainer}`}
				style={{ minHeight: "100vh" }}
			>
				<div className="text-center">
					<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-600 mx-auto mb-2" />
					<p className="text-xs text-zinc-300">Loading sources...</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`min-h-screen flex flex-col items-center justify-center ${styles.glassContainer}`}
		>
			<div className="flex-1 flex flex-col w-full max-w-xl" style={{ padding: 0 }}>
				<Tabs defaultValue="screens">
					<TabsList className="grid grid-cols-3 mb-3 bg-zinc-900/40 rounded-full">
						<TabsTrigger
							value="screens"
							className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white text-zinc-200 rounded-full text-xs py-1"
						>
							Screens
						</TabsTrigger>
						<TabsTrigger
							value="windows"
							className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white text-zinc-200 rounded-full text-xs py-1"
						>
							Windows
						</TabsTrigger>
						<TabsTrigger
							value="camera"
							className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white text-zinc-200 rounded-full text-xs py-1"
						>
							Camera
						</TabsTrigger>
					</TabsList>
					<div className="h-72 flex flex-col justify-stretch">
						<TabsContent value="screens" className="h-full">
							<div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-72 pr-2 custom-scrollbar">
								{screenSources.length === 0 ? (
									<div className="col-span-2 text-center py-8 text-zinc-500 text-xs">
										No screens available
									</div>
								) : (
									screenSources.map((source) => (
										<div
											key={source.id}
											onClick={() => handleSourceSelect(source)}
											onDoubleClick={handleShare}
											className={`relative flex flex-col items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
												selectedSource?.id === source.id
													? "border-blue-500 bg-blue-500/10"
													: "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800"
											}`}
										>
											{source.thumbnail ? (
												<img
													src={source.thumbnail}
													alt={source.name}
													className="w-full aspect-video object-cover rounded bg-black"
												/>
											) : (
												<div className="w-full aspect-video bg-zinc-800 rounded flex items-center justify-center">
													<MdVideocam className="w-8 h-8 text-zinc-600" />
												</div>
											)}
											<span className="text-[10px] text-zinc-300 font-medium truncate w-full text-center">
												{source.name}
											</span>
										</div>
									))
								)}
							</div>
						</TabsContent>
						<TabsContent value="windows" className="h-full">
							<div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-72 pr-2 custom-scrollbar">
								{windowSources.length === 0 ? (
									<div className="col-span-2 text-center py-8 text-zinc-500 text-xs">
										No windows available
									</div>
								) : (
									windowSources.map((source) => (
										<div
											key={source.id}
											onClick={() => handleSourceSelect(source)}
											className={`relative flex flex-col items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
												selectedSource?.id === source.id
													? "border-blue-500 bg-blue-500/10"
													: "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800"
											}`}
										>
											<div className="relative w-full aspect-video flex-shrink-0 bg-black rounded overflow-hidden">
												{source.thumbnail ? (
													<img
														src={source.thumbnail}
														alt={source.name}
														className="w-full h-full object-cover"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<MdVideocam className="w-8 h-8 text-zinc-600" />
													</div>
												)}
												{source.appIcon && (
													<div className="absolute bottom-1 right-1 w-6 h-6 bg-zinc-900 rounded-md p-1 shadow-lg border border-zinc-700">
														<img
															src={source.appIcon}
															alt=""
															className="w-full h-full object-contain"
														/>
													</div>
												)}
											</div>
											<span className="text-[10px] text-zinc-300 font-medium truncate w-full text-center">
												{source.name}
											</span>
										</div>
									))
								)}
							</div>
						</TabsContent>
						<TabsContent value="camera" className="h-full">
							<div className="flex flex-col gap-4 p-4 overflow-y-auto max-h-72 custom-scrollbar">
								<div className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">
									<div className="flex items-center gap-3">
										{cameraEnabled ? (
											<MdVideocam className="text-blue-500 text-xl" />
										) : (
											<MdVideocamOff className="text-zinc-500 text-xl" />
										)}
										<div>
											<div className="text-xs font-medium text-zinc-200">Camera Overlay</div>
											<div className="text-[10px] text-zinc-400">
												{cameraEnabled ? "Visible (PiP)" : "Hidden"}
											</div>
										</div>
									</div>
									<Button
										onClick={toggleCamera}
										variant={cameraEnabled ? "default" : "outline"}
										className={`text-[10px] h-7 px-3 rounded-full ${cameraEnabled ? "bg-blue-600 hover:bg-blue-700" : "bg-zinc-800 border-zinc-700"}`}
									>
										{cameraEnabled ? "Disable" : "Enable"}
									</Button>
								</div>

								<div className="space-y-4">
									<div className="space-y-2">
										<label className="text-[10px] text-zinc-500 uppercase font-bold px-1">
											Select Camera
										</label>
										<div className="grid grid-cols-1 gap-2">
											{cameras.map((device) => (
												<div
													key={device.deviceId}
													onClick={() => setSelectedCamera(device.deviceId)}
													className={`flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-all ${
														selectedCamera === device.deviceId
															? "bg-blue-600/10 border-blue-500/50 text-blue-400"
															: "bg-zinc-900/20 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40"
													}`}
												>
													<div
														className={`w-2 h-2 rounded-full ${selectedCamera === device.deviceId ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-zinc-700"}`}
													/>
													<span className="text-xs truncate">
														{device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
													</span>
												</div>
											))}
											{cameras.length === 0 && (
												<div className="text-center py-4 text-zinc-500 text-xs italic">
													No cameras found
												</div>
											)}
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] text-zinc-500 uppercase font-bold px-1 flex items-center gap-1">
											<MdMic size={12} /> Microphone Selection
										</label>
										<div className="grid grid-cols-1 gap-2">
											{microphones.map((device) => (
												<div
													key={device.deviceId}
													onClick={() => setSelectedMic(device.deviceId)}
													className={`flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-all ${
														selectedMic === device.deviceId
															? "bg-emerald-600/10 border-emerald-500/50 text-emerald-400"
															: "bg-zinc-900/20 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40"
													}`}
												>
													<div
														className={`w-2 h-2 rounded-full ${selectedMic === device.deviceId ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-700"}`}
													/>
													<span className="text-xs truncate">
														{device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
													</span>
												</div>
											))}
											{microphones.length === 0 && (
												<div className="text-center py-4 text-zinc-500 text-xs italic">
													No microphones found
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						</TabsContent>
					</div>
				</Tabs>
			</div>
			<div className="border-t border-zinc-800 p-2 w-full max-w-xl">
				<div className="flex justify-center gap-2">
					<Button
						variant="outline"
						onClick={() => window.close()}
						className="px-4 py-1 text-xs bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
					>
						Cancel
					</Button>
					<Button
						onClick={handleShare}
						disabled={!selectedSource}
						className="px-4 py-1 text-xs bg-[#3B82F6] text-white hover:bg-[#3B82F6]/80 disabled:opacity-50 disabled:bg-zinc-700"
					>
						Share
					</Button>
				</div>
			</div>
		</div>
	);
}
