#!/usr/bin/env python3
"""
Meal Decision Tree API - Command line interface for meal recommendations
"""

import sys
import json
import os
from meal_decision_tree import MealDecisionTree

def main():
    """Main function to handle command line arguments and return JSON result"""
    if len(sys.argv) != 4:
        print(json.dumps({
            'error': 'Invalid arguments. Usage: python meal_decision_tree_api.py <age> <dietary_preference> <has_allergy>'
        }))
        sys.exit(1)
    
    try:
        # Parse command line arguments
        age = int(sys.argv[1])
        dietary_preference = int(sys.argv[2])  # 0=Vegetarian, 1=Non-Vegetarian
        has_allergy = int(sys.argv[3])  # 0=No, 1=Yes
        
        # Initialize model
        meal_tree = MealDecisionTree()
        
        # Try to load existing model, otherwise train new one
        model_path = os.path.join(os.path.dirname(__file__), 'meal_decision_tree_model.pkl')
        if not meal_tree.load_model(model_path):
            print("Training new model...", file=sys.stderr)
            meal_tree.train_model()
            meal_tree.save_model(model_path)
        
        # Make prediction
        result = meal_tree.predict_meal(age, dietary_preference, has_allergy)
        
        # Output JSON result
        print(json.dumps(result, indent=2))
        
    except ValueError as e:
        print(json.dumps({
            'error': f'Invalid input: {str(e)}'
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'error': f'Prediction error: {str(e)}'
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
