/**
 * OpenScreen Mobile – Remote Preview Screen
 * Fetches a screenshot thumbnail from /api/preview every 2 s while recording is active.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchPreview } from "../../lib/api";
import { useAppStore } from "../../lib/store";

export default function PreviewScreen() {
  const { isConnected, isRecording } = useAppStore();
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPreview();
      if (data.success && data.thumbnail) {
        setThumbnail(data.thumbnail);
        setError(null);
      } else {
        setError("Preview unavailable");
      }
    } catch {
      setError("Could not reach desktop");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    refresh();
    pollRef.current = setInterval(refresh, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isConnected, refresh]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live Preview</Text>
      <Text style={styles.subtitle}>
        {isRecording ? "● Recording" : "Not recording"}
      </Text>

      <View style={styles.frame}>
        {loading && <ActivityIndicator color="#7c3aed" size="large" />}
        {!loading && error && <Text style={styles.error}>{error}</Text>}
        {!loading && !error && thumbnail && (
          <Image
            source={{ uri: thumbnail }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
        {!loading && !error && !thumbnail && (
          <Text style={styles.error}>No preview yet</Text>
        )}
      </View>

      <Text style={styles.hint}>Refreshes every 2.5 seconds</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e16",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 12,
  },
  title: {
    color: "#f3f4f6",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
  },
  frame: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginTop: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  error: {
    color: "#6b7280",
    fontSize: 14,
  },
  hint: {
    color: "#374151",
    fontSize: 12,
    marginTop: 4,
  },
});
