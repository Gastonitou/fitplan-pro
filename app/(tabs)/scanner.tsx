import { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Platform, Image as RNImage, Dimensions,
} from "react-native";

const IS_WEB = Platform.OS === "web";
const SCREEN_W = Dimensions.get("window").width;
const OPENFOOD_URL = "https://world.openfoodfacts.org/api/v2";

// ─── API ────────────────────────────────────────────────────────────
async function lookupBarcode(barcode: string) {
  const res = await fetch(`${OPENFOOD_URL}/product/${barcode}.json`);
  if (!res.ok) throw new Error("Produkt nicht gefunden");
  const data = await res.json();
  if (data.status !== 1) throw new Error("Nicht in der Datenbank");
  return data.product;
}
async function searchFood(query: string) {
  const res = await fetch(`${OPENFOOD_URL}/search?search_terms=${encodeURIComponent(query)}&json=true&page_size=20`);
  if (!res.ok) throw new Error("Suche fehlgeschlagen");
  const data = await res.json();
  return data.products || [];
}

interface FoodItem {
  barcode: string; name: string; brand: string;
  serving_g: number; calories: number;
  protein: number; carbs: number; fat: number; image: string;
}

function itemFromProduct(p: any): FoodItem {
  return {
    barcode: p.code || "",
    name: p.product_name || p.product_name_de || "Unbekannt",
    brand: p.brands || "",
    serving_g: p.serving_quantity || 100,
    calories: p.nutriments?.["energy-kcal_100g"] || 0,
    protein: p.nutriments?.proteins_100g || 0,
    carbs: p.nutriments?.carbohydrates_100g || 0,
    fat: p.nutriments?.fat_100g || 0,
    image: p.image_url || p.image_small_url || "",
  };
}

interface LogEntry { id: string; item: FoodItem; amount: number; timestamp: number; }

function loadLogs(): LogEntry[] {
  try { const r = localStorage.getItem("fitplan_food_logs"); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveLogs(logs: LogEntry[]) {
  try { localStorage.setItem("fitplan_food_logs", JSON.stringify(logs)); } catch {}
}
function getTodayLogs(logs: LogEntry[]) {
  const today = new Date().toISOString().split("T")[0];
  return logs.filter((l) => new Date(l.timestamp).toISOString().split("T")[0] === today);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
    reader.readAsDataURL(file);
  });
}

function resizeDataUrl(src: string, maxEdge = 900): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > h && w > maxEdge) {
        h = Math.round((h * maxEdge) / w);
        w = maxEdge;
      } else if (h > w && h > maxEdge) {
        w = Math.round((w * maxEdge) / h);
        h = maxEdge;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

// ─── Try decode barcode from image (BarcodeDetector API) ────────────
async function tryDecodeBarcode(img: HTMLImageElement): Promise<string | null> {
  if (!("BarcodeDetector" in window)) return null;
  try {
    const detector = new (window as any).BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
    });
    const barcodes = await detector.detect(img);
    if (barcodes.length > 0) return barcodes[0].rawValue;
  } catch {}
  return null;
}

async function tryDecodeBarcodeQuagga(dataUrl: string): Promise<string | null> {
  try {
    const mod = await import("quagga");
    const Quagga: any = (mod as any)?.default || mod;
    if (!Quagga || typeof Quagga.decodeSingle !== "function") return null;

    const resized = await resizeDataUrl(dataUrl, 900);
    return await new Promise((resolve) => {
      let finished = false;
      const done = (value: string | null) => {
        if (!finished) {
          finished = true;
          resolve(value);
        }
      };

      try {
        Quagga.decodeSingle(
          {
            decoder: { readers: ["ean_reader", "ean_8_reader", "upc_reader", "code_128_reader"] },
            locate: true,
            src: resized,
          },
          (result: any) => done(result?.codeResult?.code || null)
        );
      } catch {
        done(null);
      }

      setTimeout(() => done(null), 8000);
    });
  } catch {
    return null;
  }
}

async function decodeBarcodeFromFile(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const detected = await new Promise<string | null>((resolve) => {
      const img = new window.Image();
      img.onload = async () => resolve(await tryDecodeBarcode(img));
      img.onerror = () => resolve(null);
      img.src = objectUrl;
    });
    if (detected) return detected;

    const dataUrl = await fileToDataUrl(file);
    if (!dataUrl) return null;
    return await tryDecodeBarcodeQuagga(dataUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// ─── Google Lens-style AI food recognition via Gemini Vision ────────
async function recognizeFoodWithGemini(dataUrl: string, apiKey: string): Promise<string | null> {
  try {
    const resized = await resizeDataUrl(dataUrl, 512);
    const base64 = resized.split(",")[1];
    const mimeType = resized.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: "Identifiziere das Lebensmittel auf diesem Foto. Antworte NUR mit dem deutschen Namen, möglichst kurz (1-3 Wörter). Beispiele: 'Hühnerei', 'Apfel', 'Hähnchenbrust', 'Banane', 'Vollmilch'. Wenn kein Lebensmittel erkennbar ist, antworte genau mit dem Wort: unbekannt" }
            ]
          }],
          generationConfig: { maxOutputTokens: 30, temperature: 0.1 }
        })
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text = (json?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!text || text.toLowerCase() === "unbekannt") return null;
    return text;
  } catch {
    return null;
  }
}

function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.display = "none";

    let resolved = false;
    const finish = (file: File | null) => {
      if (!resolved) { resolved = true; resolve(file); }
      if (input.parentNode) document.body.removeChild(input);
    };

    input.onchange = (e: any) => finish((e.target as HTMLInputElement).files?.[0] || null);
    window.addEventListener("focus", function onFocus() {
      setTimeout(() => finish(null), 400);
      window.removeEventListener("focus", onFocus);
    }, { once: true });

    document.body.appendChild(input);
    input.click();
  });
}

// ─── Page Component ─────────────────────────────────────────────────
export default function ScannerScreen() {
  const [mode, setMode] = useState<"menu" | "scanning" | "result">("menu");
  const [manualCode, setManualCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState("100");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState("");
  const [scanStatus, setScanStatus] = useState("");

  useEffect(() => { setLogs(loadLogs()); }, []);

  // ── Photo-based scanner: barcode → AI food recognition fallback ──
  const takePhoto = useCallback(async () => {
    setError("");
    setMode("scanning");
    setScanStatus("📷 Foto wird geöffnet...");

    if (!IS_WEB) {
      setError("Foto-Scan ist aktuell nur in der Web-App verfügbar.");
      setMode("menu"); setScanStatus("");
      return;
    }

    try {
      const file = await pickImageFile();
      if (!file) { setMode("menu"); setScanStatus(""); return; }

      // Step 1: Try barcode
      setScanStatus("🔍 Suche Barcode...");
      const barcode = await decodeBarcodeFromFile(file);
      if (barcode) {
        setScanStatus("");
        setMode("result");
        lookupProduct(barcode);
        return;
      }

      // Step 2: AI food recognition (Google Lens style)
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
      if (!apiKey) {
        setError("Kein Barcode erkannt. Tipp: Gemini API-Key in den Einstellungen hinterlegen für KI-Erkennung.");
        setMode("menu"); setScanStatus("");
        return;
      }

      setScanStatus("🤖 KI erkennt Lebensmittel...");
      const dataUrl = await fileToDataUrl(file);
      const foodName = await recognizeFoodWithGemini(dataUrl, apiKey);

      if (!foodName) {
        setError("Kein Lebensmittel erkannt. Bitte manuell eingeben oder nach Namen suchen.");
        setMode("menu"); setScanStatus("");
        return;
      }

      // Step 3: Search OpenFoodFacts with recognized name
      setScanStatus(`✅ Erkannt: ${foodName} – suche in Datenbank...`);
      setSearchQuery(foodName);
      try {
        const results = await searchFood(foodName);
        setSearchResults(results);
        if (results.length === 0) setError(`"${foodName}" nicht gefunden. Direkt suchen oder manuell eingeben.`);
      } catch {
        setError(`"${foodName}" erkannt, aber Suche fehlgeschlagen.`);
      }
      setMode("menu");
      setScanStatus("");

    } catch {
      setError("Foto konnte nicht analysiert werden.");
      setMode("menu"); setScanStatus("");
    }
  }, []);

  // ── Live camera BarcodeDetector (desktop Chrome/Edge) ──
  const startLiveScan = useCallback(async () => {
    setError("");
    setMode("scanning");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("autoplay", "true");
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      video.muted = true;

      const container = document.querySelector("#camera-container");
      if (!container) { setError("Kamera-Container nicht gefunden"); stream.getTracks().forEach(t => t.stop()); setMode("menu"); return; }

      container.innerHTML = "";
      container.appendChild(video);
      await video.play();

      if (!("BarcodeDetector" in window)) {
        setError("BarcodeDetector nicht unterstützt. Foto-Methode wird empfohlen.");
        stream.getTracks().forEach(t => t.stop());
        container.innerHTML = "";
        setMode("menu");
        return;
      }

      const detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
      });

      const scanInterval = setInterval(async () => {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            clearInterval(scanInterval);
            stream.getTracks().forEach(t => t.stop());
            container.innerHTML = "";
            setMode("result");
            lookupProduct(barcodes[0].rawValue);
          }
        } catch {}
      }, 800);

      // Store cleanup
      (window as any).__scanCleanup = () => { clearInterval(scanInterval); stream.getTracks().forEach(t => t.stop()); container.innerHTML = ""; };
    } catch {
      setError("Kamera nicht verfügbar. Bitte Foto-Methode oder manuelle Eingabe verwenden.");
      setMode("menu");
    }
  }, []);

  const stopLiveScan = useCallback(() => {
    if ((window as any).__scanCleanup) { (window as any).__scanCleanup(); (window as any).__scanCleanup = null; }
    const container = document.querySelector("#camera-container");
    if (container) container.innerHTML = "";
    setMode("menu");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const container = document.querySelector("#camera-container");
      if (container) container.innerHTML = "";
      if ((window as any).__scanCleanup) { (window as any).__scanCleanup(); (window as any).__scanCleanup = null; }
    };
  }, []);

  // ── Lookup ──
  const lookupProduct = async (code: string) => {
    setLoading(true); setError("");
    try {
      const p = await lookupBarcode(code);
      setProduct(itemFromProduct(p));
      setAmount(String(p.serving_quantity || 100));
    } catch (e: any) {
      setError(e.message || "Fehler beim Abrufen");
      setMode("menu");
    }
    setLoading(false);
  };

  const handleManualLookup = () => {
    const c = manualCode.trim();
    if (!c || c.length < 5) { setError("Bitte gültigen Code (min. 5 Ziffern)"); return; }
    setMode("result");
    lookupProduct(c);
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) { setError("Mindestens 2 Buchstaben"); return; }
    setSearching(true); setError("");
    try {
      const results = await searchFood(q);
      if (results.length === 0) setError("Keine Ergebnisse");
      setSearchResults(results);
    } catch (e: any) { setError(e.message); }
    setSearching(false);
  };

  const selectResult = (p: any) => {
    setProduct(itemFromProduct(p));
    setAmount(String(p.serving_quantity || 100));
    setMode("result");
    setSearchResults([]);
    setSearchQuery("");
  };

  // ── Log ──
  const handleLogFood = () => {
    if (!product) return;
    const a = parseFloat(amount);
    if (isNaN(a) || a <= 0) { setError("Bitte gültige Menge"); return; }
    const entry: LogEntry = { id: Date.now().toString(), item: product, amount: a, timestamp: Date.now() };
    const updated = [...logs, entry];
    saveLogs(updated); setLogs(updated);
    setProduct(null); setMode("menu");
  };

  const deleteLog = (id: string) => {
    const updated = logs.filter((l) => l.id !== id);
    saveLogs(updated); setLogs(updated);
  };

  const clearToday = () => {
    const today = new Date().toISOString().split("T")[0];
    const filtered = logs.filter((l) => new Date(l.timestamp).toISOString().split("T")[0] !== today);
    saveLogs(filtered); setLogs(filtered);
  };

  const todayLogs = getTodayLogs(logs);
  const totals = todayLogs.reduce(
    (s, l) => {
      const r = l.amount / 100;
      return {
        cals: s.cals + Math.round(l.item.calories * r),
        pro: s.pro + Math.round(l.item.protein * r),
        carb: s.carb + Math.round(l.item.carbs * r),
        fat: s.fat + Math.round(l.item.fat * r),
      };
    },
    { cals: 0, pro: 0, carb: 0, fat: 0 }
  );

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <View style={styles.glow1} /><View style={styles.glow2} />
      <Text style={styles.title}>📷 Scanner</Text>
      <Text style={styles.sub}>Erfasst alles was du isst</Text>

      {/* Today's Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.sumBox}><Text style={styles.sumNum}>{totals.cals}</Text><Text style={styles.sumLbl}>kcal</Text></View>
        <View style={styles.sumDiv} />
        <View style={styles.sumBox}><Text style={styles.sumNum}>{totals.pro}g</Text><Text style={styles.sumLbl}>Protein</Text></View>
        <View style={styles.sumDiv} />
        <View style={styles.sumBox}><Text style={styles.sumNum}>{totals.carb}g</Text><Text style={styles.sumLbl}>Carbs</Text></View>
        <View style={styles.sumDiv} />
        <View style={styles.sumBox}><Text style={styles.sumNum}>{totals.fat}g</Text><Text style={styles.sumLbl}>Fett</Text></View>
      </View>

      {/* Scanner / Live Camera mode */}
      {mode === "scanning" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {scanStatus || "🔴 Scanne..."}
          </Text>
          <View id="camera-container" style={styles.camWrap} />
          {scanStatus ? (
            <View style={styles.aiStatusWrap}>
              <ActivityIndicator color="#7c6aff" size="large" />
              <Text style={styles.aiStatusText}>{scanStatus}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.cancelBtn} onPress={stopLiveScan}>
              <Text style={styles.cancelBtnText}>Abbrechen</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {mode === "menu" && (
        <>
          {/* Photo Scanner Button (PRIMARY - works on all phones) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Foto scannen</Text>
            <Text style={styles.cardSub}>Barcode oder Lebensmittel fotografieren – KI erkennt es automatisch.</Text>
            <TouchableOpacity style={styles.scanBtn} onPress={takePhoto}>
              <Text style={styles.scanBtnIcon}>📷</Text>
              <Text style={styles.scanBtnText}>Foto machen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.liveBtn} onPress={startLiveScan}>
              <Text style={styles.liveBtnIcon}>🎥</Text>
              <Text style={styles.liveBtnText}>Live-Kamera (Chrome/Edge)</Text>
            </TouchableOpacity>
          </View>

          {/* Manual Entry */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⌨️ Manuell eingeben</Text>
            <View style={styles.manualRow}>
              <TextInput style={styles.input} placeholder="Barcode-Nummer" placeholderTextColor="#555"
                value={manualCode} onChangeText={setManualCode} keyboardType="numeric" />
              <TouchableOpacity style={styles.searchBtn} onPress={handleManualLookup} disabled={loading}>
                <Text style={styles.searchBtnText}>🔍</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔎 Nach Namen suchen</Text>
            <View style={styles.manualRow}>
              <TextInput style={styles.input} placeholder="z.B. Hähnchen, Reis, Apfel"
                placeholderTextColor="#555" value={searchQuery}
                onChangeText={(t) => { setSearchQuery(t); setSearchResults([]); }}
                onSubmitEditing={handleSearch} returnKeyType="search" />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>🔍</Text>}
              </TouchableOpacity>
            </View>

            {searchResults.length > 0 && (
              <View style={styles.srWrap}>
                {searchResults.slice(0, 10).map((p: any, i: number) => {
                  const kcal = p.nutriments?.["energy-kcal_100g"] || 0;
                  const pname = p.product_name || p.product_name_de || "Unbekannt";
                  return (
                    <TouchableOpacity key={p.code || i} style={styles.srItem} onPress={() => selectResult(p)}>
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
          </View>

          {error !== "" && <Text style={styles.error}>{error}</Text>}
        </>
      )}

      {mode === "result" && loading && <ActivityIndicator size="large" color="#7c6aff" style={{ marginTop: 20 }} />}

      {mode === "result" && product && !loading && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Gefunden</Text>
          {product.image ? (
            <RNImage source={{ uri: product.image }} style={styles.prodImg} />
          ) : (
            <View style={styles.prodImgPlaceholder}><Text style={{ fontSize: 32 }}>📦</Text></View>
          )}
          <Text style={styles.prodName}>{product.name}</Text>
          {product.brand ? <Text style={styles.prodBrand}>{product.brand}</Text> : null}

          <View style={styles.nutriRow}>
            <View style={styles.nuItem}><Text style={styles.nuVal}>{product.calories}</Text><Text style={styles.nuLbl}>kcal/100g</Text></View>
            <View style={styles.nuItem}><Text style={styles.nuVal}>{product.protein}g</Text><Text style={styles.nuLbl}>Protein</Text></View>
            <View style={styles.nuItem}><Text style={styles.nuVal}>{product.carbs}g</Text><Text style={styles.nuLbl}>Carbs</Text></View>
            <View style={styles.nuItem}><Text style={styles.nuVal}>{product.fat}g</Text><Text style={styles.nuLbl}>Fett</Text></View>
          </View>

          <Text style={styles.amtLabel}>Menge (g)</Text>
          <TextInput style={styles.amtInput} value={amount} onChangeText={setAmount}
            keyboardType="numeric" placeholderTextColor="#555" />

          <View style={styles.logBtnRow}>
            <TouchableOpacity style={styles.logBtn} onPress={handleLogFood}>
              <Text style={styles.logBtnText}>✅ Loggen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => { setProduct(null); setMode("menu"); setError(""); }}>
              <Text style={styles.backBtnText}>Zurück</Text>
            </TouchableOpacity>
          </View>
          {error !== "" && <Text style={styles.error}>{error}</Text>}
        </View>
      )}

      {/* Today's Log */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Heute gegessen</Text>
        {todayLogs.length === 0 ? (
          <Text style={styles.empty}>Noch nichts geloggt</Text>
        ) : (
          todayLogs.map((entry) => {
            const r = entry.amount / 100;
            return (
              <View key={entry.id} style={styles.logItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logName}>{entry.item.name}</Text>
                  <Text style={styles.logDet}>
                    {entry.amount}g | {Math.round(entry.item.calories * r)} kcal | {Math.round(entry.item.protein * r)}g P
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteLog(entry.id)} style={styles.logDel}>
                  <Text style={styles.logDelText}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
        {todayLogs.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearToday}>
            <Text style={styles.clearBtnText}>🗑 Heute löschen</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#070712" },
  content: { paddingBottom: 100, alignItems: "center" },
  glow1: { position: "absolute", top: -80, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(124,106,255,0.12)" },
  glow2: { position: "absolute", top: 200, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(106,124,255,0.06)" },
  title: { fontSize: 28, fontWeight: "700", color: "#fff", marginTop: 60, marginBottom: 4, letterSpacing: 0.5 },
  sub: { fontSize: 14, color: "#666", marginBottom: 16 },

  summaryRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: "#1e1e3a", marginHorizontal: 20, paddingVertical: 14, width: SCREEN_W - 40 },
  sumBox: { flex: 1, alignItems: "center" },
  sumNum: { fontSize: 18, fontWeight: "800", color: "#fff" },
  sumLbl: { fontSize: 10, color: "#666", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
  sumDiv: { width: 1, height: 24, backgroundColor: "#1e1e3a" },

  card: { width: SCREEN_W - 40, marginHorizontal: 20, marginTop: 14, backgroundColor: "rgba(26,26,50,0.7)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(42,42,78,0.5)" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 14 },
  cardSub: { fontSize: 12, color: "#666", marginBottom: 12, marginTop: -10, lineHeight: 16 },

  // Camera
  camWrap: { width: "100%", height: 250, backgroundColor: "#000", borderRadius: 14, overflow: "hidden" },
  cancelBtn: { marginTop: 12, backgroundColor: "#ff4444", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  aiStatusWrap: { marginTop: 20, alignItems: "center", gap: 12 },
  aiStatusText: { color: "#aaa", fontSize: 14, textAlign: "center" },

  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#7c6aff", borderRadius: 14, padding: 16 },
  scanBtnIcon: { fontSize: 24 },
  scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  liveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(124,106,255,0.15)", borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: "rgba(124,106,255,0.3)" },
  liveBtnIcon: { fontSize: 20 },
  liveBtnText: { color: "#7c6aff", fontSize: 14, fontWeight: "600" },

  manualRow: { flexDirection: "row", gap: 10 },
  input: { flex: 1, backgroundColor: "rgba(15,15,26,0.8)", borderRadius: 14, padding: 14, fontSize: 16, color: "#fff", borderWidth: 1, borderColor: "#2a2a4e" },
  searchBtn: { backgroundColor: "#7c6aff", borderRadius: 14, padding: 14, justifyContent: "center" },
  searchBtnText: { fontSize: 20 },

  // Search results
  srWrap: { marginTop: 12, gap: 6 },
  srItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0f0f1a", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#2a2a4e" },
  srLeft: { flex: 1, marginRight: 12 },
  srName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  srBrand: { fontSize: 11, color: "#666", marginTop: 2 },
  srKcal: { fontSize: 14, fontWeight: "700", color: "#7c6aff" },

  prodImg: { width: 120, height: 120, borderRadius: 14, alignSelf: "center", backgroundColor: "#1a1a3e" },
  prodImgPlaceholder: { width: 120, height: 120, borderRadius: 14, alignSelf: "center", backgroundColor: "#1a1a3e", justifyContent: "center", alignItems: "center" },
  prodName: { fontSize: 18, fontWeight: "700", color: "#fff", textAlign: "center", marginTop: 8 },
  prodBrand: { fontSize: 13, color: "#888", textAlign: "center" },

  nutriRow: { flexDirection: "row", backgroundColor: "#0f0f1a", borderRadius: 12, padding: 10, marginTop: 12 },
  nuItem: { flex: 1, alignItems: "center" },
  nuVal: { fontSize: 15, fontWeight: "700", color: "#fff" },
  nuLbl: { fontSize: 9, color: "#666", marginTop: 2 },

  amtLabel: { fontSize: 12, fontWeight: "600", color: "#888", marginTop: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  amtInput: { backgroundColor: "rgba(15,15,26,0.8)", borderRadius: 14, padding: 14, fontSize: 16, color: "#fff", textAlign: "center", borderWidth: 1, borderColor: "#2a2a4e" },
  logBtnRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  logBtn: { flex: 1, backgroundColor: "#6bcb77", borderRadius: 14, padding: 14, alignItems: "center" },
  logBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  backBtn: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingHorizontal: 20, justifyContent: "center" },
  backBtnText: { color: "#888", fontSize: 14, fontWeight: "600" },

  error: { color: "#ff6b6b", fontSize: 13, textAlign: "center", marginTop: 10 },

  logItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f0f1a", borderRadius: 12, padding: 12, marginBottom: 8 },
  logName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  logDet: { fontSize: 11, color: "#666", marginTop: 2 },
  logDel: { padding: 8 },
  logDelText: { fontSize: 14, color: "#ff6b6b", fontWeight: "700" },
  empty: { color: "#555", fontSize: 13, textAlign: "center", paddingVertical: 16 },
  clearBtn: { marginTop: 10, padding: 12, alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "#2a2a4e" },
  clearBtnText: { color: "#666", fontSize: 12, fontWeight: "600" },
});
