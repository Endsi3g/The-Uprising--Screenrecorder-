import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { HighlightRegion } from "../components/video-editor/types";

const MIN_HIGHLIGHT_DURATION_MS = 2000;
const PEAK_THRESHOLD_MULTIPLIER = 2.5;

export function useAudioAnalyzer() {
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [progress, setProgress] = useState(0);

	const analyzeVideoAudio = useCallback(async (videoUrl: string): Promise<HighlightRegion[]> => {
		setIsAnalyzing(true);
		setProgress(0);
		
		try {
			setProgress(10);
			const response = await fetch(videoUrl);
			const arrayBuffer = await response.arrayBuffer();
			
			setProgress(30);
			const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
			const audioCtx = new AudioCtx();
			const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
			
			setProgress(60);
			const channelData = audioBuffer.getChannelData(0);
			const sampleRate = audioBuffer.sampleRate;
			
			// Analyze 100ms windows
			const windowSizeMs = 100;
			const windowSamples = Math.floor(sampleRate * (windowSizeMs / 1000));
			
			let sumSquares = 0;
			let totalWindows = 0;
			const windowEnergies: number[] = [];
			
			for (let i = 0; i < channelData.length; i += windowSamples) {
				let windowSumSquare = 0;
				let endIndex = Math.min(i + windowSamples, channelData.length);
				
				for (let j = i; j < endIndex; j++) {
					windowSumSquare += channelData[j] * channelData[j];
				}
				
				const rms = Math.sqrt(windowSumSquare / (endIndex - i));
				windowEnergies.push(rms);
				sumSquares += rms;
				totalWindows++;
			}
			
			setProgress(80);
			const averageEnergy = sumSquares / totalWindows;
			const threshold = averageEnergy * PEAK_THRESHOLD_MULTIPLIER;
			
			const highlights: HighlightRegion[] = [];
			let inHighlight = false;
			let highlightStartMs = 0;
			let maxIntensity = 0;
			
			for (let w = 0; w < windowEnergies.length; w++) {
				const energy = windowEnergies[w];
				const currentMs = w * windowSizeMs;
				
				if (energy > threshold) {
					if (!inHighlight) {
						inHighlight = true;
						highlightStartMs = currentMs;
						maxIntensity = energy;
					} else {
						maxIntensity = Math.max(maxIntensity, energy);
					}
				} else {
					if (inHighlight) {
						inHighlight = false;
						
						let endMs = currentMs;
						if (endMs - highlightStartMs < MIN_HIGHLIGHT_DURATION_MS) {
							const center = (highlightStartMs + endMs) / 2;
							highlightStartMs = Math.max(0, center - MIN_HIGHLIGHT_DURATION_MS / 2);
							endMs = center + MIN_HIGHLIGHT_DURATION_MS / 2;
						}
						
						highlights.push({
							id: uuidv4(),
							startMs: highlightStartMs,
							endMs,
							intensity: maxIntensity
						});
					}
				}
			}
			
			if (inHighlight) {
				const endMs = windowEnergies.length * windowSizeMs;
				highlights.push({
					id: uuidv4(),
					startMs: highlightStartMs,
					endMs,
					intensity: maxIntensity
				});
			}
			
			const mergedHighlights: HighlightRegion[] = [];
			for (const h of highlights) {
				if (mergedHighlights.length === 0) {
					mergedHighlights.push(h);
				} else {
					const last = mergedHighlights[mergedHighlights.length - 1];
					if (h.startMs - last.endMs < 2000) { 
						last.endMs = h.endMs;
						last.intensity = Math.max(last.intensity, h.intensity);
					} else {
						mergedHighlights.push(h);
					}
				}
			}
			
			setProgress(100);
			setIsAnalyzing(false);
			
			const globalMax = Math.max(...mergedHighlights.map((h) => h.intensity), 0.01);
			
			// Close AudioContext
			if (audioCtx.state !== 'closed') {
				audioCtx.close();
			}

			return mergedHighlights.map((h) => ({
				...h,
				intensity: Math.max(0, Math.min(1, h.intensity / globalMax))
			}));
			
		} catch (err) {
			console.error("Audio analysis failed:", err);
			setIsAnalyzing(false);
			setProgress(0);
			throw err;
		}
	}, []);

	return {
		analyzeVideoAudio,
		isAnalyzing,
		progress
	};
}
