import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { supabase } from "../../lib/supabase";
import { Profile, NutritionDay } from "../../lib/types";
import { generateNutritionPlan } from "../../lib/planGenerator";
import ProfileSetup from "../../components/ProfileSetup";
import { useAuth } from "../../lib/AuthContext";

export default function NutritionScreen() {
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

  const plan: NutritionDay[] = profile ? generateNutritionPlan(profile) : [];
  const today = new Date().getDay();
  const todayName = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][today];
  const todayPlan = plan.find((d) => d.day === todayName);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6c63ff" />}
    >
      <Text style={styles.pageTitle}>Nutrition Plan</Text>
      <Text style={styles.pageSub}>Personalized meal plan</Text>

      {todayPlan && (
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>TODAY</Text>
          <Text style={styles.todayCalories}>{todayPlan.total_calories} kcal</Text>
          <View style={styles.todayMacros}>
            <Text style={styles.todayMacro}>P {todayPlan.total_protein}g</Text>
            <Text style={styles.todayMacro}>C {todayPlan.total_carbs}g</Text>
            <Text style={styles.todayMacro}>F {todayPlan.total_fat}g</Text>
          </View>
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
            <Text style={[styles.dayName, day.day === todayName && styles.dayNameToday]}>{day.day}</Text>
            <Text style={styles.expandIcon}>{selectedDay === day.day ? "▲" : "▼"}</Text>
          </View>

          <View style={styles.macroBar}>
            <View style={styles.macroStat}>
              <Text style={styles.macroStatValue}>{day.total_calories}</Text>
              <Text style={styles.macroStatLabel}>kcal</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroStat}>
              <Text style={[styles.macroStatValue, { color: "#ff6b6b" }]}>{day.total_protein}g</Text>
              <Text style={styles.macroStatLabel}>Protein</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroStat}>
              <Text style={[styles.macroStatValue, { color: "#ffd93d" }]}>{day.total_carbs}g</Text>
              <Text style={styles.macroStatLabel}>Carbs</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroStat}>
              <Text style={[styles.macroStatValue, { color: "#6bcb77" }]}>{day.total_fat}g</Text>
              <Text style={styles.macroStatLabel}>Fats</Text>
            </View>
          </View>

          {selectedDay === day.day && (
            <View style={styles.mealList}>
              {day.meals.map((meal, i) => (
                <View key={i} style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealTime}>{meal.time}</Text>
                    <Text style={styles.mealName}>{meal.name}</Text>
                  </View>
                  <Text style={styles.mealDesc}>{meal.description}</Text>
                  <View style={styles.mealMacros}>
                    <Text style={styles.mealMacro}>{meal.calories} kcal</Text>
                    <Text style={[styles.mealMacro, { color: "#ff6b6b" }]}>P {meal.protein}g</Text>
                    <Text style={[styles.mealMacro, { color: "#ffd93d" }]}>K {meal.carbs}g</Text>
                    <Text style={[styles.mealMacro, { color: "#6bcb77" }]}>F {meal.fat}g</Text>
                  </View>
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
  todayCalories: { fontSize: 28, fontWeight: "700", color: "#fff", marginTop: 4 },
  todayMacros: { flexDirection: "row", gap: 16, marginTop: 8 },
  todayMacro: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  dayCard: { backgroundColor: "#1a1a2e", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#2a2a4e" },
  dayCardToday: { borderColor: "#6c63ff", borderWidth: 2 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  dayName: { fontSize: 18, fontWeight: "700", color: "#fff" },
  dayNameToday: { color: "#6c63ff" },
  expandIcon: { fontSize: 12, color: "#555" },
  macroBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  macroStat: { alignItems: "center", flex: 1 },
  macroStatValue: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  macroStatLabel: { fontSize: 10, color: "#666", marginTop: 2, textTransform: "uppercase" },
  macroDivider: { width: 1, height: 30, backgroundColor: "#2a2a4e" },
  mealList: { marginTop: 16, gap: 12 },
  mealCard: { backgroundColor: "#12121f", borderRadius: 12, padding: 14 },
  mealHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  mealTime: { fontSize: 12, fontWeight: "600", color: "#6c63ff" },
  mealName: { fontSize: 15, fontWeight: "700", color: "#fff" },
  mealDesc: { fontSize: 13, color: "#888", marginBottom: 8 },
  mealMacros: { flexDirection: "row", gap: 12 },
  mealMacro: { fontSize: 12, fontWeight: "500", color: "#555" },
});
