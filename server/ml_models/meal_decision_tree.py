#!/usr/bin/env python3
"""
Meal Option Recommendation - Decision Tree Algorithm
Recommends meal options for children based on dietary needs and age.
"""

import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier, export_text, export_graphviz
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

class MealDecisionTree:
    def __init__(self):
        self.model = DecisionTreeClassifier(
            criterion='gini',
            max_depth=5,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42
        )
        self.feature_names = ['age', 'dietary_preference', 'has_allergy']
        self.meal_categories = {
            'soft_veg': 'Soft Vegetarian Meal',
            'standard_veg': 'Standard Vegetarian Meal', 
            'soft_nonveg': 'Soft Non-Vegetarian Meal',
            'standard_nonveg': 'Standard Non-Vegetarian Meal',
            'allergy_free_soft': 'Allergy-Free Soft Meal',
            'allergy_free_standard': 'Allergy-Free Standard Meal'
        }
    
    def create_sample_data(self):
        """Create sample training data for the decision tree"""
        data = []
        
        # Generate sample data based on the decision tree logic
        for age in range(1, 6):  # Ages 1-5
            for dietary_pref in [0, 1]:  # 0=Vegetarian, 1=Non-Vegetarian
                for has_allergy in [0, 1]:  # 0=No Allergy, 1=Has Allergy
                    
                    # Decision tree logic
                    if age < 3:  # Young children (1-2 years)
                        if has_allergy == 1:  # Has allergy
                            meal = 'allergy_free_soft'
                        elif dietary_pref == 0:  # Vegetarian
                            meal = 'soft_veg'
                        else:  # Non-vegetarian
                            meal = 'soft_nonveg'
                    else:  # Older children (3-5 years)
                        if has_allergy == 1:  # Has allergy
                            meal = 'allergy_free_standard'
                        elif dietary_pref == 0:  # Vegetarian
                            meal = 'standard_veg'
                        else:  # Non-vegetarian
                            meal = 'standard_nonveg'
                    
                    data.append([age, dietary_pref, has_allergy, meal])
        
        # Add more diverse examples
        additional_data = [
            # Edge cases
            [6, 0, 0, 'standard_veg'],  # Older child, veg, no allergy
            [6, 1, 0, 'standard_nonveg'],  # Older child, non-veg, no allergy
            [6, 0, 1, 'allergy_free_standard'],  # Older child, veg, with allergy
            [6, 1, 1, 'allergy_free_standard'],  # Older child, non-veg, with allergy
            
            # Special cases
            [1, 0, 1, 'allergy_free_soft'],  # Very young with allergy
            [2, 1, 0, 'soft_nonveg'],  # Young non-veg
            [3, 0, 0, 'standard_veg'],  # Transition age
            [4, 1, 1, 'allergy_free_standard'],  # Older with allergy
            [5, 0, 0, 'standard_veg'],  # Pre-school age
        ]
        
        data.extend(additional_data)
        
        return pd.DataFrame(data, columns=['age', 'dietary_preference', 'has_allergy', 'meal_recommendation'])
    
    def train_model(self):
        """Train the decision tree model"""
        print("🌱 Training Meal Decision Tree Model...")
        
        # Create sample data
        df = self.create_sample_data()
        print(f"📊 Training data shape: {df.shape}")
        print(f"📊 Sample data:\n{df.head()}")
        
        # Prepare features and target
        X = df[['age', 'dietary_preference', 'has_allergy']]
        y = df['meal_recommendation']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"✅ Model trained successfully!")
        print(f"📈 Accuracy: {accuracy:.2f}")
        print(f"📊 Classification Report:\n{classification_report(y_test, y_pred)}")
        
        # Print decision tree rules
        self.print_decision_rules()
        
        return accuracy
    
    def predict_meal(self, age, dietary_preference, has_allergy):
        """
        Predict meal recommendation for a child
        
        Args:
            age (int): Child's age (1-6)
            dietary_preference (int): 0=Vegetarian, 1=Non-Vegetarian
            has_allergy (int): 0=No Allergy, 1=Has Allergy
            
        Returns:
            dict: Prediction results
        """
        # Validate inputs
        if not isinstance(age, (int, float)) or age < 1 or age > 6:
            raise ValueError("Age must be between 1 and 6")
        
        if dietary_preference not in [0, 1]:
            raise ValueError("Dietary preference must be 0 (Vegetarian) or 1 (Non-Vegetarian)")
        
        if has_allergy not in [0, 1]:
            raise ValueError("Has allergy must be 0 (No) or 1 (Yes)")
        
        # Prepare input
        X = np.array([[age, dietary_preference, has_allergy]])
        
        # Make prediction
        prediction = self.model.predict(X)[0]
        probability = self.model.predict_proba(X)[0]
        
        # Get feature importance
        feature_importance = dict(zip(self.feature_names, self.model.feature_importances_))
        
        # Create explanation
        explanation = self._create_explanation(age, dietary_preference, has_allergy, prediction)
        
        return {
            'prediction': prediction,
            'meal_category': self.meal_categories.get(prediction, prediction),
            'confidence': float(max(probability)),
            'feature_importance': feature_importance,
            'explanation': explanation,
            'input_features': {
                'age': age,
                'dietary_preference': 'Vegetarian' if dietary_preference == 0 else 'Non-Vegetarian',
                'has_allergy': 'Yes' if has_allergy == 1 else 'No'
            }
        }
    
    def _create_explanation(self, age, dietary_preference, has_allergy, prediction):
        """Create human-readable explanation for the prediction"""
        explanations = []
        
        if age < 3:
            explanations.append(f"Child is {age} years old (young child)")
            if has_allergy:
                explanations.append("Has allergies - recommending allergy-free soft meal")
            else:
                explanations.append("No allergies - recommending age-appropriate soft meal")
        else:
            explanations.append(f"Child is {age} years old (older child)")
            if has_allergy:
                explanations.append("Has allergies - recommending allergy-free standard meal")
            else:
                explanations.append("No allergies - recommending standard meal")
        
        dietary_pref_text = "Vegetarian" if dietary_preference == 0 else "Non-Vegetarian"
        explanations.append(f"Dietary preference: {dietary_pref_text}")
        
        return " | ".join(explanations)
    
    def print_decision_rules(self):
        """Print the decision tree rules in text format"""
        print("\n🌳 Decision Tree Rules:")
        print("=" * 50)
        
        tree_rules = export_text(self.model, feature_names=self.feature_names)
        print(tree_rules)
    
    def save_model(self, filepath='meal_decision_tree_model.pkl'):
        """Save the trained model"""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self.model, filepath)
        print(f"💾 Model saved to: {filepath}")
    
    def load_model(self, filepath='meal_decision_tree_model.pkl'):
        """Load a pre-trained model"""
        if os.path.exists(filepath):
            self.model = joblib.load(filepath)
            print(f"📂 Model loaded from: {filepath}")
            return True
        return False

def main():
    """Main function to train and test the model"""
    print("🍽️ Meal Decision Tree Recommendation System")
    print("=" * 50)
    
    # Initialize model
    meal_tree = MealDecisionTree()
    
    # Train model
    accuracy = meal_tree.train_model()
    
    # Save model
    model_path = os.path.join(os.path.dirname(__file__), 'meal_decision_tree_model.pkl')
    meal_tree.save_model(model_path)
    
    # Test predictions
    print("\n🧪 Testing Predictions:")
    print("=" * 30)
    
    test_cases = [
        (2, 0, 1),  # 2 years, vegetarian, has allergy
        (4, 1, 0),  # 4 years, non-vegetarian, no allergy
        (1, 0, 0),  # 1 year, vegetarian, no allergy
        (5, 1, 1),  # 5 years, non-vegetarian, has allergy
    ]
    
    for age, dietary_pref, has_allergy in test_cases:
        result = meal_tree.predict_meal(age, dietary_pref, has_allergy)
        print(f"\n👶 Child: {age} years, {result['input_features']['dietary_preference']}, Allergy: {result['input_features']['has_allergy']}")
        print(f"🍽️ Recommended: {result['meal_category']}")
        print(f"📊 Confidence: {result['confidence']:.2f}")
        print(f"💡 Explanation: {result['explanation']}")

if __name__ == "__main__":
    main()
