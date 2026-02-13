import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/theme/colors";

// HARDCODED API URL - change this to your computer's local IP
const API_URL = "http://192.168.86.35:3000";

interface Product {
  name: string;
  brand: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  image_url: string;
  barcode: string;
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const scannedRef = useRef(false);

  const lookupBarcode = async (barcode: string) => {
    setLoading(true);
    setProduct(null);
    setAdded(false);
    const url = `${API_URL}/api/scanner?barcode=${barcode}`;
    console.log("Fetching URL:", url);
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log("Response:", text.substring(0, 200));

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error("JSON parse error, response was:", text.substring(0, 500));
        Alert.alert("Erreur", `Réponse invalide du serveur. URL: ${url}`);
        setLoading(false);
        return;
      }

      if (data.error || !data.product) {
        Alert.alert("Produit non trouvé", "Ce code-barres n'a pas été reconnu.");
      } else {
        setProduct(data.product);
      }
    } catch (err) {
      console.error("Scanner error:", err);
      Alert.alert("Erreur", `Impossible de contacter: ${url}`);
    }
    setLoading(false);
  };

  const addToPantry = async () => {
    if (!product) return;
    try {
      const res = await fetch(`${API_URL}/api/pantry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          ingredient_id: product.id,
          quantity: 1,
          unit: "unité",
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Pantry error:", text);
        throw new Error("Failed to add");
      }
      setAdded(true);
    } catch (err) {
      console.error("Add to pantry error:", err);
      Alert.alert("Erreur", "Impossible d'ajouter au garde-manger.");
    }
  };

  const handleBarcodeScan = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanning(false);
    lookupBarcode(data);
    setTimeout(() => { scannedRef.current = false; }, 2000);
  };

  if (!permission) {
    return <View style={s.container} />;
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Scanner</Text>
          <Text style={s.subtitle}>Scannez un produit pour l'ajouter</Text>
        </View>

        {/* Camera / Scanner */}
        {scanning ? (
          <View style={s.cameraWrapper}>
            <CameraView
              style={s.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
              onBarcodeScanned={handleBarcodeScan}
            />
            <View style={s.cameraOverlay}>
              <View style={s.scanFrame} />
            </View>
            <TouchableOpacity style={s.closeCameraBtn} onPress={() => setScanning(false)}>
              <Ionicons name="close" size={28} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.actionsCard}>
            <TouchableOpacity
              style={s.scanBtn}
              onPress={() => {
                if (!permission.granted) {
                  requestPermission();
                } else {
                  setScanning(true);
                }
              }}
            >
              <Ionicons name="camera-outline" size={28} color={colors.white} />
              <Text style={s.scanBtnText}>Scanner un code-barres</Text>
            </TouchableOpacity>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>ou</Text>
              <View style={s.dividerLine} />
            </View>

            <View style={s.manualRow}>
              <TextInput
                style={s.manualInput}
                placeholder="Entrer un code-barres"
                value={manualBarcode}
                onChangeText={setManualBarcode}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={s.manualBtn}
                onPress={() => manualBarcode && lookupBarcode(manualBarcode)}
              >
                <Ionicons name="search" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={s.loadingText}>Recherche du produit...</Text>
          </View>
        )}

        {/* Product result */}
        {product && (
          <View style={s.productCard}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={s.productImage} resizeMode="contain" />
            ) : null}
            <Text style={s.productName}>{product.name}</Text>
            {product.brand ? <Text style={s.productBrand}>{product.brand}</Text> : null}

            <View style={s.nutritionGrid}>
              <View style={s.nutritionItem}>
                <Text style={s.nutritionValue}>{product.calories}</Text>
                <Text style={s.nutritionLabel}>kcal</Text>
              </View>
              <View style={s.nutritionItem}>
                <Text style={s.nutritionValue}>{product.protein}g</Text>
                <Text style={s.nutritionLabel}>Protéines</Text>
              </View>
              <View style={s.nutritionItem}>
                <Text style={s.nutritionValue}>{product.carbs}g</Text>
                <Text style={s.nutritionLabel}>Glucides</Text>
              </View>
              <View style={s.nutritionItem}>
                <Text style={s.nutritionValue}>{product.fat}g</Text>
                <Text style={s.nutritionLabel}>Lipides</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[s.addBtn, added && s.addBtnDone]}
              onPress={addToPantry}
              disabled={added}
            >
              <Ionicons name={added ? "checkmark-circle" : "add-circle"} size={22} color={colors.white} />
              <Text style={s.addBtnText}>
                {added ? "Ajouté au garde-manger" : "Ajouter au garde-manger"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "bold", color: colors.gray[900] },
  subtitle: { fontSize: 14, color: colors.gray[500], marginTop: 2 },
  cameraWrapper: { marginHorizontal: 20, marginTop: 16, borderRadius: 20, overflow: "hidden", height: 320, position: "relative" },
  camera: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  scanFrame: { width: 220, height: 220, borderWidth: 2, borderColor: colors.primary[400], borderRadius: 16 },
  closeCameraBtn: { position: "absolute", top: 12, right: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  actionsCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.white, borderRadius: 20, padding: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  scanBtn: { backgroundColor: colors.primary[500], borderRadius: 16, paddingVertical: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  scanBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.gray[200] },
  dividerText: { marginHorizontal: 12, color: colors.gray[400], fontSize: 13 },
  manualRow: { flexDirection: "row", gap: 10 },
  manualInput: { flex: 1, backgroundColor: colors.gray[50], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, borderWidth: 1, borderColor: colors.gray[200] },
  manualBtn: { width: 50, backgroundColor: colors.primary[500], borderRadius: 12, justifyContent: "center", alignItems: "center" },
  loadingCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.white, borderRadius: 20, padding: 32, alignItems: "center" },
  loadingText: { fontSize: 14, color: colors.gray[500], marginTop: 12 },
  productCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.white, borderRadius: 20, padding: 20, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 24 },
  productImage: { width: 120, height: 120, borderRadius: 12, marginBottom: 12 },
  productName: { fontSize: 18, fontWeight: "bold", color: colors.gray[900], textAlign: "center" },
  productBrand: { fontSize: 13, color: colors.gray[500], marginTop: 4 },
  nutritionGrid: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.gray[100] },
  nutritionItem: { alignItems: "center" },
  nutritionValue: { fontSize: 16, fontWeight: "bold", color: colors.gray[900] },
  nutritionLabel: { fontSize: 10, color: colors.gray[500], marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary[500], borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, marginTop: 16, width: "100%", justifyContent: "center" },
  addBtnDone: { backgroundColor: colors.primary[700] },
  addBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
});
