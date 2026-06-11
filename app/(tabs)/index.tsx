import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, ImageBackground, Dimensions } from "react-native";
import { supabase } from "../../lib/supabase";
import { Profile } from "../../lib/types";
import ProfileSetup from "../../components/ProfileSetup";
import WeightTracker from "../../components/WeightTracker";
import { calcBMR, calcTDEE, calcTargetCalories, calcMacros } from "../../lib/planGenerator";

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [today] = useState(() => {
    const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    return days[new Date().getDay()];
  });

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("Dashboard: No user session");
      return;
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (error) {
      console.error("Dashboard: Profile load error:", error.message, "Code:", error.code);
      // Wenn der Fehler 'relation does not exist' ist -> Tabellen existieren nicht
      if (error.code === "42P01") {
        Alert.alert("Datenbank nicht eingerichtet", "Die Tabellen wurden nicht erstellt. Bitte führe das SQL-Script im Supabase SQL Editor aus.");
      }
      setShowSetup(true);
    } else if (data) {
      setProfile(data as Profile);
      setShowSetup(false);
    } else {
      console.log("Dashboard: No profile found, showing setup");
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
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  if (showSetup) {
    return <ProfileSetup onComplete={() => { setShowSetup(false); loadProfile(); }} />;
  }

  const bmr = profile ? calcBMR(profile) : 0;
  const tdee = profile ? calcTDEE(bmr, profile.activity_level) : 0;
  const targetCal = profile ? calcTargetCalories(tdee, profile.goal) : 0;
  const macros = profile ? calcMacros(targetCal, profile.goal) : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6c63ff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Background */}
        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80" }}
          style={styles.hero}
          imageStyle={{ opacity: 0.3 }}
        >
          <View style={styles.heroOverlay}>
            <Text style={styles.greeting}>Welcome, {profile?.name}</Text>
            <Text style={styles.date}>{today}</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{profile?.weight} kg</Text>
                <Text style={styles.heroStatLabel}>Weight</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{profile?.height} cm</Text>
                <Text style={styles.heroStatLabel}>Height</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{profile?.age}</Text>
                <Text style={styles.heroStatLabel}>Age</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* Goal Card */}
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>GOAL</Text>
          <Text style={styles.goalValue}>
            {profile?.goal === "abnehmen" ? "Weight Loss" : profile?.goal === "muskelaufbau" ? "Muscle Building" : "Maintain"}
          </Text>
          <Text style={styles.goalSub}>TDEE {tdee} kcal — Target {targetCal} kcal</Text>
        </View>

        {/* Macro Targets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Targets</Text>
          <View style={styles.macroGrid}>
            <View style={[styles.macroCard, { borderLeftColor: "#ff6b6b" }]}>
              <Text style={styles.macroValue}>{macros.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={[styles.macroCard, { borderLeftColor: "#ffd93d" }]}>
              <Text style={styles.macroValue}>{macros.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={[styles.macroCard, { borderLeftColor: "#6bcb77" }]}>
              <Text style={styles.macroValue}>{macros.fat}g</Text>
              <Text style={styles.macroLabel}>Fats</Text>
            </View>
          </View>
          <Text style={styles.calories}>{targetCal} kcal</Text>
        </View>

        {/* Weight Tracker */}
        <WeightTracker />

        {/* Navigation Cards */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navCard} activeOpacity={0.8}>
            <Text style={styles.navTitle}>Training</Text>
            <Text style={styles.navSub}>View your plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navCard} activeOpacity={0.8}>
            <Text style={styles.navTitle}>Nutrition</Text>
            <Text style={styles.navSub}>Meal plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08080f",
  },
  content: {
    paddingBottom: 100,
  },
  hero: {
    width: width,
    height: 280,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(8,8,15,0.6)",
    justifyContent: "flex-end",
    padding: 24,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  heroStatLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#2a2a4e",
  },
  goalCard: {
    backgroundColor: "#1a1a2e",
    marginHorizontal: 16,
    marginTop: -40,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2a2a4e",
  },
  goalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6c63ff",
    letterSpacing: 2,
  },
  goalValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
  goalSub: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  macroGrid: {
    gap: 8,
  },
  macroCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  macroLabel: {
    fontSize: 13,
    color: "#888",
  },
  calories: {
    fontSize: 14,
    color: "#6c63ff",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  navRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 16,
  },
  navCard: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2a2a4e",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  navSub: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
});
