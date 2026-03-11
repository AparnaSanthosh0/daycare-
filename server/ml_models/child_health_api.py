#!/usr/bin/env python3
"""
Unified Child Health API wrapper.
Combines:
- Malnutrition prediction using a trained model (if present)
- Basic child growth analysis
- Meal recommendation using existing meal decision tree model

Input is passed as JSON string in argv[2].
"""

import json
import os
import sys
from typing import Any, Dict, List

import joblib
import numpy as np

from meal_decision_tree import MealDecisionTree
from meal_recommendation import personalized_meal_recommendation


BASE_DIR = os.path.dirname(__file__)
MALNUTRITION_MODEL_PATH = os.path.join(BASE_DIR, "malnutrition_model.pkl")
MEAL_MODEL_PATH = os.path.join(BASE_DIR, "meal_decision_tree_model.pkl")


def to_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_gender(value: Any) -> int:
    if isinstance(value, (int, float)):
        return 1 if int(value) == 1 else 0

    text = str(value).strip().lower()
    if text in {"male", "m", "boy", "1"}:
        return 1
    return 0


def parse_dietary_preference(value: Any) -> int:
    if isinstance(value, (int, float)):
        return 1 if int(value) == 1 else 0

    text = str(value).strip().lower()
    if "non" in text:
        return 1
    return 0


def parse_bool_flag(value: Any) -> int:
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return 1 if int(value) == 1 else 0

    text = str(value).strip().lower()
    return 1 if text in {"yes", "true", "1", "y"} else 0


def classify_growth_status(weight_dev: float, height_dev: float) -> str:
    if weight_dev < -20 or height_dev < -20:
        return "Growth Delay"
    if weight_dev > 20 or height_dev > 20:
        return "Above Expected Growth"
    return "Normal Growth"


def analyze_growth(age_months: int, weight_kg: float, height_cm: float) -> Dict[str, Any]:
    # Basic pediatric approximations for 1-6 years as a fallback growth signal.
    age_years = max(1.0, min(6.0, age_months / 12.0))
    expected_weight = (2.0 * age_years) + 8.0
    expected_height = (6.0 * age_years) + 77.0

    weight_dev_pct = ((weight_kg - expected_weight) / expected_weight) * 100.0 if expected_weight else 0.0
    height_dev_pct = ((height_cm - expected_height) / expected_height) * 100.0 if expected_height else 0.0

    bmi = weight_kg / ((height_cm / 100.0) ** 2) if height_cm > 0 else 0.0

    alerts: List[str] = []
    if weight_dev_pct < -20:
        alerts.append("Weight is significantly below expected range for age")
    if height_dev_pct < -20:
        alerts.append("Height is significantly below expected range for age")
    if bmi < 14:
        alerts.append("Low BMI signal detected")
    if bmi > 18:
        alerts.append("High BMI signal detected")

    return {
        "age_years": round(age_years, 2),
        "expected_weight_kg": round(expected_weight, 2),
        "expected_height_cm": round(expected_height, 2),
        "actual_weight_kg": round(weight_kg, 2),
        "actual_height_cm": round(height_cm, 2),
        "weight_deviation_percent": round(weight_dev_pct, 2),
        "height_deviation_percent": round(height_dev_pct, 2),
        "bmi": round(bmi, 2),
        "growth_status": classify_growth_status(weight_dev_pct, height_dev_pct),
        "alerts": alerts,
    }


def build_feature_vector(model: Any, payload: Dict[str, Any], bmi: float) -> np.ndarray:
    age_months = to_int(payload.get("ageMonths", payload.get("age_months", 24)), 24)
    weight_kg = to_float(payload.get("weightKg", payload.get("weight_kg", 10.0)), 10.0)
    height_cm = to_float(payload.get("heightCm", payload.get("height_cm", 80.0)), 80.0)
    gender = parse_gender(payload.get("gender", 0))
    has_allergy = parse_bool_flag(payload.get("hasAllergy", payload.get("has_allergy", 0)))
    dietary_preference = parse_dietary_preference(
        payload.get("dietaryPreference", payload.get("dietary_preference", 0))
    )
    hemoglobin = to_float(payload.get("hemoglobin", 0), 0)

    values_map = {
        "age": age_months,
        "age_months": age_months,
        "weight": weight_kg,
        "weight_kg": weight_kg,
        "height": height_cm,
        "height_cm": height_cm,
        "gender": gender,
        "sex": gender,
        "has_allergy": has_allergy,
        "dietary_preference": dietary_preference,
        "bmi": bmi,
        "hemoglobin": hemoglobin,
    }

    if hasattr(model, "feature_names_in_"):
        feature_names = list(model.feature_names_in_)
        vector = [float(values_map.get(name, 0.0)) for name in feature_names]
        return np.array([vector], dtype=float)

    n_features = getattr(model, "n_features_in_", 4)
    fallback_order = [age_months, weight_kg, height_cm, gender, bmi, has_allergy, dietary_preference, hemoglobin]
    vector = fallback_order[:n_features]

    while len(vector) < n_features:
        vector.append(0.0)

    return np.array([vector], dtype=float)


def predict_malnutrition(payload: Dict[str, Any], growth_info: Dict[str, Any]) -> Dict[str, Any]:
    if not os.path.exists(MALNUTRITION_MODEL_PATH):
        return {
            "available": False,
            "message": "malnutrition_model.pkl not found. Place your trained model in server/ml_models/.",
        }

    model = joblib.load(MALNUTRITION_MODEL_PATH)
    feature_vector = build_feature_vector(model, payload, growth_info["bmi"])

    raw_prediction = model.predict(feature_vector)[0]

    confidence = None
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(feature_vector)[0]
        confidence = float(np.max(probs))

    return {
        "available": True,
        "prediction": str(raw_prediction),
        "confidence": confidence,
    }


def recommend_meal(payload: Dict[str, Any]) -> Dict[str, Any]:
    age_months = to_int(payload.get("ageMonths", payload.get("age_months", 24)), 24)
    age_years = max(1, min(6, round(age_months / 12.0)))
    dietary_preference = parse_dietary_preference(
        payload.get("dietaryPreference", payload.get("dietary_preference", 0))
    )
    has_allergy = parse_bool_flag(payload.get("hasAllergy", payload.get("has_allergy", 0)))

    meal_tree = MealDecisionTree()
    if not meal_tree.load_model(MEAL_MODEL_PATH):
        meal_tree.train_model()
        meal_tree.save_model(MEAL_MODEL_PATH)

    return meal_tree.predict_meal(age_years, dietary_preference, has_allergy)


def run_predict(payload: Dict[str, Any]) -> Dict[str, Any]:
    age_months = to_int(payload.get("ageMonths", payload.get("age_months", 24)), 24)
    weight_kg = to_float(payload.get("weightKg", payload.get("weight_kg", 10.0)), 10.0)
    height_cm = to_float(payload.get("heightCm", payload.get("height_cm", 80.0)), 80.0)

    growth_info = analyze_growth(age_months, weight_kg, height_cm)
    malnutrition_result = predict_malnutrition(payload, growth_info)
    meal_result = recommend_meal(payload)

    status_map = {
        "0": "Normal",
        "1": "Moderately Malnourished",
        "2": "Severely Malnourished",
        "normal": "Normal",
        "underweight": "Moderately Malnourished",
        "wasted": "Severely Malnourished",
        "stunted": "Moderately Malnourished",
    }

    predicted_status = str(malnutrition_result.get("prediction", "Normal")).strip()
    normalized_status = status_map.get(predicted_status.lower(), status_map.get(predicted_status, "Normal"))
    food_suggestions = personalized_meal_recommendation(normalized_status, max(1, round(age_months / 12.0)))

    return {
        "success": True,
        "system": "Smart Child Growth Monitoring and Malnutrition Prediction",
        "growth_analysis": growth_info,
        "malnutrition_prediction": malnutrition_result,
        "meal_recommendation": meal_result,
        "nutrient_food_recommendations": {
            "nutrition_status_for_filter": normalized_status,
            "recommended_foods": food_suggestions,
        },
        "note": "You do not need another dataset for meal recommendation immediately. Existing meal decision logic is being used.",
    }


def main() -> None:
    try:
        action = "predict"
        data_payload: Dict[str, Any] = {}

        if len(sys.argv) >= 2:
            action = sys.argv[1]

        if len(sys.argv) >= 3:
            data_payload = json.loads(sys.argv[2])

        if action != "predict":
            print(json.dumps({"success": False, "error": "Unsupported action"}))
            sys.exit(1)

        result = run_predict(data_payload)
        print(json.dumps(result))

    except json.JSONDecodeError as exc:
        print(json.dumps({"success": False, "error": f"Invalid JSON input: {str(exc)}"}))
        sys.exit(1)
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
