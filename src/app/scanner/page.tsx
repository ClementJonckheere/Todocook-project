"use client";

import { useState, useEffect, useRef } from "react";
import { ScanBarcode, Plus, Check, AlertCircle, X, Keyboard, Search, ChevronRight } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  barcode: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string | null;
  brand: string | null;
  category: string | null;
}

interface Ingredient {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string | null;
  unit: string;
}

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "found" | "not_found" | "added" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  // Recherche par nom
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  const startScanner = async () => {
    setScanning(true);
    setStatus("scanning");
    setProduct(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("scanner-container");
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        async (decodedText: string) => {
          await scanner.stop();
          html5QrCodeRef.current = null;
          setScanning(false);
          await lookupBarcode(decodedText);
        },
        () => {} // ignore error
      );
    } catch (err) {
      setScanning(false);
      setStatus("error");
      setErrorMsg("Impossible d'accéder à la caméra. Essayez la saisie manuelle.");
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setScanning(false);
    setStatus("idle");
  };

  const lookupBarcode = async (barcode: string) => {
    setStatus("scanning");
    try {
      const res = await fetch(apiUrl(`/api/scanner?barcode=${barcode}`));
      const data = await res.json();

      if (data.product) {
        setProduct(data.product);
        setStatus("found");
      } else {
        setStatus("not_found");
        setErrorMsg("Produit non trouvé dans la base de données");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Erreur lors de la recherche");
    }
  };

  const addToPantry = async () => {
    if (!product) return;
    try {
      await fetch(apiUrl("/api/pantry"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ingredient_id: product.id,
          quantity: 1,
          unit: "pièce",
        }),
      });
      setStatus("added");
    } catch (err) {
      console.error("Failed to add to pantry:", err);
      setStatus("error");
      setErrorMsg("Erreur lors de l'ajout");
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Recherche d'ingrédients par nom
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await fetch(apiUrl(`/api/ingredients?search=${encodeURIComponent(searchQuery)}`));
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        } catch {
          setSearchResults([]);
        }
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const addIngredientToPantry = async (ingredient: Ingredient) => {
    try {
      await fetch(apiUrl("/api/pantry"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ingredient_id: ingredient.id,
          quantity: 1,
          unit: ingredient.unit || "pièce",
        }),
      });
      setSelectedIngredient(ingredient);
      setStatus("added");
      setSearchQuery("");
      setSearchResults([]);
      setShowSearch(false);
    } catch (err) {
      console.error("Failed to add ingredient:", err);
      setStatus("error");
      setErrorMsg("Erreur lors de l'ajout");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Scanner un produit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scannez un code-barres pour l&apos;ajouter à votre garde-manger
        </p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Scanner area */}
        {scanning && (
          <div className="relative bg-black rounded-xl overflow-hidden">
            <div id="scanner-container" ref={scannerRef} className="w-full" />
            <button
              onClick={stopScanner}
              className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Scan button */}
        {!scanning && status !== "found" && status !== "added" && (
          <div className="space-y-3">
            <button
              onClick={startScanner}
              className="w-full bg-primary-500 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-3 shadow-lg shadow-primary-500/20"
            >
              <ScanBarcode size={24} />
              Scanner un code-barres
            </button>

            <button
              onClick={() => setShowManual(!showManual)}
              className="w-full bg-white text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2 border border-gray-200"
            >
              <Keyboard size={20} />
              Saisir le code manuellement
            </button>

            {showManual && (
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Entrez le code-barres..."
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                />
                <button
                  onClick={() => {
                    if (manualBarcode) lookupBarcode(manualBarcode);
                  }}
                  className="w-full bg-primary-500 text-white py-2 rounded-lg text-sm font-medium"
                >
                  Rechercher
                </button>
              </div>
            )}

            {/* Séparateur */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500">ou</span>
              </div>
            </div>

            {/* Recherche par nom */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Search size={18} className="text-primary-500" />
                <span className="font-medium text-gray-700 text-sm">Rechercher un ingrédient</span>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Tomate, poulet, riz..."
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Résultats de recherche */}
              {showSearch && (searchResults.length > 0 || isSearching) && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-100">
                  {isSearching ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
                      <p className="text-xs text-gray-500 mt-2">Recherche...</p>
                    </div>
                  ) : (
                    searchResults.map((ingredient) => (
                      <button
                        key={ingredient.id}
                        onClick={() => addIngredientToPantry(ingredient)}
                        className="w-full flex items-center justify-between p-3 hover:bg-primary-50 active:bg-primary-100 border-b border-gray-50 last:border-0 transition-colors touch-target"
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm text-gray-900">{ingredient.name}</p>
                          <p className="text-xs text-gray-500">
                            {ingredient.calories} kcal/100g
                            {ingredient.category && ` · ${ingredient.category}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-primary-600 font-medium">Ajouter</span>
                          <Plus size={18} className="text-primary-500" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {showSearch && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="mt-2 p-4 text-center bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Aucun ingrédient trouvé</p>
                  <p className="text-xs text-gray-400 mt-1">Essayez un autre terme</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status messages */}
        {status === "scanning" && !scanning && (
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-3 text-sm text-gray-500">Recherche du produit...</p>
          </div>
        )}

        {status === "not_found" && (
          <div className="bg-red-50 rounded-xl p-6 text-center">
            <AlertCircle size={32} className="mx-auto text-red-500" />
            <p className="mt-2 font-medium text-red-700">Produit non trouvé</p>
            <p className="text-sm text-red-500 mt-1">{errorMsg}</p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-3 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm"
            >
              Réessayer
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-50 rounded-xl p-6 text-center">
            <AlertCircle size={32} className="mx-auto text-red-500" />
            <p className="mt-2 font-medium text-red-700">Erreur</p>
            <p className="text-sm text-red-500 mt-1">{errorMsg}</p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-3 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Product found */}
        {status === "found" && product && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {product.image_url && (
              <div className="h-40 bg-gray-100 flex items-center justify-center">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full object-contain"
                />
              </div>
            )}
            <div className="p-4">
              <h2 className="font-bold text-lg text-gray-900">{product.name}</h2>
              {product.brand && (
                <p className="text-sm text-gray-500">{product.brand}</p>
              )}

              <div className="grid grid-cols-4 gap-2 mt-4">
                <div className="bg-orange-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-orange-600">{Math.round(product.calories)}</p>
                  <p className="text-[10px] text-orange-400">kcal</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-red-600">{Math.round(product.protein)}g</p>
                  <p className="text-[10px] text-red-400">Prot.</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-amber-600">{Math.round(product.carbs)}g</p>
                  <p className="text-[10px] text-amber-400">Gluc.</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-blue-600">{Math.round(product.fat)}g</p>
                  <p className="text-[10px] text-blue-400">Lip.</p>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-2 text-center">Valeurs pour 100g</p>

              <button
                onClick={addToPantry}
                className="w-full mt-4 bg-primary-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Ajouter au garde-manger
              </button>
            </div>
          </div>
        )}

        {/* Added confirmation */}
        {status === "added" && (product || selectedIngredient) && (
          <div className="bg-primary-50 rounded-xl p-6 text-center">
            <Check size={48} className="mx-auto text-primary-500" />
            <p className="mt-2 font-bold text-primary-700">
              {product?.name || selectedIngredient?.name}
            </p>
            <p className="text-sm text-primary-500 mt-1">
              Ajouté à votre garde-manger
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setProduct(null);
                setSelectedIngredient(null);
                setManualBarcode("");
                setSearchQuery("");
              }}
              className="mt-4 bg-primary-500 text-white px-6 py-3 rounded-xl text-sm font-medium min-h-[48px] touch-target"
            >
              Ajouter un autre aliment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
