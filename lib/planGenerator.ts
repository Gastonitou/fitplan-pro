import { Profile, TrainingDay, NutritionDay, Meal, Exercise } from "./types";

// ─── Kalorien / Makro Berechnung ─────────────────────────────────────

function calcBMR(profile: Profile): number {
  if (profile.gender === "männlich") {
    return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
  }
  return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
}

function calcTDEE(bmr: number, level: string): number {
  const factors: Record<string, number> = {
    wenig: 1.2,
    moderat: 1.375,
    aktiv: 1.55,
    sehr_aktiv: 1.725,
  };
  return Math.round(bmr * (factors[level] || 1.375));
}

function calcTargetCalories(tdee: number, goal: string): number {
  if (goal === "abnehmen") return Math.round(tdee - 500);
  if (goal === "muskelaufbau") return Math.round(tdee + 300);
  return tdee;
}

function calcMacros(calories: number, goal: string) {
  let proteinRatio = 0.3;
  let carbRatio = 0.4;
  let fatRatio = 0.3;

  if (goal === "muskelaufbau") {
    proteinRatio = 0.35;
    carbRatio = 0.45;
    fatRatio = 0.2;
  } else if (goal === "abnehmen") {
    proteinRatio = 0.4;
    carbRatio = 0.3;
    fatRatio = 0.3;
  }

  const protein = Math.round((calories * proteinRatio) / 4);
  const carbs = Math.round((calories * carbRatio) / 4);
  const fat = Math.round((calories * fatRatio) / 9);

  return { protein, carbs, fat, calories };
}

// ─── Übungen mit YouTube-Video-IDs ──────────────────────────────────

const strengthExercises: Record<string, Exercise[]> = {
  brust: [
    { name: "Bench Press", sets: 4, reps: "8-12", videoId: "hWbUlkb5Ms4" },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", videoId: "ou6s32mJgjU" },
    { name: "Cable Flys", sets: 3, reps: "12-15", videoId: "I-Ue34qLxc4" },
    { name: "Dips", sets: 3, reps: "8-12", videoId: "ncNo0kTzzYk" },
  ],
  rücken: [
    { name: "Deadlift", sets: 4, reps: "6-8", videoId: "ZaTM37cfiDs" },
    { name: "Pull-ups / Lat Pulldown", sets: 4, reps: "8-12", videoId: "SALxEARiMkw" },
    { name: "Barbell Row", sets: 3, reps: "10-12", videoId: "Nqh7q3zDCoQ" },
    { name: "Face Pulls", sets: 3, reps: "15-20", videoId: "IeOqdw9WI90" },
  ],
  beine: [
    { name: "Barbell Squat", sets: 4, reps: "8-10", videoId: "gcNh17Ckjgg" },
    { name: "Leg Press", sets: 3, reps: "10-12", videoId: "p5dCqF7wWUw" },
    { name: "Leg Extension", sets: 3, reps: "12-15", videoId: "uM86QE59Tgc" },
    { name: "Leg Curl", sets: 3, reps: "12-15", videoId: "_lgE0gPvbik" },
    { name: "Calf Raises", sets: 4, reps: "15-20", videoId: "wdOkFomQNp8" },
  ],
  schulter: [
    { name: "Military Press", sets: 4, reps: "8-10", videoId: "_RlRDWO2jfg" },
    { name: "Lateral Raises", sets: 3, reps: "12-15", videoId: "Kl3LEzQ5Zqs" },
    { name: "Front Raises", sets: 3, reps: "12-15", videoId: "4HXCYnztyh8" },
    { name: "Reverse Flys", sets: 3, reps: "15-20", videoId: "-TKqxK7-ehc" },
  ],
  arme: [
    { name: "Barbell Curl", sets: 4, reps: "10-12", videoId: "QZEqB6wUPxQ" },
    { name: "Hammer Curls", sets: 3, reps: "12-15", videoId: "BRVDS6HVR9Q" },
    { name: "Tricep Pushdown", sets: 4, reps: "12-15", videoId: "-zLyUAo1gMw" },
    { name: "Skull Crushers", sets: 3, reps: "10-12", videoId: "zR9gty7LUxE" },
  ],
};

const pushExercises: Exercise[] = [
  { name: "Bench Press", sets: 4, reps: "8-12", videoId: "hWbUlkb5Ms4" },
  { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", videoId: "ou6s32mJgjU" },
  { name: "Lateral Raises", sets: 3, reps: "12-15", videoId: "Kl3LEzQ5Zqs" },
  { name: "Tricep Pushdown", sets: 3, reps: "12-15", videoId: "-zLyUAo1gMw" },
  { name: "Cable Flys", sets: 3, reps: "12-15", videoId: "I-Ue34qLxc4" },
];

const pullExercises: Exercise[] = [
  { name: "Deadlift", sets: 4, reps: "6-8", videoId: "ZaTM37cfiDs" },
  { name: "Pull-ups / Lat Pulldown", sets: 4, reps: "8-12", videoId: "SALxEARiMkw" },
  { name: "Barbell Row", sets: 3, reps: "10-12", videoId: "Nqh7q3zDCoQ" },
  { name: "Face Pulls", sets: 3, reps: "15-20", videoId: "IeOqdw9WI90" },
  { name: "Barbell Curl", sets: 3, reps: "10-12", videoId: "QZEqB6wUPxQ" },
];

const legExercises: Exercise[] = [
  { name: "Barbell Squat", sets: 4, reps: "8-10", videoId: "gcNh17Ckjgg" },
  { name: "Leg Press", sets: 3, reps: "10-12", videoId: "p5dCqF7wWUw" },
  { name: "Leg Extension", sets: 3, reps: "12-15", videoId: "uM86QE59Tgc" },
  { name: "Leg Curl", sets: 3, reps: "12-15", videoId: "_lgE0gPvbik" },
  { name: "Calf Raises", sets: 4, reps: "15-20", videoId: "wdOkFomQNp8" },
];

const enduranceExercises: Exercise[] = [
  { name: "Bodyweight Squats", sets: 3, reps: "20-25", videoId: "eFEVKmp3M4g" },
  { name: "Push-ups", sets: 3, reps: "15-20", videoId: "_YrJc-kTYA0" },
  { name: "Band Rows", sets: 3, reps: "15-20", videoId: "hqFwwv6dFGY" },
  { name: "Lunges", sets: 3, reps: "12-15 per leg", videoId: "1cS-6KsJW9g" },
  { name: "Plank", sets: 3, reps: "45-60 sec", videoId: "v25dawSzRTM" },
];

const recoveryExercise: Exercise[] = [
  { name: "Stretching & Mobility", sets: 1, reps: "15 min", videoId: "t2jel6q1GRk" },
];

const cardioExercise: Exercise[] = [
  { name: "Walk / Light Jog", sets: 1, reps: "20-30 min", videoId: "A0Ivwa8RPDg" },
];

function generateTrainingPlan(profile: Profile): TrainingDay[] {
  if (profile.goal === "abnehmen") {
    return [
      { day: "Montag", focus: "Push Day", exercises: pushExercises },
      { day: "Dienstag", focus: "Cardio & Core", exercises: enduranceExercises },
      { day: "Mittwoch", focus: "Pull Day", exercises: pullExercises },
      { day: "Donnerstag", focus: "Leg Day", exercises: legExercises },
      { day: "Freitag", focus: "Full Body HIIT", exercises: enduranceExercises },
      { day: "Samstag", focus: "Active Recovery", exercises: cardioExercise },
      { day: "Sonntag", focus: "Rest Day", exercises: recoveryExercise },
    ];
  }
  if (profile.goal === "muskelaufbau") {
    return [
      { day: "Montag", focus: "Chest & Triceps", exercises: strengthExercises.brust },
      { day: "Dienstag", focus: "Back & Biceps", exercises: strengthExercises.rücken },
      { day: "Mittwoch", focus: "Rest Day", exercises: recoveryExercise },
      { day: "Donnerstag", focus: "Leg Day", exercises: strengthExercises.beine },
      { day: "Freitag", focus: "Shoulders & Arms", exercises: [...strengthExercises.schulter, ...strengthExercises.arme] },
      { day: "Samstag", focus: "Light Full Body", exercises: pushExercises.slice(0, 3) },
      { day: "Sonntag", focus: "Rest Day", exercises: recoveryExercise },
    ];
  }
  // erhalten
  return [
    { day: "Montag", focus: "Push", exercises: pushExercises.slice(0, 4) },
    { day: "Dienstag", focus: "Pull", exercises: pullExercises.slice(0, 4) },
    { day: "Mittwoch", focus: "Legs", exercises: legExercises.slice(0, 3) },
    { day: "Donnerstag", focus: "Rest Day", exercises: recoveryExercise },
    { day: "Freitag", focus: "Full Body", exercises: [...pushExercises.slice(0, 2), ...pullExercises.slice(0, 2)] },
    { day: "Samstag", focus: "Cardio", exercises: enduranceExercises.slice(0, 3) },
    { day: "Sonntag", focus: "Rest Day", exercises: [] },
  ];
}

// ─── Ernährungsplan ──────────────────────────────────────────────────

function generateDayMeals(calories: number, protein: number, carbs: number, fat: number, goal: string): Meal[] {
  const isLose = goal === "abnehmen";
  const isGain = goal === "muskelaufbau";
  const mealSize = isLose ? 0.8 : isGain ? 1.2 : 1.0;

  return [
    {
      time: "07:30",
      name: "Frühstück",
      calories: Math.round(calories * 0.25 * mealSize),
      protein: Math.round(protein * 0.25 * mealSize),
      carbs: Math.round(carbs * 0.3 * mealSize),
      fat: Math.round(fat * 0.25 * mealSize),
      description: isLose
        ? "Haferflocken mit Beeren, Magerquark, Eiweißshake"
        : "Haferflocken mit Banane, Nüssen, Milch, Ei",
    },
    {
      time: "10:00",
      name: "Snack",
      calories: Math.round(calories * 0.1 * mealSize),
      protein: Math.round(protein * 0.1 * mealSize),
      carbs: Math.round(carbs * 0.1 * mealSize),
      fat: Math.round(fat * 0.1 * mealSize),
      description: isGain ? "Nüsse, Joghurt, Obst" : "Apfel oder Proteinriegel",
    },
    {
      time: "13:00",
      name: "Mittagessen",
      calories: Math.round(calories * 0.35 * mealSize),
      protein: Math.round(protein * 0.35 * mealSize),
      carbs: Math.round(carbs * 0.35 * mealSize),
      fat: Math.round(fat * 0.35 * mealSize),
      description: isGain
        ? "Hähnchenbrust, Reis, Brokkoli, Olivenöl"
        : "Mageres Fleisch/Fisch, Vollkornreis, Gemüse",
    },
    {
      time: "16:30",
      name: "Post-Workout / Snack",
      calories: Math.round(calories * 0.1 * mealSize),
      protein: Math.round(protein * 0.15 * mealSize),
      carbs: Math.round(carbs * 0.1 * mealSize),
      fat: Math.round(fat * 0.05 * mealSize),
      description: "Eiweißshake mit Banane oder Proteinshake + Reiswaffeln",
    },
    {
      time: "19:30",
      name: "Abendessen",
      calories: Math.round(calories * 0.2 * mealSize),
      protein: Math.round(protein * 0.15 * mealSize),
      carbs: Math.round(carbs * 0.15 * mealSize),
      fat: Math.round(fat * 0.25 * mealSize),
      description: isLose
        ? "Lachs/Garnelen, Salat, Avocado"
        : "Rind/Pute, Süßkartoffeln, grünes Gemüse",
    },
  ];
}

function generateNutritionPlan(profile: Profile): NutritionDay[] {
  const bmr = calcBMR(profile);
  const tdee = calcTDEE(bmr, profile.activity_level);
  const targetCalories = calcTargetCalories(tdee, profile.goal);
  const macros = calcMacros(targetCalories, profile.goal);

  const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const dayMeals = generateDayMeals(macros.calories, macros.protein, macros.carbs, macros.fat, profile.goal);
  const totalCal = dayMeals.reduce((s, m) => s + m.calories, 0);
  const totalProt = dayMeals.reduce((s, m) => s + m.protein, 0);
  const totalCarb = dayMeals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = dayMeals.reduce((s, m) => s + m.fat, 0);

  return days.map((day) => ({
    day,
    total_calories: totalCal,
    total_protein: totalProt,
    total_carbs: totalCarb,
    total_fat: totalFat,
    meals: dayMeals.map((m) => ({ ...m })),
  }));
}

export {
  calcBMR,
  calcTDEE,
  calcTargetCalories,
  calcMacros,
  generateTrainingPlan,
  generateNutritionPlan,
};
