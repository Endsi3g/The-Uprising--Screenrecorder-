/**
 * OpenScreen Mobile – Connect Screen
 * Manual IP input to point the app at the desktop OpenScreen server.
 * Validates by hitting /api/recording/status before saving.
 */
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SERVER_URL_KEY, fetchRecordingStatus, getServerUrl, saveServerUrl } from "../../lib/api";
import { useAppStore } from "../../lib/store";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ConnectScreen() {
  const { serverUrl, setServerUrl, isConnected, setConnected, setRecordingStatus } = useAppStore();
  const [input, setInput] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getServerUrl().then((url) => {
      setInput(url);
      setServerUrl(url);
    });
  }, [setServerUrl]);

  const handleConnect = async () => {
    const raw = input.trim().replace(/\/$/, "");
    if (!raw.startsWith("http")) {
      Alert.alert("Invalid URL", "Enter a full URL like http://192.168.1.100:3001");
      return;
    }
    setTesting(true);
    try {
      const status = await fetchRecordingStatus(raw);
      await saveServerUrl(raw);
      setServerUrl(raw);
      setConnected(true);
      setRecordingStatus(status);
      Alert.alert("Connected!", `Desktop found at\n${raw}`);
    } catch {
      setConnected(false);
      Alert.alert(
        "Connection failed",
        `Could not reach ${raw}\n\nMake sure:\n• Desktop OpenScreen is running\n• Both devices are on the same Wi-Fi`,
      );
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    await AsyncStorage.removeItem(SERVER_URL_KEY);
    setConnected(false);
    setServerUrl("");
    setInput("");
    Alert.alert("Disconnected", "Server URL cleared.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Connect to Desktop</Text>
      <Text style={styles.subtitle}>
        Open OpenScreen on your desktop, click the 📱 Mobile button in the HUD, then scan the QR
        code or enter the URL manually below.
      </Text>

      {/* Status Badge */}
      <View style={styles.badge}>
        <View
          style={[
            styles.badgeDot,
            { backgroundColor: isConnected ? "#22c55e" : "#6b7280" },
          ]}
        />
        <Text style={styles.badgeText}>
          {isConnected ? `Connected · ${serverUrl}` : "Not connected"}
        </Text>
      </View>

      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        placeholder="http://192.168.x.x:3001"
        placeholderTextColor="#4b5563"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="go"
        onSubmitEditing={handleConnect}
      />

      <TouchableOpacity
        style={[styles.btn, testing && styles.btnDisabled]}
        onPress={handleConnect}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Connect</Text>
        )}
      </TouchableOpacity>

      {isConnected && (
        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
          <Text style={styles.disconnectBtnText}>Disconnect</Text>
        </TouchableOpacity>
      )}

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>How to find the IP</Text>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.tip}>
        1. On the desktop, click the <Text style={styles.tipBold}>Mobile</Text> button in the HUD
        bar.{"\n"}
        2. The IP address is shown under the QR code.{"\n"}
        3. Enter it here as{" "}
        <Text style={styles.tipCode}>http://{"<IP>"}:3001</Text>
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e16",
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  title: {
    color: "#f3f4f6",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: -4,
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { color: "#9ca3af", fontSize: 13 },
  input: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f3f4f6",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  btn: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disconnectBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  disconnectBtnText: { color: "#f87171", fontSize: 15 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.07)" },
  dividerText: { color: "#4b5563", fontSize: 12 },
  tip: { color: "#6b7280", fontSize: 13, lineHeight: 22 },
  tipBold: { color: "#9ca3af", fontWeight: "700" },
  tipCode: { color: "#a78bfa", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
