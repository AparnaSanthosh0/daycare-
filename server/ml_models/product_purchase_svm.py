"""
Product Purchase Prediction using Support Vector Machine (SVM)
Predicts whether a customer will purchase a product based on:
- Product category (Toy, Diaper, Skincare)
- Price
- Discount offered (%)
- Customer type (Parent, Teacher, Staff)
"""

import sys
import json
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder, StandardScaler
import pickle
import os

# Sample training data
training_data = [
    # [category, price, discount, customer_type, purchase]
    ['Toy', 15, 10, 'Parent', 'Yes'],
    ['Toy', 25, 5, 'Parent', 'Yes'],
    ['Toy', 30, 15, 'Parent', 'Yes'],
    ['Toy', 40, 20, 'Parent', 'Yes'],
    ['Toy', 50, 0, 'Parent', 'No'],
    ['Toy', 20, 10, 'Teacher', 'No'],
    ['Toy', 35, 5, 'Teacher', 'Yes'],
    ['Toy', 15, 15, 'Staff', 'Yes'],
    
    ['Diaper', 20, 10, 'Parent', 'Yes'],
    ['Diaper', 25, 5, 'Parent', 'Yes'],
    ['Diaper', 30, 15, 'Parent', 'Yes'],
    ['Diaper', 40, 20, 'Parent', 'Yes'],
    ['Diaper', 50, 0, 'Parent', 'No'],
    ['Diaper', 25, 10, 'Teacher', 'No'],
    ['Diaper', 30, 15, 'Teacher', 'Yes'],
    ['Diaper', 20, 10, 'Staff', 'Yes'],
    
    ['Skincare', 30, 10, 'Parent', 'Yes'],
    ['Skincare', 40, 15, 'Parent', 'Yes'],
    ['Skincare', 50, 20, 'Parent', 'Yes'],
    ['Skincare', 60, 5, 'Parent', 'No'],
    ['Skincare', 70, 0, 'Parent', 'No'],
    ['Skincare', 35, 10, 'Teacher', 'No'],
    ['Skincare', 45, 15, 'Teacher', 'Yes'],
    ['Skincare', 40, 20, 'Staff', 'Yes'],
    
    # More variations
    ['Toy', 12, 20, 'Parent', 'Yes'],
    ['Toy', 45, 25, 'Parent', 'Yes'],
    ['Toy', 55, 0, 'Parent', 'No'],
    ['Toy', 28, 8, 'Teacher', 'Yes'],
    
    ['Diaper', 22, 12, 'Parent', 'Yes'],
    ['Diaper', 35, 8, 'Parent', 'Yes'],
    ['Diaper', 48, 0, 'Parent', 'No'],
    ['Diaper', 26, 15, 'Teacher', 'Yes'],
    
    ['Skincare', 35, 12, 'Parent', 'Yes'],
    ['Skincare', 55, 18, 'Parent', 'Yes'],
    ['Skincare', 65, 0, 'Parent', 'No'],
    ['Skincare', 42, 10, 'Teacher', 'Yes'],
]

def train_model():
    """Train the SVM model"""
    try:
        # Create DataFrame
        df = pd.DataFrame(training_data, columns=['category', 'price', 'discount', 'customer_type', 'purchase'])
        
        # Prepare features and target
        X = df[['category', 'price', 'discount', 'customer_type']]
        y = df['purchase']
        
        # Encode categorical variables
        label_encoders = {}
        X_encoded = X.copy()
        
        for col in ['category', 'customer_type']:
            le = LabelEncoder()
            X_encoded[col] = le.fit_transform(X[col])
            label_encoders[col] = le
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_encoded)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        # Train SVM with RBF kernel
        svm_model = SVC(kernel='rbf', probability=True, random_state=42)
        svm_model.fit(X_train, y_train)
        
        # Calculate accuracy
        accuracy = svm_model.score(X_test, y_test)
        
        # Save model and encoders
        model_dir = os.path.dirname(os.path.abspath(__file__))
        
        with open(os.path.join(model_dir, 'svm_model.pkl'), 'wb') as f:
            pickle.dump(svm_model, f)
        
        with open(os.path.join(model_dir, 'svm_scaler.pkl'), 'wb') as f:
            pickle.dump(scaler, f)
        
        with open(os.path.join(model_dir, 'svm_encoders.pkl'), 'wb') as f:
            pickle.dump(label_encoders, f)
        
        result = {
            'success': True,
            'accuracy': accuracy,
            'message': f'SVM model trained successfully with {accuracy*100:.2f}% accuracy'
        }
        
        print(json.dumps(result))
        return result
        
    except Exception as e:
        error = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error))
        return error

def predict(data):
    """Make a prediction using the trained model"""
    try:
        category = data.get('category', 'Toy')
        price = float(data.get('price', 20))
        discount = float(data.get('discount', 10))
        customer_type = data.get('customer_type', 'Parent')
        
        # Load model
        model_dir = os.path.dirname(os.path.abspath(__file__))
        
        with open(os.path.join(model_dir, 'svm_model.pkl'), 'rb') as f:
            svm_model = pickle.load(f)
        
        with open(os.path.join(model_dir, 'svm_scaler.pkl'), 'rb') as f:
            scaler = pickle.load(f)
        
        with open(os.path.join(model_dir, 'svm_encoders.pkl'), 'rb') as f:
            label_encoders = pickle.load(f)
        
        # Prepare input
        X_input = pd.DataFrame({
            'category': [category],
            'price': [price],
            'discount': [discount],
            'customer_type': [customer_type]
        })
        
        # Encode
        X_encoded = X_input.copy()
        for col in ['category', 'customer_type']:
            le = label_encoders[col]
            X_encoded[col] = le.transform(X_input[col])
        
        # Scale
        X_scaled = scaler.transform(X_encoded)
        
        # Predict
        prediction = svm_model.predict(X_scaled)[0]
        probabilities = svm_model.predict_proba(X_scaled)[0]
        
        confidence = float(max(probabilities))
        
        # Generate explanation
        explanation = generate_explanation(category, price, discount, customer_type, prediction, confidence)
        
        result = {
            'success': True,
            'prediction': prediction,
            'confidence': confidence,
            'explanation': explanation,
            'factors': {
                'category': category,
                'price': price,
                'discount': discount,
                'customer_type': customer_type
            }
        }
        
        print(json.dumps(result))
        return result
        
    except Exception as e:
        error = {
            'success': False,
            'error': str(e),
            'prediction': 'Yes',  # Fallback
            'confidence': 0.65,
            'explanation': 'Default prediction based on heuristics'
        }
        print(json.dumps(error))
        return error

def generate_explanation(category, price, discount, customer_type, prediction, confidence):
    """Generate human-readable explanation"""
    
    explanation_parts = []
    
    # Discount analysis
    if discount >= 15:
        explanation_parts.append(f"High discount ({discount}%) increases purchase likelihood")
    elif discount >= 10:
        explanation_parts.append(f"Moderate discount ({discount}%) is appealing")
    else:
        explanation_parts.append(f"Low discount ({discount}%) may reduce interest")
    
    # Price analysis
    if price <= 30:
        explanation_parts.append(f"Affordable price (${price}) is attractive")
    elif price <= 50:
        explanation_parts.append(f"Mid-range price (${price}) with good discount makes it appealing")
    else:
        explanation_parts.append(f"Higher price point (${price}) might require more discount incentive")
    
    # Category analysis
    if category == 'Toy':
        explanation_parts.append("Toys are popular among parents")
    elif category == 'Diaper':
        explanation_parts.append("Diapers are essential items for parents")
    elif category == 'Skincare':
        explanation_parts.append("Skincare products appeal to health-conscious parents")
    
    # Customer type analysis
    if customer_type == 'Parent':
        explanation_parts.append("Parents are the primary target audience")
    else:
        explanation_parts.append(f"{customer_type}s may have different purchasing patterns")
    
    prediction_text = "will purchase" if prediction == 'Yes' else "likely won't purchase"
    confidence_text = f"{confidence*100:.1f}%"
    
    return f"Customer {prediction_text} this product ({confidence_text}). {' '.join(explanation_parts)}"

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Missing action parameter'}))
        sys.exit(1)
    
    action = sys.argv[1]
    
    if action == 'train':
        train_model()
    elif action == 'predict':
        if len(sys.argv) < 3:
            print(json.dumps({'error': 'Missing prediction data'}))
            sys.exit(1)
        
        try:
            data = json.loads(sys.argv[2])
            predict(data)
        except json.JSONDecodeError:
            print(json.dumps({'error': 'Invalid JSON data'}))
    else:
        print(json.dumps({'error': 'Invalid action'}))

