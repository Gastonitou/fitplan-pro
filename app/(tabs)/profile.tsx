import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Profile, Goal, ActivityLevel, Gender } from "../../lib/types";

export default function ProfileScreen() {
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

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (error) {
      console.error("Profile load error:", error.message, error.code);
    } else if (data) {
      const p = data as Profile;
      setProfile(p);
      setName(p.name);
      setAge(String(p.age));
      setWeight(String(p.weight));
      setHeight(String(p.height));
      setGender(p.gender);
      setGoal(p.goal);
      setActivity(p.activity_level);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleSave() {
    if (!name || !age || !weight || !height) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); Alert.alert("Error", "Not logged in. Please re-login."); return; }

    // Save with separate update/insert instead of upsert (RLS safer)
    let error;
    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    
    // Check if profile exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    
    if (existing) {
      const result = await supabase
        .from("profiles")
        .update({
          name, age: ageNum, weight: weightNum, height: heightNum,
          gender, goal, activity_level: activity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("profiles")
        .insert({
          id: user.id, email: user.email, name,
          age: ageNum, weight: weightNum, height: heightNum,
          gender, goal, activity_level: activity,
        });
      error = result.error;
    }
    
    setSaving(false);
    if (error) {
      console.error("Profile save error:", error);
      Alert.alert("Fehler beim Speichern", 
        error.message + "\nCode: " + error.code + "\n" + (error.details || ""));
    } else {
      Alert.alert("Saved", "Profile updated successfully");
      loadProfile();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    // Clear all local storage too (für mobile web)
    try {
      localStorage.clear();
    } catch(e) {}
    router.replace("/(auth)/login");
  }

  const pickerBtn = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity key={label} style={[styles.pickerBtn, selected && styles.pickerBtnActive]} onPress={onPress}>
      <Text style={[styles.pickerText, selected && styles.pickerTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#6c63ff" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Profile</Text>
      <Text style={styles.pageSub}>Your settings</Text>

      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#555" value={name} onChangeText={setName} />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} placeholder="Age" placeholderTextColor="#555" value={age} onChangeText={setAge} keyboardType="numeric" />
          <TextInput style={[styles.input, styles.half]} placeholder="Height (cm)" placeholderTextColor="#555" value={height} onChangeText={setHeight} keyboardType="numeric" />
        </View>
        <TextInput style={styles.input} placeholder="Weight (kg)" placeholderTextColor="#555" value={weight} onChangeText={setWeight} keyboardType="numeric" />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.pickerRow}>
          {pickerBtn("Male", gender === "männlich", () => setGender("männlich"))}
          {pickerBtn("Female", gender === "weiblich", () => setGender("weiblich"))}
        </View>

        <Text style={styles.label}>Goal</Text>
        <View style={styles.pickerRow}>
          {pickerBtn("Weight Loss", goal === "abnehmen", () => setGoal("abnehmen"))}
          {pickerBtn("Muscle Building", goal === "muskelaufbau", () => setGoal("muskelaufbau"))}
          {pickerBtn("Maintain", goal === "erhalten", () => setGoal("erhalten"))}
        </View>

        <Text style={styles.label}>Activity Level</Text>
        <View style={styles.pickerRow}>
          {pickerBtn("Sedentary", activity === "wenig", () => setActivity("wenig"))}
          {pickerBtn("Moderate", activity === "moderat", () => setActivity("moderat"))}
          {pickerBtn("Active", activity === "aktiv", () => setActivity("aktiv"))}
          {pickerBtn("Very Active", activity === "sehr_aktiv", () => setActivity("sehr_aktiv"))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Signed in as</Text>
        <Text style={styles.infoValue}>{profile?.email || "---"}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>FitPlan Pro v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08080f" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
  pageSub: { fontSize: 14, color: "#666", marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: "#1a1a2e", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#2a2a4e", gap: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "#666", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
  input: { backgroundColor: "#0f0f1a", borderRadius: 12, padding: 16, fontSize: 16, color: "#fff", borderWidth: 1, borderColor: "#2a2a4e" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickerBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#0f0f1a", borderWidth: 1, borderColor: "#2a2a4e" },
  pickerBtnActive: { backgroundColor: "#6c63ff", borderColor: "#6c63ff" },
  pickerText: { color: "#888", fontSize: 13, fontWeight: "500" },
  pickerTextActive: { color: "#fff" },
  saveBtn: { backgroundColor: "#6c63ff", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  infoCard: { backgroundColor: "#1a1a2e", borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "#2a2a4e" },
  infoLabel: { fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1 },
  infoValue: { fontSize: 15, color: "#fff", marginTop: 4 },
  logoutBtn: { marginTop: 24, padding: 16, alignItems: "center", backgroundColor: "#1a1010", borderRadius: 12, borderWidth: 1, borderColor: "#3a1a1a" },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#ff6b6b" },
  version: { fontSize: 11, color: "#333", textAlign: "center", marginTop: 24 },
});
