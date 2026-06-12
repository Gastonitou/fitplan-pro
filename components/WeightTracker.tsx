import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { WeightLog } from "../lib/types";
import { useAuth } from "../lib/AuthContext";

interface Props {
  onLog?: () => void;
}

export default function WeightTracker({ onLog }: Props) {
  const { user } = useAuth();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30);
    if (data) setWeightLogs(data as WeightLog[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  async function handleLogWeight() {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0 || w > 400) {
      Alert.alert("Error", "Please enter a valid weight (1-400 kg)");
      return;
    }
    setSaving(true);
    if (!user) { setSaving(false); return; }

    const today = new Date().toISOString().split("T")[0];
    const existing = weightLogs.find((l) => l.date === today);
    let error = null as any;

    if (existing) {
      const result = await supabase.from("weight_logs").update({ weight: w }).eq("id", existing.id);
      error = result.error;
    } else {
      const result = await supabase.from("weight_logs").insert({ user_id: user.id, date: today, weight: w });
      error = result.error;
    }

    if (error) {
      setSaving(false);
      console.error("Weight log save error:", error);
      Alert.alert("Speichern fehlgeschlagen", error.message || "Unbekannter Fehler");
      return;
    }

    setSaving(false);
    setWeightInput("");
    await loadLogs();
    onLog?.();
  }

  const changes = weightLogs.filter((l) => l.weight > 0).slice().reverse();
  const latest = changes.length > 0 ? changes[changes.length - 1] : null;
  const first = changes.length > 1 ? changes[0] : null;
  const diff = latest && first ? (latest.weight - first.weight).toFixed(1) : null;
  const recent = changes.slice(-7).reverse();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WEIGHT TRACKING</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>{latest ? `${latest.weight} kg` : "---"}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Started</Text>
          <Text style={styles.statValue}>{first ? `${first.weight} kg` : "---"}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Change</Text>
          <Text style={[styles.statValue, diff && parseFloat(diff) < 0 ? styles.green : styles.orange]}>
            {diff ? `${diff} kg` : "---"}
          </Text>
        </View>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Weight in kg"
          placeholderTextColor="#555"
          value={weightInput}
          onChangeText={setWeightInput}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.btn} onPress={handleLogWeight} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Log</Text>}
        </TouchableOpacity>
      </View>

      {recent.length > 0 && (
        <View style={styles.logList}>
          <Text style={styles.sectionTitle}>HISTORY</Text>
          {recent.map((log, i) => (
            <View key={log.id} style={styles.logRow}>
              <Text style={styles.logDate}>{formatDate(log.date)}</Text>
              <Text style={styles.logWeight}>{log.weight} kg</Text>
              {i > 0 && (
                <Text
                  style={[
                    styles.logDiff,
                    parseFloat((log.weight - recent[i - 1].weight).toFixed(1)) < 0 ? styles.green : styles.orange,
                  ]}
                >
                  {log.weight - recent[i - 1].weight > 0 ? "+" : ""}
                  {(log.weight - recent[i - 1].weight).toFixed(1)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator size="small" color="#6c63ff" />}
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2a2a4e",
    marginTop: 16,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6c63ff",
    letterSpacing: 2,
    marginBottom: 16,
  },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: "#0f0f1a", borderRadius: 12, padding: 12, alignItems: "center" },
  statLabel: { fontSize: 11, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  green: { color: "#6bcb77" },
  orange: { color: "#ff6b6b" },
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: "#0f0f1a",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2a2a4e",
  },
  btn: { backgroundColor: "#6c63ff", borderRadius: 12, paddingHorizontal: 24, justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#666", letterSpacing: 1, marginBottom: 8 },
  logList: { gap: 6 },
  logRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f0f1a", borderRadius: 8, padding: 10 },
  logDate: { flex: 1, fontSize: 13, color: "#888" },
  logWeight: { fontSize: 15, fontWeight: "600", color: "#fff", width: 70 },
  logDiff: { fontSize: 13, fontWeight: "500", textAlign: "right" },
});
