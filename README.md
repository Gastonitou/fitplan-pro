# 💪 FitPlan Pro

**Training & Nutrition App** — Automatische Plan-Generierung, Barcode-Scanner für Lebensmittel, Gewicht-Tracking und Übungsvideos.

🌐 **Live Demo:** [https://dist-flax-five-20.vercel.app](https://dist-flax-five-20.vercel.app)

> Built with Expo (React Native) — Web, iOS & Android

---

## ✨ Features

### 🏋️ Automatischer Trainingsplan
- Personalisiert basierend auf **Ziel** (Abnehmen / Muskelaufbau / Erhalten)
- **Push / Pull / Legs Split** oder **Ganzkörper**
- **28 Übungsvideos** — jede Übung hat eine ▶️ YouTube-Demonstration (alle Links geprüft & aktuell)

### 🥗 Automatischer Ernährungsplan
- **Kalorien & Makros** berechnet aus BMR + TDEE (Mifflin-St Jeor)
- **5 Mahlzeiten pro Tag** mit genauen Nährwerten
- Angepasst an dein Ziel (Abnehmen = Defizit, Aufbau = Überschuss)

### 📷 Barcode-Scanner & Food-Log
- **Barcode scannen** per Kamera (Quagga.js)
- **Manuelle Barcode-Eingabe**
- **Suche nach Namen** — z.B. "Hähnchenbrust", "Reis", "Apfel"
- **Open Food Facts API** — Nährwerte von über 3 Mio. Produkten
- **Täglicher Food-Log** mit Kalorien-/Makro-Übersicht
- Alles gespeichert im Browser (localStorage)

### ⚖️ Gewicht-Tracking
- Tägliche Gewichtseingabe
- Automatische **Veränderung** (Start → Aktuell)
- Letzte 7 Tage Übersicht

### 👤 Profil
- Körperdaten (Größe, Gewicht, Alter, Geschlecht)
- Ziel & Aktivitätslevel
- **Supabase Auth** (Login / Registrierung ohne Email-Bestätigung)

### 📱 Mobile-optimiert
- Vertikales Button-Layout für kleine Bildschirme
- Modernes Dark Design mit Glas-Effekten
- Animierte Hintergrund-Glows

---

## 🔧 Tech Stack

| Layer | Technologie |
|-------|-------------|
| **Frontend** | Expo (React Native) + TypeScript |
| **Backend** | Supabase (PostgreSQL, Auth, REST API) |
| **Navigation** | Expo Router |
| **Styling** | React Native StyleSheet |
| **Deployment** | Vercel (Serverless Functions für Auth-Proxy) |
| **Food API** | Open Food Facts (frei, kein API-Key) |
| **Scanner** | Quagga.js (Browser-Barcode-Scanner) |
| **Auth** | Supabase Auth + Custom Proxy (service_role key) |

---

## 🚀 Deployment

### Web (Vercel)

Die App wird automatisch auf Vercel deployed:

```bash
cd fitness-app
npx expo export --platform web
# Nach dem Export: API-Dateien + vercel.json in dist/ kopieren
npx vercel --prod
```

Aktuelle Live-URL: [https://dist-flax-five-20.vercel.app](https://dist-flax-five-20.vercel.app)

---

## 🛠️ Setup

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
- **Site URL:** `https://deine-domain.vercel.app`
- **Redirect URLs:** Gleiche URL
- **Email Confirmation:** ❌ AUS (wird via service_role-Proxy umgangen)

### 4. App lokal starten

```bash
npm install
npx expo start

# Web:
npx expo start --web

# Mit Tunnel (für Handy/Expo Go):
npx expo start --tunnel
```

### 5. Build für Stores

```bash
npx eas build --platform ios
npx eas build --platform android
```

---

## 📁 Projektstruktur

```
fitness-app/
├── app/
│   ├── _layout.tsx              # Root Layout (Auth Check)
│   ├── (auth)/
│   │   ├── _layout.tsx          # Auth Layout (login als Startseite)
│   │   ├── login.tsx            # Login Screen
│   │   └── register.tsx         # Register Screen
│   └── (tabs)/
│       ├── _layout.tsx          # Tab Navigator (4 Tabs)
│       ├── index.tsx            # Dashboard (Übersicht)
│       ├── training.tsx         # Training Plan
│       ├── nutrition.tsx        # Nutrition Plan
│       ├── scanner.tsx          # Barcode Scanner & Food Search 🔥
│       └── profile.tsx          # Profile Settings (redesigned)
├── components/
│   ├── ProfileSetup.tsx         # Initial Setup Screen
│   └── WeightTracker.tsx        # Weight Logging Component
├── lib/
│   ├── AuthContext.tsx           # Auth Provider (React Context)
│   ├── config.ts                # API URL Config
│   ├── supabase.ts              # Supabase Client
│   ├── types.ts                 # TypeScript Types
│   └── planGenerator.ts         # Plan Calculation Engine
├── dist/                        # Web Build Output
│   ├── api/                     # Vercel Serverless Functions
│   │   ├── register.js          # Auth Proxy (Admin API)
│   │   ├── login.js             # Login Proxy
│   │   └── health.js            # Health Check
│   └── vercel.json              # Vercel Routing Config
├── supabase-migration.sql       # Database Schema
├── server.js                    # Local Dev Server (optional)
└── .env.example                 # Environment Template
```

---

## 📊 Plan-Generierung

Die App berechnet automatisch:

1. **BMR** (Basal Metabolic Rate) — Mifflin-St Jeor Formel
   - Mann: `10 × Gewicht(kg) + 6.25 × Größe(cm) − 5 × Alter + 5`
   - Frau: `10 × Gewicht(kg) + 6.25 × Größe(cm) − 5 × Alter − 161`
2. **TDEE** (Total Daily Energy Expenditure) — BMR × Aktivitätsfaktor
3. **Ziel-Kalorien** — Defizit -500 / Überschuss +300 / Erhalt
4. **Makros** — Protein / Carbs / Fett je nach Ziel
5. **Trainingsplan** — Übungen + Sätze + Wiederholungen mit YouTube-Videos
6. **Ernährungsplan** — 5 Mahlzeiten mit Nährwerten

---

## 📝 Datenbank-Schema

```sql
profiles       -- Benutzerprofil (Körperdaten, Ziele, Einstellungen)
workout_logs   -- Trainings-Logs (optional)
weight_logs    -- Gewichtseinträge (täglich)
food_logs      -- Lebensmittel-Logs (optional, für später)
```

Siehe `supabase-migration.sql` für das vollständige Schema mit RLS Policies.

---

## 🔒 Auth-Flow

1. **Registrierung** → POST `/api/register` → Supabase Admin API (service_role) → User sofort bestätigt + Session zurück
2. **Login** → POST `/api/login` → Supabase Auth (anon key) → Session zurück
3. **Logout** → Lokale Session-Daten löschen → Redirect zu Login

Keine Email-Bestätigung nötig! 🎉

---

## 🧪 Getestet

- ✅ Registrierung ohne Email-Bestätigung
- ✅ Login / Logout
- ✅ Profil speichern & laden
- ✅ Automatische Plan-Generierung (3 Ziele × 4 Aktivitätslevel)
- ✅ Alle 28 YouTube-Videos (alle erreichbar)
- ✅ Barcode-Scanner (Quagga.js)
- ✅ Open Food Facts API (Lebensmittelsuche)
- ✅ Mobile Ansicht (Buttons vertikal)
- ✅ Vercel Deployment (Serverless Functions)

---

## 📄 Lizenz

MIT — siehe `LICENSE`

---

## 👤 Autor

**Ghassen Ajili** — [@Gastonitou](https://github.com/Gastonitou)

- 🌐 GitHub: [https://github.com/Gastonitou/fitplan-pro](https://github.com/Gastonitou/fitplan-pro)
- 📧 Email: ghassenlaajili6@gmail.com

---

*Made with ❤️, React Native and way too much coffee ☕*
