"""
Python API for SVM Purchase Prediction
Handles HTTP requests for purchase predictions
"""

import json
import sys
from purchase_prediction_svm import predict_purchase, train_svm_model

def main():
    """Handle API requests"""
    try:
        # Read input from stdin
        data = json.loads(sys.stdin.read())
        action = data.get('action', 'predict')
        
        if action == 'train':
            # Train the model
            svm_model, scaler = train_svm_model()
            result = {
                'success': True,
                'message': 'Model trained successfully'
            }
            print(json.dumps(result))
            return
        
        elif action == 'predict':
            # Get parameters
            category = data.get('category', 'toy')
            price = data.get('price', 0)
            discount = data.get('discount', 0)
            customer_type = data.get('customerType', 'parent')
            
            # Make prediction
            result = predict_purchase(category, price, discount, customer_type)
            
            response = {
                'success': True,
                'result': result
            }
            
            print(json.dumps(response))
            
    except Exception as e:
        error_response = {
            'success': False,
            'error': str(e),
            'message': 'Error processing prediction request'
        }
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()

