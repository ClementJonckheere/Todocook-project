"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, UserPlus, ChefHat, Eye, EyeOff, ChevronRight, ChevronLeft, Calculator } from "lucide-react";
import { ACTIVITY_LEVELS, SPORT_TYPES, calculateNutrition, type Gender, type ActivityLevel, type SportType } from "@/lib/nutrition";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [gender, setGender] = useState<Gender | "">("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">("");
  const [sportType, setSportType] = useState<SportType>("aucun");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    let result;
    if (isRegister) {
      result = await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        age: age || undefined,
        weight: weight || undefined,
        height: height || undefined,
        gender: gender || undefined,
        activity_level: activityLevel || undefined,
        sport_type: sportType,
      });
    } else {
      result = await login(email, password);
    }

    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Une erreur est survenue");
    }
    setLoading(false);
  };

  const canProceedToStep2 = firstName && lastName && email && password.length >= 6;
  const canProceedToStep3 = age && weight && height && gender && activityLevel;

  // Calculate preview of nutritional goals
  const nutritionPreview = canProceedToStep3
    ? calculateNutrition({
        age: Number(age),
        weight: Number(weight),
        height: Number(height),
        gender: gender as Gender,
        activityLevel: activityLevel as ActivityLevel,
        sportType: sportType,
      })
    : null;

  const handleNextStep = () => {
    if (registrationStep === 1 && canProceedToStep2) {
      setRegistrationStep(2);
    } else if (registrationStep === 2 && canProceedToStep3) {
      setRegistrationStep(3);
    }
  };

  const handlePrevStep = () => {
    if (registrationStep > 1) {
      setRegistrationStep(registrationStep - 1);
    }
  };

  const resetForm = () => {
    setIsRegister(false);
    setRegistrationStep(1);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setAge("");
    setWeight("");
    setHeight("");
    setGender("");
    setActivityLevel("");
    setSportType("aucun");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-500 to-primary-700 flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ChefHat size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">TodoCook</h1>
        <p className="text-primary-200 text-sm mt-1">Votre assistant cuisine</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 max-h-[75vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {isRegister
            ? registrationStep === 1
              ? "Créer un compte"
              : registrationStep === 2
              ? "Informations personnelles"
              : "Vos objectifs nutritionnels"
            : "Se connecter"}
        </h2>

        {/* Registration steps indicator */}
        {isRegister && (
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-8 h-1 rounded-full transition-colors ${
                  step <= registrationStep ? "bg-primary-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Login Form */}
          {!isRegister && (
            <>
              <div>
                <label className="text-xs text-gray-500 font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1"
                  placeholder="votre@email.fr"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1 pr-10"
                    placeholder="6 caractères minimum"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 mt-0.5 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Registration Step 1: Basic Info */}
          {isRegister && registrationStep === 1 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1"
                  placeholder="votre@email.fr"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1 pr-10"
                    placeholder="6 caractères minimum"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 mt-0.5 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Registration Step 2: Personal Info */}
          {isRegister && registrationStep === 2 && (
            <>
              <p className="text-xs text-gray-500 mb-2">
                Ces informations nous permettent de calculer vos besoins nutritionnels personnalisés.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Âge</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : "")}
                    min={10}
                    max={120}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Poids (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value ? parseFloat(e.target.value) : "")}
                    min={20}
                    max={300}
                    step={0.1}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    placeholder="70"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Taille (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value ? parseFloat(e.target.value) : "")}
                    min={100}
                    max={250}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    placeholder="175"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Genre</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender | "")}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1"
                >
                  <option value="">Sélectionner...</option>
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Niveau d&apos;activité</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel | "")}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1"
                >
                  <option value="">Sélectionner...</option>
                  {ACTIVITY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Sport pratiqué</label>
                <select
                  value={sportType}
                  onChange={(e) => setSportType(e.target.value as SportType)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1"
                >
                  {SPORT_TYPES.map((sport) => (
                    <option key={sport.value} value={sport.value}>
                      {sport.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Registration Step 3: Nutrition Preview */}
          {isRegister && registrationStep === 3 && nutritionPreview && (
            <>
              <div className="bg-primary-50 rounded-xl p-4 mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={18} className="text-primary-600" />
                  <h3 className="font-semibold text-primary-800 text-sm">
                    Vos besoins calculés
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-500">
                      {nutritionPreview.dailyCalories}
                    </p>
                    <p className="text-xs text-gray-500">kcal / jour</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">
                      {nutritionPreview.dailyProtein}g
                    </p>
                    <p className="text-xs text-gray-500">protéines</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-500">
                      {nutritionPreview.dailyCarbs}g
                    </p>
                    <p className="text-xs text-gray-500">glucides</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-500">
                      {nutritionPreview.dailyFat}g
                    </p>
                    <p className="text-xs text-gray-500">lipides</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-primary-100">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Métabolisme de base (BMR)</span>
                    <span className="font-medium">{nutritionPreview.bmr} kcal</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Répartition</span>
                    <span className="font-medium">
                      {nutritionPreview.proteinPercentage}% P / {nutritionPreview.carbsPercentage}% G / {nutritionPreview.fatPercentage}% L
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Ces objectifs sont calculés selon la formule Mifflin-St Jeor et adaptés à votre profil sportif.
                Vous pourrez les modifier dans votre profil.
              </p>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          {!isRegister && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Se connecter
                </>
              )}
            </button>
          )}

          {isRegister && registrationStep === 1 && (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={!canProceedToStep2}
              className="w-full bg-primary-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              Continuer
              <ChevronRight size={18} />
            </button>
          )}

          {isRegister && registrationStep === 2 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-1"
              >
                <ChevronLeft size={18} />
                Retour
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!canProceedToStep3}
                className="flex-1 bg-primary-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-1 hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                Continuer
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {isRegister && registrationStep === 3 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-1"
              >
                <ChevronLeft size={18} />
                Retour
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus size={18} />
                    Créer mon compte
                  </>
                )}
              </button>
            </div>
          )}
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              if (isRegister) {
                resetForm();
              } else {
                setIsRegister(true);
                setError("");
              }
            }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {isRegister
              ? "Déjà un compte ? Se connecter"
              : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}
