import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, ImageBackground } from "react-native";
import { supabase } from "../lib/supabase";
import { Goal, ActivityLevel, Gender } from "../lib/types";

interface Props {
  onComplete: () => void;
}

export default function ProfileSetup({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState<Gender>("männlich");
  const [goal, setGoal] = useState<Goal>("muskelaufbau");
  const [activity, setActivity] = useState<ActivityLevel>("moderat");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name || !age || !weight || !height) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    if (isNaN(ageNum) || isNaN(weightNum) || isNaN(heightNum)) {
      Alert.alert("Error", "Please enter valid numbers");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); Alert.alert("Error", "Not logged in"); return; }
    
    console.log("Saving profile for user:", user.id);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id, email: user.email, name,
      age: ageNum, weight: weightNum, height: heightNum,
      gender, goal, activity_level: activity,
      updated_at: new Date().toISOString(),
    });

    setLoading(false);
    if (error) {
      console.error("Profile save error:", error);
      Alert.alert("Fehler beim Speichern", error.message + "\n\nCode: " + error.code);
    } else {
      console.log("Profile saved successfully!");
      onComplete();
    }
  }

  const pickerBtn = (label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity key={label} style={[styles.pickerBtn, selected && styles.pickerBtnActive]} onPress={onPress}>
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
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickerBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "#2a2a4e" },
  pickerBtnActive: { backgroundColor: "#6c63ff", borderColor: "#6c63ff" },
  pickerText: { color: "#888", fontSize: 13, fontWeight: "500" },
  pickerTextActive: { color: "#fff" },
  button: { backgroundColor: "#6c63ff", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
