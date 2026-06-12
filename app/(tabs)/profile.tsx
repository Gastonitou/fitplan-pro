import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Dimensions } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Profile, Goal, ActivityLevel, Gender } from "../../lib/types";
import { useAuth } from "../../lib/AuthContext";

const IS_WEB = typeof window !== "undefined";
const { width: SCREEN_W } = Dimensions.get("window");

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState<Gender>("männlich");
  const [goal, setGoal] = useState<Goal>("muskelaufbau");
  const [activity, setActivity] = useState<ActivityLevel>("moderat");

  function showMsg(title: string, msg: string) {
    if (IS_WEB) { window.alert(`${title}\n\n${msg}`); }
    else { Alert.alert(title, msg); }
  }

  const loadProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (error) {
      console.error("Profile load error:", error.message, error.code);
    } else if (data) {
      const p = data as Profile;
      setProfile(p); setName(p.name);
      setAge(String(p.age)); setWeight(String(p.weight));
      setHeight(String(p.height)); setGender(p.gender);
      setGoal(p.goal); setActivity(p.activity_level);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleSave() {
    if (!name || !age || !weight || !height) {
      showMsg("Error", "Please fill all fields"); return;
    }
    setSaving(true);
    if (!user) { setSaving(false); showMsg("Error", "Not logged in. Please re-login."); return; }
    const ageNum = parseInt(age); const weightNum = parseFloat(weight); const heightNum = parseFloat(height);
    const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    let error;
    if (existing) {
      error = (await supabase.from("profiles").update({
        name, age: ageNum, weight: weightNum, height: heightNum,
        gender, goal, activity_level: activity, updated_at: new Date().toISOString(),
      }).eq("id", user.id)).error;
    } else {
      error = (await supabase.from("profiles").insert({
        id: user.id, email: user.email, name, age: ageNum,
        weight: weightNum, height: heightNum, gender, goal, activity_level: activity,
      })).error;
    }
    setSaving(false);
    if (error) {
      showMsg("Fehler beim Speichern", error.message + "\nCode: " + error.code + "\n" + (error.details || ""));
    } else {
      showMsg("Saved", "Profile updated successfully");
      loadProfile();
    }
  }

  async function handleLogout() {
    try { await supabase.auth.signOut(); } catch(e) {}
    try { for (const key of Object.keys(localStorage)) { if (key.startsWith("sb-") || key.startsWith("supabase")) localStorage.removeItem(key); } } catch(e) {}
    router.replace("/(auth)/login");
  }

  const pickerBtn = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity key={label} style={[styles.pickBtn, selected && styles.pickBtnActive]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.pickDot, selected && styles.pickDotActive]} />
      <Text style={[styles.pickText, selected && styles.pickTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const goalLabels = { muskelaufbau: "💪 Muscle Building", abnehmen: "🔥 Fat Loss", erhalten: "⚖️ Maintain" };
  const actLabels = { wenig: "🛋️ Sedentary", moderat: "🚶 Moderate", aktiv: "🏃 Active", sehr_aktiv: "🔥 Very Active" };
  const genderLabels = { männlich: "♂️ Male", weiblich: "♀️ Female" };
  const initials = (profile?.name || "U").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  if (loading) {
    return <View style={styles.loadWrap}><ActivityIndicator size="large" color="#7c6aff" /></View>;
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      {/* Decorative glows */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      {/* Header / Avatar */}
      <View style={styles.profileTop}>
        <View style={styles.avatarOuter}>
          <View style={styles.avatarInner}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={styles.profileName}>{profile?.name || "User"}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{goalLabels[goal] || "Muscle Building"}</Text>
          </View>
        </View>
        <Text style={styles.profileEmail}>{profile?.email || ""}</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{profile?.age || "-"}</Text>
          <Text style={styles.statLabel}>Age</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{profile?.weight || "-"}</Text>
          <Text style={styles.statLabel}>Weight</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{profile?.height || "-"}</Text>
          <Text style={styles.statLabel}>Height</Text>
        </View>
      </View>

      {/* Settings Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚙️ Your Settings</Text>

        <Text style={styles.fieldLabel}>Full Name</Text>
        <TextInput style={styles.inp} placeholder="Your name" placeholderTextColor="#555" value={name} onChangeText={setName} />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput style={styles.inp} placeholder="Age" placeholderTextColor="#555" value={age} onChangeText={setAge} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Height (cm)</Text>
            <TextInput style={styles.inp} placeholder="Height" placeholderTextColor="#555" value={height} onChangeText={setHeight} keyboardType="numeric" />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Weight (kg)</Text>
        <TextInput style={styles.inp} placeholder="Weight" placeholderTextColor="#555" value={weight} onChangeText={setWeight} keyboardType="numeric" />

        <Text style={styles.fieldLabel}>Gender</Text>
        <View style={styles.pickRow}>
          {pickerBtn("♂️ Male", gender === "männlich", () => setGender("männlich"))}
          {pickerBtn("♀️ Female", gender === "weiblich", () => setGender("weiblich"))}
        </View>

        <Text style={styles.fieldLabel}>Goal</Text>
        <View style={styles.pickRow}>
          {pickerBtn("🔥 Fat Loss", goal === "abnehmen", () => setGoal("abnehmen"))}
          {pickerBtn("💪 Muscle Building", goal === "muskelaufbau", () => setGoal("muskelaufbau"))}
          {pickerBtn("⚖️ Maintain", goal === "erhalten", () => setGoal("erhalten"))}
        </View>

        <Text style={styles.fieldLabel}>Activity Level</Text>
        <View style={styles.pickRow}>
          {pickerBtn("🛋️ Sedentary", activity === "wenig", () => setActivity("wenig"))}
          {pickerBtn("🚶 Moderate", activity === "moderat", () => setActivity("moderat"))}
          {pickerBtn("🏃 Active", activity === "aktiv", () => setActivity("aktiv"))}
          {pickerBtn("🔥 Very Active", activity === "sehr_aktiv", () => setActivity("sehr_aktiv"))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>💾 Save Changes</Text>}
        </TouchableOpacity>
      </View>

      {/* Activity Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{actLabels[activity] || "Moderate"}</Text>
            <Text style={styles.summaryLbl}>Activity Level</Text>
          </View>
        </View>
        {profile && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{genderLabels[gender] || "Male"}</Text>
              <Text style={styles.summaryLbl}>Gender</Text>
            </View>
          </View>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>FitPlan Pro v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#070712" },
  loadWrap: { flex: 1, backgroundColor: "#070712", justifyContent: "center", alignItems: "center" },
  content: { paddingBottom: 100, alignItems: "center" },

  // Background glows
  glow1: {
    position: "absolute", top: -80, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(124,106,255,0.12)",
  },
  glow2: {
    position: "absolute", top: 200, left: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(106,124,255,0.06)",
  },

  // Profile Header
  profileTop: { alignItems: "center", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  avatarOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(124,106,255,0.2)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 16,
    shadowColor: "#7c6aff", shadowOffset: {width:0,height:4},
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  avatarInner: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: "#7c6aff",
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  profileName: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 6 },
  badgeRow: { flexDirection: "row", marginBottom: 8 },
  badge: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, backgroundColor: "rgba(124,106,255,0.15)",
    borderWidth: 1, borderColor: "rgba(124,106,255,0.3)",
  },
  badgeText: { fontSize: 12, color: "#b8aeff", fontWeight: "600" },
  profileEmail: { fontSize: 13, color: "#555" },

  // Quick Stats
  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16, borderWidth: 1, borderColor: "#1e1e3a",
    marginHorizontal: 20, paddingVertical: 16,
    shadowColor: "#000", shadowOffset: {width:0,height:2},
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  statBox: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 11, color: "#666", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
  statDiv: { width: 1, height: 30, backgroundColor: "#1e1e3a" },

  // Card
  card: {
    width: SCREEN_W - 40, marginHorizontal: 20, marginTop: 20,
    backgroundColor: "rgba(26,26,50,0.7)",
    borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: "rgba(42,42,78,0.5)",
    shadowColor: "#000", shadowOffset: {width:0,height:4},
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#fff", marginBottom: 18 },

  // Fields
  fieldLabel: { fontSize: 11, fontWeight: "600", color: "#888", marginTop: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  inp: {
    backgroundColor: "rgba(15,15,26,0.8)", borderRadius: 14,
    padding: 15, fontSize: 16, color: "#fff",
    borderWidth: 1, borderColor: "#2a2a4e",
  },
  row2: { flexDirection: "row", gap: 12 },

  // Picker Buttons
  pickRow: { flexDirection: "column", gap: 8 },
  pickBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 18, paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1.5, borderColor: "#2a2a4e",
  },
  pickBtnActive: {
    backgroundColor: "rgba(124,106,255,0.15)",
    borderColor: "#7c6aff",
    shadowColor: "#7c6aff", shadowOffset: {width:0,height:2},
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  pickDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "transparent",
    borderWidth: 2, borderColor: "#444",
  },
  pickDotActive: {
    backgroundColor: "#7c6aff",
    borderColor: "#7c6aff",
    shadowColor: "#7c6aff", shadowOffset: {width:0,height:0},
    shadowOpacity: 0.8, shadowRadius: 4, elevation: 2,
  },
  pickText: { color: "#666", fontSize: 13, fontWeight: "600" },
  pickTextActive: { color: "#fff", fontWeight: "700" },

  // Save
  saveBtn: {
    backgroundColor: "#7c6aff", borderRadius: 14,
    padding: 16, alignItems: "center", marginTop: 20,
    shadowColor: "#7c6aff", shadowOffset: {width:0,height:4},
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Summary
  summaryRow: { marginBottom: 8 },
  summaryItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryVal: { fontSize: 15, color: "#ddd", fontWeight: "500" },
  summaryLbl: { fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1 },

  // Logout
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    width: SCREEN_W - 40, marginHorizontal: 20, marginTop: 20,
    padding: 16, borderRadius: 14,
    backgroundColor: "rgba(255,70,70,0.06)",
    borderWidth: 1, borderColor: "rgba(255,70,70,0.2)",
  },
  logoutIcon: { fontSize: 16 },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#ff6b6b" },
  version: { fontSize: 11, color: "#333", textAlign: "center", marginTop: 20, marginBottom: 10 },
});
