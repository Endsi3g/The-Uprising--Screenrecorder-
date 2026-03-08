/**
 * OpenScreen Mobile – Remote Control Screen
 * Polls recording status every 2 s and lets the user start/stop recording remotely.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchRecordingStatus, startRecording, stopRecording } from "../../lib/api";
import { useAppStore } from "../../lib/store";

function formatElapsed(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RemoteScreen() {
  const { isRecording, sourceName, elapsed, setRecordingStatus, isConnected, setConnected } =
    useAppStore();
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const s = await fetchRecordingStatus();
      setRecordingStatus(s);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [setRecordingStatus, setConnected]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const result = isRecording ? await stopRecording() : await startRecording();
      if (!result.success && result.message) {
        Alert.alert("Info", result.message);
      }
      await poll();
    } catch (e) {
      Alert.alert("Error", "Could not reach OpenScreen desktop. Make sure you are on the same Wi-Fi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: isConnected ? "#22c55e" : "#6b7280" }]} />
        <Text style={styles.statusText}>
          {isConnected ? "Connected" : "Disconnected"}
        </Text>
      </View>

      {/* Source Name */}
      {sourceName ? (
        <Text style={styles.sourceLabel}>{sourceName}</Text>
      ) : (
        <Text style={styles.sourceLabel}>No source selected</Text>
      )}

      {/* Big Record Button */}
      <TouchableOpacity
        style={[
          styles.bigButton,
          isRecording ? styles.bigButtonStop : styles.bigButtonRecord,
          (!isConnected || loading) && styles.bigButtonDisabled,
        ]}
        onPress={handleToggle}
        disabled={!isConnected || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <>
            <View
              style={[
                styles.recordIcon,
                isRecording ? styles.stopIcon : styles.startIcon,
              ]}
            />
            <Text style={styles.bigButtonLabel}>
              {isRecording ? "Stop" : "Record"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Timer */}
      <Text style={[styles.timer, isRecording && styles.timerActive]}>
        {isRecording ? formatElapsed(elapsed) : "00:00"}
      </Text>

      {!isConnected && (
        <Text style={styles.hint}>
          Go to the Connect tab and enter your desktop IP address.
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e16",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "absolute",
    top: 60,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  sourceLabel: {
    color: "#6b7280",
    fontSize: 14,
    marginBottom: -12,
  },
  bigButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 32,
    shadowOpacity: 0.6,
    elevation: 12,
  },
  bigButtonRecord: {
    backgroundColor: "#7c3aed",
    shadowColor: "#7c3aed",
  },
  bigButtonStop: {
    backgroundColor: "#dc2626",
    shadowColor: "#dc2626",
  },
  bigButtonDisabled: {
    opacity: 0.4,
  },
  recordIcon: {
    width: 32,
    height: 32,
  },
  startIcon: {
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  stopIcon: {
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  bigButtonLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  timer: {
    color: "#4b5563",
    fontSize: 36,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  timerActive: {
    color: "#f87171",
  },
  hint: {
    color: "#6b7280",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
    position: "absolute",
    bottom: 80,
  },
});
