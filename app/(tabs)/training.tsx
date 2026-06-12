import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Linking } from "react-native";
import { supabase } from "../../lib/supabase";
import { Profile, TrainingDay } from "../../lib/types";
import { generateTrainingPlan } from "../../lib/planGenerator";
import ProfileSetup from "../../components/ProfileSetup";
import { useAuth } from "../../lib/AuthContext";

export default function TrainingScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      setProfile(data as Profile);
      setShowSetup(false);
    } else {
      setShowSetup(true);
    }
  }, []);

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
  }, [loadProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const openVideo = (videoId: string) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    // Web: window.open, Mobile: Linking
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  if (showSetup) {
    return <ProfileSetup onComplete={() => { setShowSetup(false); loadProfile(); }} />;
  }

  const plan = profile ? generateTrainingPlan(profile) : [];
  const today = new Date().getDay();
  const todayName = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][today];
  const todayPlan = plan.find(d => d.day === todayName);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6c63ff" />}
    >
      <Text style={styles.pageTitle}>Training Plan</Text>
      <Text style={styles.pageSub}>
        {profile?.goal === "abnehmen" ? "Weight Loss" : profile?.goal === "muskelaufbau" ? "Muscle Building" : "Maintain"} Focus
      </Text>

      {todayPlan && (
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>TODAY</Text>
          <Text style={styles.todayFocus}>{todayPlan.focus}</Text>
          <Text style={styles.todayCount}>{todayPlan.exercises.length} exercises</Text>
        </View>
      )}

      {plan.map((day) => (
        <TouchableOpacity
          key={day.day}
          style={[styles.dayCard, day.day === todayName && styles.dayCardToday]}
          onPress={() => setSelectedDay(selectedDay === day.day ? null : day.day)}
          activeOpacity={0.7}
        >
          <View style={styles.dayHeader}>
            <View>
              <Text style={[styles.dayName, day.day === todayName && styles.dayNameToday]}>{day.day}</Text>
              <Text style={styles.dayFocus}>{day.focus}</Text>
            </View>
            <Text style={styles.expandIcon}>{selectedDay === day.day ? "▲" : "▼"}</Text>
          </View>

          {selectedDay === day.day && (
            <View style={styles.exerciseList}>
              {day.exercises.map((ex, i) => (
                <View key={i} style={styles.exerciseRow}>
                  <View style={styles.exNum}>
                    <Text style={styles.exNumText}>{i + 1}</Text>
                  </View>
                  <View style={styles.exInfo}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <Text style={styles.exDetails}>{ex.sets} sets × {ex.reps}</Text>
                  </View>
                  {ex.videoId && (
                    <TouchableOpacity
                      style={styles.playBtn}
                      onPress={() => openVideo(ex.videoId!)}
                    >
                      <Text style={styles.playIcon}>▶</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08080f" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
  pageSub: { fontSize: 14, color: "#666", marginTop: 4, marginBottom: 24 },
  todayCard: { backgroundColor: "#6c63ff", borderRadius: 16, padding: 20, marginBottom: 20 },
  todayLabel: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)", letterSpacing: 2 },
  todayFocus: { fontSize: 20, fontWeight: "700", color: "#fff", marginTop: 4 },
  todayCount: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  dayCard: { backgroundColor: "#1a1a2e", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#2a2a4e" },
  dayCardToday: { borderColor: "#6c63ff", borderWidth: 2 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayName: { fontSize: 18, fontWeight: "700", color: "#fff" },
  dayNameToday: { color: "#6c63ff" },
  dayFocus: { fontSize: 13, color: "#666", marginTop: 2 },
  expandIcon: { fontSize: 12, color: "#555" },
  exerciseList: { marginTop: 16, gap: 10 },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#12121f",
    borderRadius: 12,
    padding: 12,
  },
  exNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0f0f1a",
    justifyContent: "center",
    alignItems: "center",
  },
  exNumText: { fontSize: 12, fontWeight: "700", color: "#6c63ff" },
  exInfo: { flex: 1 },
  exName: { fontSize: 15, fontWeight: "600", color: "#fff" },
  exDetails: { fontSize: 13, color: "#666", marginTop: 2 },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ff0000",
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: { fontSize: 14, color: "#fff", marginLeft: 2 },
});
