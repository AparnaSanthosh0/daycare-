import os
import joblib
import pandas as pd

from meal_recommendation import personalized_meal_recommendation

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "malnutrition_model.pkl")


# Load ML model
model = joblib.load(MODEL_PATH)

sample = pd.DataFrame(
    [[36, 1, 90, 11, 13.5, 12]],
    columns=[
        "Age_Months",
        "Gender",
        "Height_cm",
        "Weight_kg",
        "BMI",
        "MUAC_cm",
    ],
)

prediction = model.predict(sample)

labels = {
    0: "Normal",
    1: "Moderately Malnourished",
    2: "Severely Malnourished",
}

status = labels.get(int(prediction[0]), str(prediction[0]))
foods = personalized_meal_recommendation(status, age=4)

print("Nutrition Status:", status)
print("Recommended Foods:", foods)
