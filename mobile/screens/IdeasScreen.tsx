/**
 * OpenScreen Mobile – Ideas Screen
 * Lists ideas synced from the desktop ~/userData/ideas.json.
 * Allows adding new ideas and syncing them back.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Idea, fetchIdeas, saveIdeas } from "../../lib/api";
import { useAppStore } from "../../lib/store";

export default function IdeasScreen() {
  const { isConnected } = useAppStore();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  const loadIdeas = useCallback(async () => {
    try {
      const list = await fetchIdeas();
      setIdeas(list);
    } catch {
      /* silent fail when disconnected */
    }
  }, []);

  useEffect(() => {
    if (isConnected) loadIdeas();
  }, [isConnected, loadIdeas]);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    const idea: Idea = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: newText.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [idea, ...ideas];
    setIdeas(updated);
    setNewText("");
    setSaving(true);
    try {
      await saveIdeas(updated);
    } catch {
      Alert.alert("Sync failed", "The idea was saved locally but could not sync with the desktop.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const updated = ideas.filter((i) => i.id !== id);
    setIdeas(updated);
    try {
      await saveIdeas(updated);
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Video Ideas</Text>
      <Text style={styles.subtitle}>Synced with OpenScreen desktop</Text>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.inputRow}
      >
        <TextInput
          style={styles.input}
          value={newText}
          onChangeText={setNewText}
          placeholder="New idea…"
          placeholderTextColor="#4b5563"
          returnKeyType="send"
          onSubmitEditing={handleAdd}
          editable={isConnected}
        />
        <TouchableOpacity
          style={[styles.addBtn, (!isConnected || !newText.trim()) && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!isConnected || !newText.trim() || saving}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {ideas.length === 0 && (
        <Text style={styles.empty}>
          {isConnected ? "No ideas yet. Add your first!" : "Connect to see synced ideas."}
        </Text>
      )}

      <FlatList
        data={ideas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.ideaCard}>
            <Text style={styles.ideaText}>{item.text}</Text>
            <Text style={styles.ideaDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e16",
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    color: "#f3f4f6",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f3f4f6",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: "#fff", fontSize: 22, lineHeight: 26 },
  empty: {
    color: "#4b5563",
    fontSize: 14,
    textAlign: "center",
    marginTop: 48,
  },
  ideaCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ideaText: {
    flex: 1,
    color: "#e5e7eb",
    fontSize: 15,
  },
  ideaDate: {
    color: "#4b5563",
    fontSize: 11,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
