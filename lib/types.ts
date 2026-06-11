export type Goal = "abnehmen" | "muskelaufbau" | "erhalten";
export type ActivityLevel = "wenig" | "moderat" | "aktiv" | "sehr_aktiv";
export type Gender = "männlich" | "weiblich";

export interface Profile {
  id: string;
  email: string;
  name: string;
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: Gender;
  goal: Goal;
  activity_level: ActivityLevel;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight?: number;
  notes?: string;
  videoId?: string;
}

export interface TrainingDay {
  day: string;
  focus: string;
  exercises: Exercise[];
}

export interface Meal {
  time: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
}

export interface NutritionDay {
  day: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meals: Meal[];
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  date: string;
  weight: number;
  created_at: string;
}
