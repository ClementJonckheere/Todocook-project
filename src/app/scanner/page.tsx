"use client";

import { useState, useEffect, useRef } from "react";
import { ScanBarcode, Plus, Check, AlertCircle, X, Keyboard } from "lucide-react";
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

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "found" | "not_found" | "added" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

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
    await fetch(apiUrl("/api/pantry"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: 1,
        ingredient_id: product.id,
        quantity: 1,
        unit: "pièce",
      }),
    });
    setStatus("added");
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

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
        {status === "added" && product && (
          <div className="bg-primary-50 rounded-xl p-6 text-center">
            <Check size={48} className="mx-auto text-primary-500" />
            <p className="mt-2 font-bold text-primary-700">{product.name}</p>
            <p className="text-sm text-primary-500 mt-1">
              Ajouté à votre garde-manger
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setProduct(null);
                setManualBarcode("");
              }}
              className="mt-4 bg-primary-500 text-white px-6 py-2 rounded-lg text-sm font-medium"
            >
              Scanner un autre produit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
