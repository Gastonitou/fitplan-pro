import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, ImageBackground, Dimensions, Alert, Animated, Easing } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Profile } from "../../lib/types";
import ProfileSetup from "../../components/ProfileSetup";
import WeightTracker from "../../components/WeightTracker";
import { calcBMR, calcTDEE, calcTargetCalories, calcMacros } from "../../lib/planGenerator";
import { useAuth } from "../../lib/AuthContext";

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [today] = useState(() => {
    const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    return days[new Date().getDay()];
  });
  const heroAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  const loadProfile = useCallback(async () => {
    if (!user) {
      console.log("Dashboard: No user in context");
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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 760,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentAnim, heroAnim]);

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
  const backgroundImage = "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1600&q=80";
  const proteinProgress = targetCal > 0 ? Math.min(1, (macros.protein * 4) / targetCal) : 0;
  const carbsProgress = targetCal > 0 ? Math.min(1, (macros.carbs * 4) / targetCal) : 0;
  const fatProgress = targetCal > 0 ? Math.min(1, (macros.fat * 9) / targetCal) : 0;

  return (
    <ImageBackground source={{ uri: backgroundImage }} style={styles.background}>
      <View style={styles.backgroundOverlay}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6c63ff" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section with Background */}
          <Animated.View
            style={{
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [26, 0],
                  }),
                },
              ],
            }}
          >
            <ImageBackground
              source={{ uri: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1400&q=80" }}
              style={styles.hero}
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
          </Animated.View>

          <Animated.View
            style={{
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            }}
          >
            {/* Goal Card */}
            <View style={styles.goalCard}>
              <Text style={styles.goalLabel}>GOAL</Text>
              <Text style={styles.goalValue}>
                {profile?.goal === "abnehmen" ? "Weight Loss" : profile?.goal === "muskelaufbau" ? "Muscle Building" : "Maintain"}
              </Text>
              <Text style={styles.goalSub}>TDEE {tdee} kcal - Target {targetCal} kcal</Text>
            </View>

            {/* Macro Targets */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Targets</Text>
              <View style={styles.macroGrid}>
                <View style={[styles.macroCard, { borderLeftColor: "#ff6b6b" }]}>
                  <View style={styles.macroTopRow}>
                    <Text style={styles.macroValue}>{macros.protein}g</Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.max(8, proteinProgress * 100)}%`, backgroundColor: "#ff6b6b" }]} />
                  </View>
                </View>
                <View style={[styles.macroCard, { borderLeftColor: "#ffd93d" }]}>
                  <View style={styles.macroTopRow}>
                    <Text style={styles.macroValue}>{macros.carbs}g</Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.max(8, carbsProgress * 100)}%`, backgroundColor: "#ffd93d" }]} />
                  </View>
                </View>
                <View style={[styles.macroCard, { borderLeftColor: "#6bcb77" }]}>
                  <View style={styles.macroTopRow}>
                    <Text style={styles.macroValue}>{macros.fat}g</Text>
                    <Text style={styles.macroLabel}>Fats</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.max(8, fatProgress * 100)}%`, backgroundColor: "#6bcb77" }]} />
                  </View>
                </View>
              </View>
              <Text style={styles.calories}>{targetCal} kcal</Text>
            </View>

            {/* Weight Tracker */}
            <WeightTracker />

            {/* Navigation Cards */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.navCard}
                activeOpacity={0.85}
                onPress={() => router.push("/(tabs)/training")}
              >
                <Text style={styles.navTitle}>Training</Text>
                <Text style={styles.navSub}>View your plan</Text>
                <Text style={styles.navHint}>Open now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navCard}
                activeOpacity={0.85}
                onPress={() => router.push("/(tabs)/nutrition")}
              >
                <Text style={styles.navTitle}>Nutrition</Text>
                <Text style={styles.navSub}>Meal plan</Text>
                <Text style={styles.navHint}>Open now</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#07070d",
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,5,10,0.82)",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingBottom: 110,
  },
  hero: {
    width: width,
    height: 300,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(8,8,15,0.52)",
    justifyContent: "flex-end",
    padding: 24,
    paddingTop: 72,
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
    backgroundColor: "rgba(10, 10, 18, 0.58)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
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
    backgroundColor: "rgba(18, 22, 34, 0.82)",
    marginHorizontal: 16,
    marginTop: -40,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(116, 129, 255, 0.38)",
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
    backgroundColor: "rgba(16, 20, 31, 0.86)",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  macroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
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
    backgroundColor: "rgba(16, 20, 31, 0.86)",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
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
  navHint: {
    marginTop: 10,
    fontSize: 11,
    color: "#9da6ff",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
});
