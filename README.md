# 💪 FitPlan Pro

**Training & Nutrition App** mit automatischer Plan-Generierung, Gewicht-Tracking und Übungsvideos.

> Built with Expo (React Native) — iOS, Android & Web

---

## Features

### 🔥 Automatischer Trainingsplan
- Personalisiert basierend auf **Ziel** (Abnehmen / Muskelaufbau / Erhalten)
- **Push / Pull / Legs Split** oder **Ganzkörper**
- **Übungsvideos** — jede Übung hat einen ▶️ Play-Button mit YouTube-Demonstration

### 🥗 Automatischer Ernährungsplan
- **Kalorien & Makros** berechnet aus BMR + TDEE
- **5 Mahlzeiten pro Tag** mit genauen Nährwerten
- Angepasst an dein Ziel (Abnehmen = Defizit, Aufbau = Überschuss)

### ⚖️ Gewicht-Tracking
- Tägliche Gewichtseingabe
- Automatische **Veränderung** (Start → Aktuell)
- Letzte 7 Tage Übersicht

### 👤 Profil
- Körperdaten (Größe, Gewicht, Alter, Geschlecht)
- Ziel & Aktivitätslevel
- **Supabase Auth** (Login / Registrierung)

---

## Screenshots

| Dashboard | Training | Ernährung | Gewicht |
|-----------|----------|-----------|---------|
| Übersicht mit Ziel, Makros, Gewicht | Tägliche Pläne mit ▶️ Videos | Mahlzeiten mit Makros | Tracking mit Verlauf |

---

## Tech Stack

| Layer | Technologie |
|-------|-------------|
| **Frontend** | Expo (React Native) + TypeScript |
| **Backend** | Supabase (PostgreSQL, Auth, Storage) |
| **Navigation** | Expo Router |
| **Styling** | React Native StyleSheet |
| **Build** | EAS Build / Expo Web |

---

## Setup

### 1. Supabase Backend

```bash
# 1. Projekt auf https://supabase.com erstellen
# 2. SQL Editor -> supabase-migration.sql einfügen und ausführen
# 3. Settings > API -> Project URL + anon public key kopieren
```

### 2. Konfiguration

```bash
cp .env.example .env
# .env mit deinen Supabase-Daten ausfüllen:
# EXPO_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Auth Einstellungen (Supabase Dashboard)

Supabase Dashboard → **Authentication > Settings**:
- **Site URL:** `https://deine-domain.exp.direct` (oder localhost)
- **Redirect URLs:** Gleiche URL
- **Email Confirmation:** ❌ AUS (für Testzwecke)

### 4. App starten

```bash
npm install
npx expo start

# Web:
npx expo start --web

# Mit Tunnel (für Handy/Expo Go):
npx expo start --tunnel

# iOS (nur Mac):
npx expo start --ios

# Android:
npx expo start --android
```

### 5. Build für Stores

```bash
npx eas build --platform ios
npx eas build --platform android
```

---

## Projektstruktur

```
fitness-app/
├── app/
│   ├── _layout.tsx          # Root Layout (Auth Check)
│   ├── (auth)/
│   │   ├── login.tsx        # Login Screen
│   │   └── register.tsx     # Register Screen
│   └── (tabs)/
│       ├── _layout.tsx      # Tab Navigator
│       ├── index.tsx        # Dashboard
│       ├── training.tsx     # Training Plan
│       ├── nutrition.tsx    # Nutrition Plan
│       └── profile.tsx      # Profile Settings
├── components/
│   ├── ProfileSetup.tsx     # Initial Setup Screen
│   └── WeightTracker.tsx    # Weight Logging Component
├── lib/
│   ├── supabase.ts          # Supabase Client
│   ├── types.ts             # TypeScript Types
│   └── planGenerator.ts     # Plan Calculation Engine
├── supabase-migration.sql   # Database Schema
└── .env.example             # Environment Template
```

---

## Datenbank-Schema

```sql
profiles       -- Benutzerprofil (Körperdaten, Ziele)
workout_logs   -- Trainings-Logs (optionales Tracking)
weight_logs    -- Gewichtseinträge (täglich)
```

Siehe `supabase-migration.sql` für das vollständige Schema mit RLS Policies.

---

## Plan-Generierung

Die App berechnet automatisch:

1. **BMR** (Basal Metabolic Rate) — Mifflin-St Jeor Formel
2. **TDEE** (Total Daily Energy Expenditure) — basierend auf Aktivitätslevel
3. **Ziel-Kalorien** — Defizit -500 / Überschuss +300 / Erhalt
4. **Makros** — Protein / Carbs / Fett je nach Ziel
5. **Trainingsplan** — Übungen + Sätze + Wiederholungen
6. **Ernährungsplan** — 5 Mahlzeiten mit Nährwerten

---

## Lizenz

MIT — siehe `LICENSE`

---

## Autor

**Ghassen Ajili** — [@Gastonitou](https://github.com/Gastonitou)

---

*Made with ❤️ and a lot of protein shakes*
