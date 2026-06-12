import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, ImageBackground } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getApiBase } from "../../lib/config";

const IS_WEB = Platform.OS === "web";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function showMsg(title: string, msg: string) {
    if (IS_WEB) {
      window.alert(title + "\n\n" + msg);
    } else {
      Alert.alert(title, msg);
    }
  }

  async function handleRegister() {
    try {
      if (!email || !password || !name) {
        showMsg("Error", "Please fill all fields");
        return;
      }
      if (password.length < 6) {
        showMsg("Error", "Password must be at least 6 characters");
        return;
      }
      setLoading(true);
      const normalizedEmail = email.trim().toLowerCase();

      // Direct registration via proxy API (no email verification needed)
      const apiBase = getApiBase();
      const res = await fetch(apiBase + "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password, name: name.trim() }),
      });

      if (!res.ok) {
        let errMsg = "Registrierung fehlgeschlagen";
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
        setLoading(false);
        showMsg("Fehler", errMsg);
        return;
      }

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        showMsg("Erfolg", "Account erstellt und eingeloggt!");
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          // Kurz warten damit Auth-Context den Session-Update sieht
          await new Promise(r => setTimeout(r, 300));
        }
        router.replace("/(tabs)");
      } else {
        showMsg("Fehler", "Registrierung fehlgeschlagen. Bitte erneut versuchen.");
      }
    } catch (err: any) {
      setLoading(false);
      showMsg("Fehler", err?.message || "Netzwerkfehler. Bitte erneut versuchen.");
    }
  }

  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80" }}
      style={styles.background}
      imageStyle={{ opacity: 0.25 }}
    >
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.inner}>
          <Text style={styles.brand}>FitPlan Pro</Text>
          <Text style={styles.subtitle}>Start your fitness journey</Text>

          <View style={styles.form}>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#555" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#555" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Password (min 6 chars)" placeholderTextColor="#555" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
            </TouchableOpacity>
          </View>

          <Link href="/(auth)/login" style={styles.link}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#08080f" },
  overlay: { flex: 1, backgroundColor: "rgba(8,8,15,0.7)" },
  inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 32, paddingVertical: 60 },
  brand: { fontSize: 36, fontWeight: "800", color: "#fff", textAlign: "center", letterSpacing: 1 },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginTop: 8, marginBottom: 40 },
  form: { gap: 16 },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2a2a4e",
  },
  button: { backgroundColor: "#6c63ff", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 24, alignItems: "center" },
  linkText: { color: "#6c63ff", fontSize: 14 },
});
