import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ImageBackground } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Login failed", error.message);
    } else {
      router.replace("/(tabs)");
    }
  }

  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80" }}
      style={styles.background}
      imageStyle={{ opacity: 0.25 }}
    >
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.inner}>
          <Text style={styles.brand}>FitPlan Pro</Text>
          <Text style={styles.subtitle}>Your personal fitness coach</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#555"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#555"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
            </TouchableOpacity>
          </View>

          <Link href="/(auth)/register" style={styles.link}>
            <Text style={styles.linkText}>Don't have an account? Register</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#08080f" },
  overlay: { flex: 1, backgroundColor: "rgba(8,8,15,0.7)" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  brand: { fontSize: 36, fontWeight: "800", color: "#fff", textAlign: "center", letterSpacing: 1 },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginTop: 8, marginBottom: 48 },
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
