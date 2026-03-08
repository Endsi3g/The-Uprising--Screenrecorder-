/** OpenScreen Mobile – API Client
 * Reads the server URL from AsyncStorage (set on the Connect screen).
 * All functions accept an optional baseUrl override for testability.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const SERVER_URL_KEY = "openscreen_server_url";

export async function getServerUrl(): Promise<string> {
  const url = await AsyncStorage.getItem(SERVER_URL_KEY);
  return url ?? "http://192.168.1.1:3001";
}

export async function saveServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/$/, ""));
}

// ─── Recording ───────────────────────────────────────────────────────────────

export interface RecordingStatus {
  isRecording: boolean;
  sourceName: string;
  elapsed: number;
}

export async function fetchRecordingStatus(baseUrl?: string): Promise<RecordingStatus> {
  const url = baseUrl ?? (await getServerUrl());
  const res = await fetch(`${url}/api/recording/status`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function startRecording(baseUrl?: string): Promise<{ success: boolean; message?: string }> {
  const url = baseUrl ?? (await getServerUrl());
  const res = await fetch(`${url}/api/recording/start`, {
    method: "POST",
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}

export async function stopRecording(baseUrl?: string): Promise<{ success: boolean; message?: string }> {
  const url = baseUrl ?? (await getServerUrl());
  const res = await fetch(`${url}/api/recording/stop`, {
    method: "POST",
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}

// ─── Preview ──────────────────────────────────────────────────────────────────

export interface PreviewResponse {
  success: boolean;
  thumbnail?: string; // data:image/png;base64,…
  width?: number;
  height?: number;
}

export async function fetchPreview(baseUrl?: string): Promise<PreviewResponse> {
  const url = baseUrl ?? (await getServerUrl());
  const res = await fetch(`${url}/api/preview`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Ideas ────────────────────────────────────────────────────────────────────

export interface Idea {
  id: string;
  text: string;
  createdAt: string;
}

export async function fetchIdeas(baseUrl?: string): Promise<Idea[]> {
  const url = baseUrl ?? (await getServerUrl());
  const res = await fetch(`${url}/api/ideas`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function saveIdeas(ideas: Idea[], baseUrl?: string): Promise<void> {
  const url = baseUrl ?? (await getServerUrl());
  const res = await fetch(`${url}/api/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ideas),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
