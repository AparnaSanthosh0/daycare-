"""
Support Vector Machine (SVM) for Product Purchase Prediction
Predicts whether a customer will purchase a daycare product

Inputs:
- Product category (Toy, Diaper, Skincare, etc.)
- Price (numeric)
- Discount offered (%)
- Customer type (Parent, Guardian, etc.)

Output:
- Purchase decision: Yes/No
- Confidence score
"""

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
import pickle
import json
import sys
import os

# Training data with various scenarios
# Features: [category_encoded, price_normalized, discount, customer_type_encoded]
def generate_training_data():
    """
    Generate training data based on daycare e-commerce patterns:
    - Toys are high interest items, especially with discounts
    - Diapers are essential purchases
    - Skincare products have moderate interest
    - Discounts significantly influence purchase decisions
    """
    X = []
    y = []
    
    # Training scenarios
    scenarios = [
        # (category, price, discount, customer_type, will_purchase)
        # category: 0=Toy, 1=Diaper, 2=Skincare, 3=Apparel, 4=Food
        # customer_type: 0=Parent, 1=Guardian, 2=Educator
        # Will purchase = 1, Won't purchase = 0
        
        # Toys - High purchase rate with good discounts
        (0, 50, 0, 0, 0),   # Toy, $50, 0% discount, Parent → Won't buy
        (0, 50, 10, 0, 1),  # Toy, $50, 10% discount, Parent → Will buy
        (0, 30, 15, 0, 1),  # Toy, $30, 15% discount, Parent → Will buy
        (0, 100, 5, 0, 0),  # Toy, $100, 5% discount, Parent → Won't buy
        (0, 40, 20, 0, 1),  # Toy, $40, 20% discount, Parent → Will buy
        (0, 60, 0, 1, 0),   # Toy, $60, 0% discount, Guardian → Won't buy
        (0, 45, 12, 1, 1),  # Toy, $45, 12% discount, Guardian → Will buy
        (0, 25, 25, 1, 1),  # Toy, $25, 25% discount, Guardian → Will buy
        
        # Diapers - Essential items, lower price sensitivity
        (1, 35, 0, 0, 1),   # Diaper, $35, 0% discount, Parent → Will buy (essential)
        (1, 35, 10, 0, 1),  # Diaper, $35, 10% discount, Parent → Will buy
        (1, 50, 0, 0, 1),   # Diaper, $50, 0% discount, Parent → Will buy (essential)
        (1, 60, 10, 0, 1),  # Diaper, $60, 10% discount, Parent → Will buy
        (1, 70, 5, 0, 1),   # Diaper, $70, 5% discount, Parent → Will buy
        (1, 80, 0, 0, 0),   # Diaper, $80, 0% discount, Parent → Won't buy (too expensive)
        (1, 55, 15, 1, 1),  # Diaper, $55, 15% discount, Guardian → Will buy
        
        # Skincare - Moderate interest
        (2, 25, 0, 0, 0),   # Skincare, $25, 0% discount, Parent → Won't buy
        (2, 25, 15, 0, 1),  # Skincare, $25, 15% discount, Parent → Will buy
        (2, 40, 10, 0, 0),  # Skincare, $40, 10% discount, Parent → Won't buy
        (2, 30, 20, 0, 1),  # Skincare, $30, 20% discount, Parent → Will buy
        (2, 35, 25, 1, 1),  # Skincare, $35, 25% discount, Guardian → Will buy
        (2, 50, 5, 0, 0),   # Skincare, $50, 5% discount, Parent → Won't buy
        
        # Apparel
        (3, 30, 0, 0, 0),   # Apparel, $30, 0% discount, Parent → Won't buy
        (3, 30, 15, 0, 1),  # Apparel, $30, 15% discount, Parent → Will buy
        (3, 45, 20, 0, 1),  # Apparel, $45, 20% discount, Parent → Will buy
        (3, 60, 10, 0, 0),  # Apparel, $60, 10% discount, Parent → Won't buy
        
        # Food/Meals
        (4, 15, 0, 0, 1),   # Food, $15, 0% discount, Parent → Will buy (essential)
        (4, 15, 10, 0, 1),  # Food, $15, 10% discount, Parent → Will buy
        (4, 25, 5, 0, 1),   # Food, $25, 5% discount, Parent → Will buy
        (4, 30, 0, 0, 0),   # Food, $30, 0% discount, Parent → Won't buy
        (4, 20, 15, 1, 1),  # Food, $20, 15% discount, Guardian → Will buy
    ]
    
    for category, price, discount, customer_type, will_purchase in scenarios:
        # Feature vector: [category, price, discount, customer_type]
        X.append([category, price, discount, customer_type])
        y.append(will_purchase)
    
    return np.array(X), np.array(y)

def train_svm_model():
    """Train the SVM model for purchase prediction"""
    print("🤖 Training SVM Purchase Prediction Model...")
    
    # Generate training data
    X, y = generate_training_data()
    
    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    # Train SVM classifier
    # Using RBF kernel for better performance with non-linear relationships
    svm_model = SVC(
        kernel='rbf',
        C=1.0,  # Regularization parameter
        gamma='scale',  # Kernel coefficient
        probability=True,  # Enable probability estimates
        random_state=42
    )
    
    svm_model.fit(X_train, y_train)
    
    # Evaluate model
    train_score = svm_model.score(X_train, y_train)
    test_score = svm_model.score(X_test, y_test)
    
    print(f"✅ Training Accuracy: {train_score:.2%}")
    print(f"✅ Test Accuracy: {test_score:.2%}")
    
    # Save model and scaler
    model_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(model_dir, 'purchase_svm_model.pkl')
    scaler_path = os.path.join(model_dir, 'purchase_svm_scaler.pkl')
    
    with open(model_path, 'wb') as f:
        pickle.dump(svm_model, f)
    
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler, f)
    
    print(f"✅ Model saved to: {model_path}")
    print(f"✅ Scaler saved to: {scaler_path}")
    
    return svm_model, scaler

def predict_purchase(category, price, discount, customer_type='parent'):
    """
    Predict if a customer will purchase a product
    
    Args:
        category: Product category (toy, diaper, skincare, apparel, food)
        price: Product price
        discount: Discount percentage (0-100)
        customer_type: Customer type (parent, guardian, educator)
    
    Returns:
        dict: Prediction result with decision and confidence
    """
    try:
        # Load model and scaler
        model_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(model_dir, 'purchase_svm_model.pkl')
        scaler_path = os.path.join(model_dir, 'purchase_svm_scaler.pkl')
        
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            print("⚠️ Model not found. Training new model...")
            svm_model, scaler = train_svm_model()
        else:
            with open(model_path, 'rb') as f:
                svm_model = pickle.load(f)
            with open(scaler_path, 'rb') as f:
                scaler = pickle.load(f)
        
        # Encode category
        category_map = {
            'toy': 0,
            'diaper': 1,
            'skincare': 2,
            'apparel': 3,
            'food': 4
        }
        category_encoded = category_map.get(category.lower(), 0)
        
        # Encode customer type
        customer_map = {
            'parent': 0,
            'guardian': 1,
            'educator': 2
        }
        customer_encoded = customer_map.get(customer_type.lower(), 0)
        
        # Prepare feature vector
        features = np.array([[category_encoded, float(price), float(discount), customer_encoded]])
        
        # Normalize features
        features_scaled = scaler.transform(features)
        
        # Predict
        prediction = svm_model.predict(features_scaled)[0]
        probabilities = svm_model.predict_proba(features_scaled)[0]
        
        decision = 'Yes' if prediction == 1 else 'No'
        confidence = float(max(probabilities))
        
        # Generate explanation
        will_purchase = prediction == 1
        if category_encoded == 0:  # Toys
            if discount >= 10 and will_purchase:
                explanation = f"Toys with {discount}% discount are likely to be purchased."
            elif discount < 10 and not will_purchase:
                explanation = f"Toys need at least 10% discount to be attractive at ${price:.2f}."
            else:
                explanation = f"Toy purchase decision based on price and discount analysis."
        elif category_encoded == 1:  # Diapers
            if price <= 70:
                explanation = f"Diapers are essential items and frequently purchased at ${price:.2f}."
            else:
                explanation = f"Diapers priced above ${70} may face purchase resistance."
        elif category_encoded == 2:  # Skincare
            if discount >= 15 and will_purchase:
                explanation = f"Skincare products with {discount}% discount are attractive to parents."
            elif discount < 15 and not will_purchase:
                explanation = f"Skincare items typically need 15%+ discount to drive purchases."
        elif category_encoded == 3:  # Apparel
            if discount >= 15 and will_purchase:
                explanation = f"Apparel with {discount}% discount is likely to be purchased."
            else:
                explanation = f"Apparel may need higher discounts to attract parents."
        elif category_encoded == 4:  # Food
            if price <= 25:
                explanation = f"Food items are essential and frequently purchased at ${price:.2f}."
            else:
                explanation = f"Food items above ${25} may need discounts to drive purchases."
        else:
            explanation = "Purchase decision based on SVM classification."
        
        if discount >= 15 and will_purchase:
            explanation = f"Strong discount of {discount}% significantly increases purchase likelihood."
        
        return {
            'decision': decision,
            'confidence': confidence,
            'probability_yes': float(probabilities[1]),
            'probability_no': float(probabilities[0]),
            'category': category,
            'price': price,
            'discount': discount,
            'explanation': explanation
        }
        
    except Exception as e:
        print(f"❌ Error in prediction: {e}")
        # Fallback rule-based prediction
        will_purchase = (
            discount >= 15 or
            (category.lower() in ['diaper', 'food'] and price <= 60) or
            (category.lower() == 'toy' and discount >= 10)
        )
        return {
            'decision': 'Yes' if will_purchase else 'No',
            'confidence': 0.7,
            'probability_yes': 0.7 if will_purchase else 0.3,
            'probability_no': 0.3 if will_purchase else 0.7,
            'category': category,
            'price': price,
            'discount': discount,
            'explanation': f"Rule-based prediction: {'Likely to purchase' if will_purchase else 'May not purchase'} based on category, price, and discount."
        }

# Command-line usage
if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'train':
        # Train the model
        train_svm_model()
    else:
        # Test prediction
        if len(sys.argv) > 4:
            category = sys.argv[1]
            price = float(sys.argv[2])
            discount = float(sys.argv[3])
            customer_type = sys.argv[4] if len(sys.argv) > 4 else 'parent'
            
            result = predict_purchase(category, price, discount, customer_type)
            print(json.dumps(result, indent=2))
        else:
            print("Usage: python purchase_prediction_svm.py train")
            print("Or: python purchase_prediction_svm.py <category> <price> <discount> <customer_type>")
            print("\nExample:")
            print("  python purchase_prediction_svm.py toy 50 15 parent")
            print("  python purchase_prediction_svm.py diaper 40 0 parent")
            print("  python purchase_prediction_svm.py skincare 30 20 guardian")
            sys.exit(1)

