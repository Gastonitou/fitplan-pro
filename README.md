# 💪 FitPlan Pro

Trainings- und Ernährungsplan App mit automatischer Generierung.
iOS + Android via Expo / React Native.

## 🚀 Setup

### 1. Supabase Backend

1. Gehe zu https://supabase.com → Neues Projekt erstellen
2. SQL Editor öffnen → `supabase-migration.sql` einfügen und ausführen
3. Settings → API → Project URL + anon/public key kopieren

### 2. App konfigurieren

```bash
cp .env.example .env
# .env mit deinen Supabase-Daten ausfüllen
```

### 3. Starten

```bash
npm install
npm start
# → Scanne QR-Code mit Expo Go App
# oder:
npm run ios    # Nur mit Mac
npm run android
```

## ✨ Features

- **Account-System** mit Supabase Auth
- **Profil** mit Körperdaten & Zielen (abnehmen/muskelaufbau/erhalten)
- **Automatischer Trainingsplan** — Push/Pull/Beine, Split-Training je nach Ziel
- **Automatischer Ernährungsplan** — Kalorien & Makros basierend auf BMR/TDEE
- **Dashboard** — Übersicht mit heutigen Zielen
- **Dark Mode** — Augenschonendes Design

## 📱 Build

```bash
npx eas build --platform ios
npx eas build --platform android
```

(App Store / Play Store Deployment via EAS Build)
