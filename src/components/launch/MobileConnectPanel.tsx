import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiCopy, FiCheck, FiRefreshCw, FiSmartphone, FiX } from "react-icons/fi";
import { Button } from "../ui/button";

interface ConnectionInfo {
	ip: string;
	port: number;
	url: string;
}

interface RecordingStatus {
	isRecording: boolean;
	sourceName: string;
	elapsed: number;
}

interface MobileConnectPanelProps {
	onClose: () => void;
}

export function MobileConnectPanel({ onClose }: MobileConnectPanelProps) {
	const [connInfo, setConnInfo] = useState<ConnectionInfo | null>(null);
	const [qrDataUrl, setQrDataUrl] = useState<string>("");
	const [status, setStatus] = useState<RecordingStatus>({ isRecording: false, sourceName: "", elapsed: 0 });
	const [copied, setCopied] = useState(false);
	const [loading, setLoading] = useState(true);
	const pollRef = useRef<NodeJS.Timeout | null>(null);

	const fetchConnectionInfo = useCallback(async () => {
		if (!window.electronAPI?.getMobileConnectionInfo) return;
		try {
			const info = await window.electronAPI.getMobileConnectionInfo();
			setConnInfo(info);
			// Generate QR code
			const dataUrl = await QRCode.toDataURL(info.url, {
				width: 180,
				margin: 1,
				color: { dark: "#ffffff", light: "#00000000" },
			});
			setQrDataUrl(dataUrl);
		} catch (e) {
			console.error("MobileConnectPanel: failed to load connection info", e);
		} finally {
			setLoading(false);
		}
	}, []);

	const pollStatus = useCallback(async () => {
		if (!window.electronAPI?.getRecordingStatus) return;
		try {
			const s = await window.electronAPI.getRecordingStatus();
			if (s) setStatus(s);
		} catch {}
	}, []);

	useEffect(() => {
		fetchConnectionInfo();
		pollStatus();
		pollRef.current = setInterval(pollStatus, 2000);
		return () => {
			if (pollRef.current) clearInterval(pollRef.current);
		};
	}, [fetchConnectionInfo, pollStatus]);

	const copyUrl = async () => {
		if (!connInfo) return;
		await navigator.clipboard.writeText(connInfo.url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const formatElapsed = (secs: number) => {
		const m = Math.floor(secs / 60).toString().padStart(2, "0");
		const s = (secs % 60).toString().padStart(2, "0");
		return `${m}:${s}`;
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
		>
			<div
				className="relative w-80 rounded-2xl p-6 flex flex-col items-center gap-4"
				style={{
					background: "linear-gradient(135deg, rgba(20,20,32,0.98) 0%, rgba(12,12,24,0.97) 100%)",
					border: "1px solid rgba(100,100,160,0.25)",
					boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
				}}
			>
				{/* Header */}
				<div className="w-full flex items-center justify-between">
					<div className="flex items-center gap-2 text-white font-semibold text-sm">
						<FiSmartphone size={16} className="text-violet-400" />
						Mobile Connect
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						className="text-white/50 hover:text-white hover:bg-white/10 w-7 h-7 rounded-lg"
					>
						<FiX size={14} />
					</Button>
				</div>

				{/* Recording Status Pill */}
				<div
					className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
					style={{
						background: status.isRecording
							? "rgba(239,68,68,0.18)"
							: "rgba(100,100,160,0.15)",
						border: `1px solid ${status.isRecording ? "rgba(239,68,68,0.4)" : "rgba(100,100,160,0.25)"}`,
						color: status.isRecording ? "#fca5a5" : "rgba(255,255,255,0.55)",
					}}
				>
					<span
						className="w-2 h-2 rounded-full"
						style={{
							background: status.isRecording ? "#ef4444" : "rgba(255,255,255,0.2)",
							boxShadow: status.isRecording ? "0 0 6px #ef4444" : "none",
						}}
					/>
					{status.isRecording
						? `Recording ${status.sourceName ? `• ${status.sourceName}` : ""} • ${formatElapsed(status.elapsed)}`
						: "Not Recording"}
				</div>

				{/* QR Code */}
				{loading ? (
					<div className="w-[180px] h-[180px] flex items-center justify-center">
						<FiRefreshCw size={24} className="text-white/30 animate-spin" />
					</div>
				) : qrDataUrl ? (
					<div
						className="rounded-xl overflow-hidden p-3"
						style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
					>
						<img src={qrDataUrl} alt="QR Code" width={156} height={156} />
					</div>
				) : (
					<div className="w-[180px] h-[180px] flex items-center justify-center text-white/30 text-xs text-center">
						QR unavailable
					</div>
				)}

				{/* URL */}
				{connInfo && (
					<button
						type="button"
						onClick={copyUrl}
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono w-full justify-between transition-all hover:bg-white/10 cursor-pointer"
						style={{ color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
					>
						<span className="truncate">{connInfo.url}</span>
						{copied ? (
							<FiCheck size={13} className="text-green-400 flex-shrink-0" />
						) : (
							<FiCopy size={13} className="flex-shrink-0 text-white/40" />
						)}
					</button>
				)}

				<p className="text-xs text-white/35 text-center leading-relaxed">
					Scan with the OpenScreen mobile app<br />
					or open the URL on your phone
				</p>
			</div>
		</div>
	);
}
