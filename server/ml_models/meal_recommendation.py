import os
import pandas as pd

BASE_DIR = os.path.dirname(__file__)
CANDIDATE_DATASETS = [
    os.path.join(BASE_DIR, "data", "clean_food_dataset.csv"),
    os.path.join(BASE_DIR, "clean_food_dataset.csv"),
    os.path.join(BASE_DIR, "clean_food_dataset (1).csv"),
]


def _load_food_data():
    for dataset_path in CANDIDATE_DATASETS:
        if os.path.exists(dataset_path):
            return pd.read_csv(dataset_path)
    raise FileNotFoundError(
        "Meal dataset not found. Expected clean_food_dataset.csv or clean_food_dataset (1).csv"
    )


food_data = _load_food_data()

def personalized_meal_recommendation(status, age):

    foods = food_data.copy()

    if age <= 2:
        foods = foods[foods["Sodium"] < 200]

    elif age <= 5:
        foods = foods[foods["Potassium"] > 200]

    else:
        foods = foods[foods["Carbohydrates"] > 5]

    if status == "Moderately Malnourished":
        foods = foods[foods["Zinc"] > 1]

    elif status == "Severely Malnourished":
        foods = foods[(foods["Zinc"] > 2) & (foods["Potassium"] > 300)]

    return foods["Food"].head(10).tolist()