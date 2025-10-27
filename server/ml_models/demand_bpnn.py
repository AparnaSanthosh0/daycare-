"""
Product Demand Prediction using Backpropagation Neural Network (BPNN)
Predicts demand category (Low/Medium/High) based on:
- Product type
- Previous month sales
- Vendor delivery time
- Price
"""

import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.neural_network import MLPClassifier
import pickle
import os

# Sample training data
training_data = [
    # [product_type, previous_sales, delivery_time, price, demand]
    ['Diaper', 100, 1, 200, 'High'],
    ['Diaper', 80, 2, 250, 'High'],
    ['Diaper', 60, 3, 200, 'High'],
    ['Diaper', 40, 1, 300, 'Medium'],
    ['Diaper', 30, 4, 250, 'Medium'],
    ['Diaper', 20, 2, 350, 'Low'],
    ['Diaper', 10, 5, 300, 'Low'],
    
    ['Toy', 50, 2, 500, 'High'],
    ['Toy', 40, 3, 600, 'Medium'],
    ['Toy', 30, 1, 500, 'High'],
    ['Toy', 25, 4, 700, 'Medium'],
    ['Toy', 15, 2, 800, 'Low'],
    ['Toy', 10, 5, 700, 'Low'],
    ['Toy', 5, 3, 900, 'Low'],
    
    ['Feeding', 60, 1, 400, 'High'],
    ['Feeding', 45, 2, 450, 'High'],
    ['Feeding', 35, 3, 400, 'Medium'],
    ['Feeding', 20, 4, 550, 'Medium'],
    ['Feeding', 15, 2, 600, 'Low'],
    
    ['BabyCare', 70, 1, 300, 'High'],
    ['BabyCare', 55, 2, 350, 'High'],
    ['BabyCare', 40, 3, 400, 'Medium'],
    ['BabyCare', 25, 4, 450, 'Medium'],
    ['BabyCare', 15, 5, 500, 'Low'],
    
    ['Bath', 50, 2, 200, 'High'],
    ['Bath', 40, 1, 250, 'High'],
    ['Bath', 30, 3, 200, 'Medium'],
    ['Bath', 20, 4, 300, 'Low'],
    ['Bath', 10, 5, 250, 'Low'],
    
    ['Footwear', 30, 2, 800, 'Medium'],
    ['Footwear', 25, 3, 900, 'Medium'],
    ['Footwear', 20, 1, 750, 'High'],
    ['Footwear', 10, 4, 1000, 'Low'],
    
    # More variations
    ['Diaper', 90, 1, 180, 'High'],
    ['Diaper', 35, 3, 220, 'Medium'],
    ['Toy', 35, 2, 550, 'High'],
    ['Toy', 12, 4, 650, 'Low'],
    ['Feeding', 50, 2, 380, 'High'],
    ['BabyCare', 60, 1, 320, 'High'],
    ['Bath', 45, 2, 220, 'High'],
    ['Footwear', 18, 3, 850, 'Medium'],
]

def train_model():
    """Train the BPNN model"""
    try:
        # Create DataFrame
        df = pd.DataFrame(training_data, columns=['product_type', 'previous_sales', 'delivery_time', 'price', 'demand'])
        
        # Prepare features and target
        X = df[['product_type', 'previous_sales', 'delivery_time', 'price']]
        y = df['demand']
        
        # Encode categorical variables
        le_product = LabelEncoder()
        X['product_type_encoded'] = le_product.fit_transform(X['product_type'])
        X = X.drop('product_type', axis=1)
        
        # Encode target
        le_demand = LabelEncoder()
        y_encoded = le_demand.fit_transform(y)
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_encoded, test_size=0.2, random_state=42
        )
        
        # Create neural network (BPNN)
        # Multi-layer Perceptron with backpropagation
        bpnn = MLPClassifier(
            hidden_layer_sizes=(100, 50),  # 2 hidden layers with 100 and 50 neurons
            activation='relu',
            solver='adam',
            alpha=0.01,
            learning_rate='adaptive',
            max_iter=1000,
            random_state=42
        )
        
        # Train the model
        bpnn.fit(X_train, y_train)
        
        # Calculate accuracy
        accuracy = bpnn.score(X_test, y_test)
        
        # Save model and encoders
        model_dir = os.path.dirname(os.path.abspath(__file__))
        
        with open(os.path.join(model_dir, 'bpnn_model.pkl'), 'wb') as f:
            pickle.dump(bpnn, f)
        
        with open(os.path.join(model_dir, 'bpnn_scaler.pkl'), 'wb') as f:
            pickle.dump(scaler, f)
        
        with open(os.path.join(model_dir, 'bpnn_product_encoder.pkl'), 'wb') as f:
            pickle.dump(le_product, f)
        
        with open(os.path.join(model_dir, 'bpnn_demand_encoder.pkl'), 'wb') as f:
            pickle.dump(le_demand, f)
        
        result = {
            'success': True,
            'accuracy': accuracy,
            'message': f'BPNN model trained successfully with {accuracy*100:.2f}% accuracy'
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
    """Make a prediction using the trained BPNN model"""
    try:
        product_type = data.get('product_type', 'Diaper')
        previous_sales = float(data.get('previous_sales', 50))
        delivery_time = float(data.get('delivery_time', 2))
        price = float(data.get('price', 300))
        
        # Load model
        model_dir = os.path.dirname(os.path.abspath(__file__))
        
        with open(os.path.join(model_dir, 'bpnn_model.pkl'), 'rb') as f:
            bpnn_model = pickle.load(f)
        
        with open(os.path.join(model_dir, 'bpnn_scaler.pkl'), 'rb') as f:
            scaler = pickle.load(f)
        
        with open(os.path.join(model_dir, 'bpnn_product_encoder.pkl'), 'rb') as f:
            product_encoder = pickle.load(f)
        
        with open(os.path.join(model_dir, 'bpnn_demand_encoder.pkl'), 'rb') as f:
            demand_encoder = pickle.load(f)
        
        # Prepare input
        X_input = pd.DataFrame({
            'product_type': [product_type],
            'previous_sales': [previous_sales],
            'delivery_time': [delivery_time],
            'price': [price]
        })
        
        # Encode product type
        X_input['product_type_encoded'] = product_encoder.transform(X_input['product_type'])
        X_input = X_input.drop('product_type', axis=1)
        
        # Scale
        X_scaled = scaler.transform(X_input)
        
        # Predict
        prediction_encoded = bpnn_model.predict(X_scaled)[0]
        prediction = demand_encoder.inverse_transform([prediction_encoded])[0]
        
        # Get probabilities for each demand class
        probabilities = bpnn_model.predict_proba(X_scaled)[0]
        confidence = float(max(probabilities))
        
        # Generate explanation
        explanation = generate_explanation(product_type, previous_sales, delivery_time, price, prediction, confidence)
        
        result = {
            'success': True,
            'prediction': prediction,
            'confidence': confidence,
            'explanation': explanation,
            'factors': {
                'product_type': product_type,
                'previous_sales': previous_sales,
                'delivery_time': delivery_time,
                'price': price
            }
        }
        
        print(json.dumps(result))
        return result
        
    except Exception as e:
        error = {
            'success': False,
            'error': str(e),
            'prediction': 'Medium',  # Fallback
            'confidence': 0.65,
            'explanation': 'Default prediction based on heuristics'
        }
        print(json.dumps(error))
        return error

def generate_explanation(product_type, previous_sales, delivery_time, price, prediction, confidence):
    """Generate human-readable explanation"""
    
    explanation_parts = []
    
    # Sales analysis
    if previous_sales >= 50:
        explanation_parts.append(f"High sales volume ({previous_sales} units) indicates strong demand")
    elif previous_sales >= 30:
        explanation_parts.append(f"Moderate sales volume ({previous_sales} units) suggests steady demand")
    else:
        explanation_parts.append(f"Low sales volume ({previous_sales} units) may indicate lower demand")
    
    # Delivery time analysis
    if delivery_time <= 2:
        explanation_parts.append("Fast delivery time keeps inventory fresh")
    elif delivery_time <= 3:
        explanation_parts.append("Reasonable delivery time for inventory management")
    else:
        explanation_parts.append("Longer delivery time may require higher stock levels")
    
    # Price analysis
    if price <= 300:
        explanation_parts.append(f"Affordable price (₹{price}) makes it accessible")
    elif price <= 600:
        explanation_parts.append(f"Moderate price (₹{price}) has balanced appeal")
    else:
        explanation_parts.append(f"Higher price (₹{price}) may reduce demand")
    
    # Product type analysis
    if product_type in ['Diaper', 'BabyCare', 'Feeding']:
        explanation_parts.append("Essential items typically have consistent demand")
    elif product_type in ['Toy', 'Footwear']:
        explanation_parts.append("Popular items with variable seasonal demand")
    else:
        explanation_parts.append("Specialized items with niche market demand")
    
    confidence_text = f"{confidence*100:.1f}%"
    
    return f"Predicted demand: {prediction} ({confidence_text}). {' '.join(explanation_parts)}."

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

