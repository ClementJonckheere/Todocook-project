import { ChefHat } from "lucide-react";
import type { ReactNode } from "react";

/** Mise en page des écrans d'authentification (même habillage que la page de connexion). */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-500 to-primary-700 flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ChefHat size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">TodoCook</h1>
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 text-gray-900">
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
