import { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView, Platform, Image, Dimensions,
} from "react-native";

const IS_WEB = Platform.OS === "web";
const SCREEN_W = Dimensions.get("window").width;
const OPENFOOD_URL = "https://world.openfoodfacts.org/api/v2";

// ─── Barcode-Lookup ─────────────────────────────────────────────────
async function lookupBarcode(barcode: string) {
  const res = await fetch(`${OPENFOOD_URL}/product/${barcode}.json`);
  if (!res.ok) throw new Error("Produkt nicht gefunden (" + res.status + ")");
  const data = await res.json();
  if (data.status !== 1) throw new Error("Produkt nicht in der Datenbank");
  return data.product;
}

// ─── Food Search ────────────────────────────────────────────────────
async function searchFood(query: string) {
  const res = await fetch(`${OPENFOOD_URL}/search?search_terms=${encodeURIComponent(query)}&json=true&page_size=20`);
  if (!res.ok) throw new Error("Suche fehlgeschlagen");
  const data = await res.json();
  return data.products || [];
}

interface FoodItem {
  barcode: string;
  name: string;
  brand: string;
  serving_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image: string;
}

interface LogEntry {
  id: string;
  item: FoodItem;
  amount: number; // in grams
  timestamp: number;
}

// ─── Daily Log helpers ──────────────────────────────────────────────
function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem("fitplan_food_logs");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveLogs(logs: LogEntry[]) {
  try { localStorage.setItem("fitplan_food_logs", JSON.stringify(logs)); } catch {}
}

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

function getTodayLogs(logs: LogEntry[]) {
  const today = getTodayISO();
  return logs.filter((l) => l.timestamp && new Date(l.timestamp).toISOString().split("T")[0] === today);
}

// ─── Scanner Component ──────────────────────────────────────────────
export default function ScannerScreen() {
  const [scannerActive, setScannerActive] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState("100");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const quaggaRef = useRef<any>(null);

  useEffect(() => {
    setLogs(loadLogs());
    return () => { stopScanner(); };
  }, []);

  // ── Quagga Scanner ──
  const startScanner = useCallback(async () => {
    setError("");
    setScannerActive(true);

    // Dynamically import Quagga
    try {
      const QuaggaMod = await import("quagga");
      const Quagga = QuaggaMod.default || QuaggaMod;

      if (!IS_WEB) {
        setError("Scanner nur im Browser verfügbar");
        setScannerActive(false);
        return;
      }

      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: document.querySelector("#scanner-container") || undefined,
          constraints: {
            width: { min: 640 },
            height: { min: 480 },
            facingMode: "environment",
            aspectRatio: { min: 1, max: 2 },
          },
        },
        locator: { patchSize: "medium", halfSample: true },
        numOfWorkers: 2,
        decoder: { readers: ["ean_reader", "ean_8_reader", "upc_reader", "code_128_reader"] },
        locate: true,
      }, (err: any) => {
        if (err) {
          console.error("Quagga init error:", err);
          setError("Kamera-Zugriff fehlgeschlagen: " + (err.message || "Permission denied?"));
          setScannerActive(false);
          return;
        }
        Quagga.start();
      });

      Quagga.onDetected((data: any) => {
        if (!data || !data.codeResult) return;
        const code = data.codeResult.code;
        setBarcode(code);
        Quagga.stop();
        setScannerActive(false);
        lookupProduct(code);
      });

      quaggaRef.current = Quagga;
    } catch (e: any) {
      console.error("Failed to load Quagga:", e);
      setError("Scanner konnte nicht geladen werden. Bitte Code manuell eingeben.");
      setScannerActive(false);
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (quaggaRef.current) {
      try { quaggaRef.current.stop(); } catch {}
      quaggaRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScannerActive(false);
  }, []);

  // ── Lookup ──
  const lookupProduct = async (code: string) => {
    setLoading(true);
    setError("");
    setProduct(null);
    try {
      const p = await lookupBarcode(code);
      const item: FoodItem = {
        barcode: code,
        name: p.product_name || "Unbekannt",
        brand: p.brands || "",
        serving_g: p.serving_quantity || 100,
        calories: p.nutriments?.["energy-kcal_100g"] || 0,
        protein: p.nutriments?.proteins_100g || 0,
        carbs: p.nutriments?.carbohydrates_100g || 0,
        fat: p.nutriments?.fat_100g || 0,
        image: p.image_url || p.image_small_url || "",
      };
      setProduct(item);
      setAmount(String(item.serving_g || 100));
    } catch (e: any) {
      setError(e.message || "Fehler beim Abrufen");
    }
    setLoading(false);
  };

  const handleManualLookup = () => {
    const code = manualCode.trim();
    if (!code || code.length < 5) { setError("Bitte gültigen Barcode eingeben (min. 5 Ziffern)"); return; }
    lookupProduct(code);
  };

  // ── Food Search ──
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) { setError("Bitte mindestens 2 Buchstaben"); return; }
    setSearching(true);
    setError("");
    try {
      const results = await searchFood(q);
      if (results.length === 0) {
        setError("Keine Ergebnisse gefunden");
      }
      setSearchResults(results);
    } catch (e: any) {
      setError(e.message || "Suche fehlgeschlagen");
    }
    setSearching(false);
  };

  const selectSearchResult = (p: any) => {
    const item: FoodItem = {
      barcode: p.code || "",
      name: p.product_name || "Unbekannt",
      brand: p.brands || "",
      serving_g: p.serving_quantity || 100,
      calories: p.nutriments?.["energy-kcal_100g"] || 0,
      protein: p.nutriments?.proteins_100g || 0,
      carbs: p.nutriments?.carbohydrates_100g || 0,
      fat: p.nutriments?.fat_100g || 0,
      image: p.image_url || p.image_small_url || "",
    };
    setProduct(item);
    setAmount(String(item.serving_g || 100));
    setSearchResults([]);
    setSearchQuery("");
  };

  // ── Log Food ──
  const handleLogFood = () => {
    if (!product) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Bitte gültige Menge eingeben"); return; }
    const ratio = amt / 100;
    const entry: LogEntry = {
      id: Date.now().toString(),
      item: product,
      amount: amt,
      timestamp: Date.now(),
    };
    const updated = [...logs, entry];
    saveLogs(updated);
    setLogs(updated);
    setProduct(null);
    setBarcode("");
    setManualCode("");
  };

  const deleteLog = (id: string) => {
    const updated = logs.filter((l) => l.id !== id);
    saveLogs(updated);
    setLogs(updated);
  };

  const todayLogs = getTodayLogs(logs);
  const totCals = todayLogs.reduce((s, l) => s + Math.round(l.item.calories * l.amount / 100), 0);
  const totPro = todayLogs.reduce((s, l) => s + Math.round(l.item.protein * l.amount / 100), 0);
  const totCarb = todayLogs.reduce((s, l) => s + Math.round(l.item.carbs * l.amount / 100), 0);
  const totFat = todayLogs.reduce((s, l) => s + Math.round(l.item.fat * l.amount / 100), 0);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      {/* Decorative */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <Text style={styles.title}>📷 Scanner</Text>
      <Text style={styles.sub}>Scan barcode to log food</Text>

      {/* Today's Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNum}>{totCals}</Text>
          <Text style={styles.summaryLbl}>kcal</Text>
        </View>
        <View style={styles.summaryDiv} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNum}>{totPro}g</Text>
          <Text style={styles.summaryLbl}>Protein</Text>
        </View>
        <View style={styles.summaryDiv} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNum}>{totCarb}g</Text>
          <Text style={styles.summaryLbl}>Carbs</Text>
        </View>
        <View style={styles.summaryDiv} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNum}>{totFat}g</Text>
          <Text style={styles.summaryLbl}>Fett</Text>
        </View>
      </View>

      {/* Scanner Area */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {scannerActive ? "🔴 Scanning..." : "📸 Barcode Scanner"}
        </Text>

        {scannerActive && (
          <View id="scanner-container" style={styles.scannerBox}>
            <View style={styles.scannerOverlay}>
              <View style={styles.scanFrame} />
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={stopScanner}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {!scannerActive && !product && (
          <>
            <TouchableOpacity style={styles.scanBtn} onPress={startScanner}>
              <Text style={styles.scanBtnIcon}>📷</Text>
              <Text style={styles.scanBtnText}>Start Scanner</Text>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or enter manually</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.manualRow}>
              <TextInput
                style={styles.input}
                placeholder="Barcode number"
                placeholderTextColor="#555"
                value={manualCode}
                onChangeText={setManualCode}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleManualLookup} disabled={loading}>
                <Text style={styles.searchBtnText}>🔍</Text>
              </TouchableOpacity>
            </View>

            {/* ── Food Search ── */}
            <Text style={styles.orText}>or search food name</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hähnchenbrust, Reis, Apfel"
                placeholderTextColor="#555"
                value={searchQuery}
                onChangeText={(t) => { setSearchQuery(t); setSearchResults([]); }}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>🔍</Text>}
              </TouchableOpacity>
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.slice(0, 10).map((p: any, i: number) => {
                  const kcal = p.nutriments?.["energy-kcal_100g"] || 0;
                  const pname = p.product_name || p.product_name_de || "Unbekannt";
                  return (
                    <TouchableOpacity
                      key={p.code || i}
                      style={styles.searchResultItem}
                      onPress={() => selectSearchResult(p)}
                    >
                      <View style={styles.srLeft}>
                        <Text style={styles.srName} numberOfLines={1}>{pname}</Text>
                        <Text style={styles.srBrand}>{p.brands || ""}</Text>
                      </View>
                      <Text style={styles.srKcal}>{kcal ? `${Math.round(kcal)} kcal` : "?"}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Scanned barcode indicator */}
        {barcode && !product && (
          <Text style={styles.codeText}>Code: {barcode}</Text>
        )}

        {loading && <ActivityIndicator size="large" color="#7c6aff" style={{ marginTop: 20 }} />}

        {error !== "" && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Product Results */}
        {product && (
          <View style={styles.productCard}>
            {product.image ? (
              <Image source={{ uri: product.image }} style={styles.productImg} />
            ) : (
              <View style={styles.productImgPlaceholder}>
                <Text style={{ fontSize: 32 }}>📦</Text>
              </View>
            )}
            <Text style={styles.productName}>{product.name}</Text>
            {product.brand ? <Text style={styles.productBrand}>{product.brand}</Text> : null}

            <View style={styles.nutriRow}>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriVal}>{product.calories}</Text>
                <Text style={styles.nutriLbl}>kcal/100g</Text>
              </View>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriVal}>{product.protein}g</Text>
                <Text style={styles.nutriLbl}>Protein</Text>
              </View>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriVal}>{product.carbs}g</Text>
                <Text style={styles.nutriLbl}>Carbs</Text>
              </View>
              <View style={styles.nutriItem}>
                <Text style={styles.nutriVal}>{product.fat}g</Text>
                <Text style={styles.nutriLbl}>Fett</Text>
              </View>
            </View>

            <Text style={styles.amountLabel}>Menge (g)</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor="#555"
            />

            <View style={styles.logRow}>
              <TouchableOpacity style={styles.logBtn} onPress={handleLogFood}>
                <Text style={styles.logBtnText}>✅ Log Food</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.againBtn} onPress={() => { setProduct(null); setBarcode(""); setError(""); }}>
                <Text style={styles.againBtnText}>Scan again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Today's Log */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Today's Food Log</Text>
        {todayLogs.length === 0 ? (
          <Text style={styles.emptyText}>Noch nichts geloggt heute</Text>
        ) : (
          todayLogs.map((entry) => {
            const r = entry.amount / 100;
            return (
              <View key={entry.id} style={styles.logItem}>
                <View style={styles.logItemLeft}>
                  <Text style={styles.logItemName}>{entry.item.name}</Text>
                  <Text style={styles.logItemDetail}>
                    {entry.amount}g · {Math.round(entry.item.calories * r)} kcal · {Math.round(entry.item.protein * r)}g P
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteLog(entry.id)} style={styles.logDel}>
                  <Text style={styles.logDelText}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => {
            const filtered = logs.filter((l) => new Date(l.timestamp).toISOString().split("T")[0] !== getTodayISO());
            saveLogs(filtered);
            setLogs(filtered);
          }}
        >
          <Text style={styles.clearBtnText}>🗑 Clear today's log</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#070712" },
  content: { paddingBottom: 100, alignItems: "center" },

  glow1: {
    position: "absolute", top: -80, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(124,106,255,0.12)",
  },
  glow2: {
    position: "absolute", top: 200, left: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(106,124,255,0.06)",
  },

  title: { fontSize: 28, fontWeight: "700", color: "#fff", marginTop: 60, marginBottom: 4, letterSpacing: 0.5 },
  sub: { fontSize: 14, color: "#666", marginBottom: 20 },

  // Today Summary
  summaryRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16,
    borderWidth: 1, borderColor: "#1e1e3a",
    marginHorizontal: 20, paddingVertical: 14,
    width: SCREEN_W - 40,
  },
  summaryBox: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 18, fontWeight: "800", color: "#fff" },
  summaryLbl: { fontSize: 10, color: "#666", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
  summaryDiv: { width: 1, height: 24, backgroundColor: "#1e1e3a" },

  // Card
  card: {
    width: SCREEN_W - 40, marginHorizontal: 20, marginTop: 16,
    backgroundColor: "rgba(26,26,50,0.7)", borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: "rgba(42,42,78,0.5)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#fff", marginBottom: 16 },

  // Scanner
  scannerBox: { width: "100%", height: 300, backgroundColor: "#000", borderRadius: 14, overflow: "hidden", position: "relative" },
  scannerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
  scanFrame: {
    width: 200, height: 120, borderRadius: 12,
    borderWidth: 2, borderColor: "#7c6aff",
    shadowColor: "#7c6aff", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 10,
  },
  cancelBtn: { position: "absolute", bottom: 16, alignSelf: "center", backgroundColor: "#ff4444", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  cancelBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  scanBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#7c6aff", borderRadius: 14, padding: 18,
    shadowColor: "#7c6aff", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  scanBtnIcon: { fontSize: 24 },
  scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  orRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: "#2a2a4e" },
  orText: { color: "#555", fontSize: 12, marginHorizontal: 12 },

  manualRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1, backgroundColor: "rgba(15,15,26,0.8)", borderRadius: 14,
    padding: 15, fontSize: 16, color: "#fff",
    borderWidth: 1, borderColor: "#2a2a4e",
  },
  searchBtn: { backgroundColor: "#7c6aff", borderRadius: 14, padding: 15, justifyContent: "center" },
  searchBtnText: { fontSize: 20 },

  codeText: { color: "#888", fontSize: 13, marginTop: 10, textAlign: "center" },
  errorText: { color: "#ff6b6b", fontSize: 13, marginTop: 10, textAlign: "center" },

  // Product Card
  productCard: { marginTop: 16, gap: 12 },
  productImg: { width: 120, height: 120, borderRadius: 14, alignSelf: "center", backgroundColor: "#1a1a3e" },
  productImgPlaceholder: { width: 120, height: 120, borderRadius: 14, alignSelf: "center", backgroundColor: "#1a1a3e", justifyContent: "center", alignItems: "center" },
  productName: { fontSize: 18, fontWeight: "700", color: "#fff", textAlign: "center" },
  productBrand: { fontSize: 13, color: "#888", textAlign: "center" },

  nutriRow: { flexDirection: "row", backgroundColor: "#0f0f1a", borderRadius: 12, padding: 12 },
  nutriItem: { flex: 1, alignItems: "center" },
  nutriVal: { fontSize: 16, fontWeight: "700", color: "#fff" },
  nutriLbl: { fontSize: 10, color: "#666", marginTop: 2 },

  amountLabel: { fontSize: 12, fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: 1 },

  // Search results
  searchResults: { marginTop: 12, gap: 6 },
  searchResultItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#0f0f1a", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#2a2a4e",
  },
  srLeft: { flex: 1, marginRight: 12 },
  srName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  srBrand: { fontSize: 11, color: "#666", marginTop: 2 },
  srKcal: { fontSize: 14, fontWeight: "700", color: "#7c6aff" },
  amountInput: {
    backgroundColor: "rgba(15,15,26,0.8)", borderRadius: 14,
    padding: 14, fontSize: 16, color: "#fff", textAlign: "center",
    borderWidth: 1, borderColor: "#2a2a4e",
  },

  logRow: { flexDirection: "row", gap: 12 },
  logBtn: { flex: 1, backgroundColor: "#6bcb77", borderRadius: 14, padding: 14, alignItems: "center" },
  logBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  againBtn: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, paddingHorizontal: 20, justifyContent: "center" },
  againBtnText: { color: "#888", fontSize: 13, fontWeight: "600" },

  // Log items
  logItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f0f1a", borderRadius: 12, padding: 12, marginBottom: 8 },
  logItemLeft: { flex: 1 },
  logItemName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  logItemDetail: { fontSize: 11, color: "#666", marginTop: 2 },
  logDel: { padding: 8 },
  logDelText: { fontSize: 14, color: "#ff6b6b", fontWeight: "700" },
  emptyText: { color: "#555", fontSize: 13, textAlign: "center", paddingVertical: 16 },

  clearBtn: { marginTop: 12, padding: 12, alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "#2a2a4e" },
  clearBtnText: { color: "#666", fontSize: 12, fontWeight: "600" },
});
