import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, ImageBackground } from "react-native";
import { supabase } from "../lib/supabase";
import { Goal, ActivityLevel, Gender } from "../lib/types";
import { useAuth } from "../lib/AuthContext";

const IS_WEB = Platform.OS === "web";

interface Props {
  onComplete: () => void;
}

export default function ProfileSetup({ onComplete }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState<Gender>("männlich");
  const [goal, setGoal] = useState<Goal>("muskelaufbau");
  const [activity, setActivity] = useState<ActivityLevel>("moderat");
  const [loading, setLoading] = useState(false);

  function showMsg(title: string, msg: string) {
    if (IS_WEB) {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  }

  async function handleSave() {
    if (!name || !age || !weight || !height) {
      showMsg("Error", "Please fill all fields");
      return;
    }
    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    if (isNaN(ageNum) || isNaN(weightNum) || isNaN(heightNum)) {
      showMsg("Error", "Please enter valid numbers");
      return;
    }

    setLoading(true);
    if (!user) { 
      setLoading(false);
      console.error("Save failed: no user in context");
      showMsg("Nicht eingeloggt", "Bitte log dich neu ein und versuch es nochmal");
      return; 
    }
    
    console.log("Saving profile for user:", user.id, "Session valid:", !!user);

    // Prüfen ob Profil schon existiert
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    
    let error;
    if (existing) {
      // Update existierendes Profil
      console.log("Profil existiert, update...");
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
      // Neues Profil anlegen
      console.log("Kein Profil gefunden, insert...");
      const result = await supabase
        .from("profiles")
        .insert({
          id: user.id, email: user.email, name,
          age: ageNum, weight: weightNum, height: heightNum,
          gender, goal, activity_level: activity,
        });
      error = result.error;
    }

    setLoading(false);
    if (error) {
      console.error("Profile save error:", error);
      showMsg("Fehler beim Speichern", 
        "Fehler: " + error.message + "\n\nCode: " + error.code + 
        "\n\nDetails: " + (error.details || "keine") +
        "\n\nBitte Gaston Screenshot von dieser Meldung schicken");
    } else {
      console.log("Profile saved successfully!");
      showMsg("Erfolg", "Deine Daten wurden gespeichert.");
      onComplete();
    }
  }

  const pickerBtn = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity key={label} style={[styles.pickerBtn, selected && styles.pickerBtnActive]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.pickerIndicator, selected && styles.pickerIndicatorActive]} />
      <Text style={[styles.pickerText, selected && styles.pickerTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80" }}
      style={styles.background}
      imageStyle={{ opacity: 0.15 }}
    >
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.inner}>
          <Text style={styles.title}>Set Up Your Profile</Text>
          <Text style={styles.subtitle}>So we can create your personalized plans</Text>

          <View style={styles.form}>
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

            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save & Continue</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#08080f" },
  overlay: { flex: 1, backgroundColor: "rgba(8,8,15,0.85)" },
  inner: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 8, letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 32 },
  form: { gap: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "#666", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
  input: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, fontSize: 16, color: "#fff", borderWidth: 1, borderColor: "#2a2a4e" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  pickerRow: { flexDirection: "column", gap: 8 },
  pickerBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5, borderColor: "#2a2a4e",
  },
  pickerBtnActive: {
    backgroundColor: "rgba(108,99,255,0.15)",
    borderColor: "#6c63ff",
    shadowColor: "#6c63ff", shadowOffset: {width:0,height:2},
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  pickerIndicator: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "transparent",
    borderWidth: 2, borderColor: "#444",
  },
  pickerIndicatorActive: {
    backgroundColor: "#6c63ff",
    borderColor: "#6c63ff",
    shadowColor: "#6c63ff", shadowOffset: {width:0,height:0},
    shadowOpacity: 0.8, shadowRadius: 4, elevation: 2,
  },
  pickerText: { color: "#666", fontSize: 13, fontWeight: "600" },
  pickerTextActive: { color: "#fff", fontWeight: "700" },
  button: { backgroundColor: "#6c63ff", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
