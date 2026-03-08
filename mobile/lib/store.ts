/** OpenScreen Mobile – Zustand global store */
import { create } from "zustand";

interface AppStore {
  serverUrl: string;
  isConnected: boolean;
  isRecording: boolean;
  sourceName: string;
  elapsed: number;
  setServerUrl: (url: string) => void;
  setConnected: (v: boolean) => void;
  setRecordingStatus: (status: { isRecording: boolean; sourceName: string; elapsed: number }) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  serverUrl: "",
  isConnected: false,
  isRecording: false,
  sourceName: "",
  elapsed: 0,
  setServerUrl: (url) => set({ serverUrl: url }),
  setConnected: (v) => set({ isConnected: v }),
  setRecordingStatus: ({ isRecording, sourceName, elapsed }) =>
    set({ isRecording, sourceName, elapsed }),
}));
