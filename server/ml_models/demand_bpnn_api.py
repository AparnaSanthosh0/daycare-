"""
API wrapper for Product Demand BPNN
Handles training and prediction requests
"""

import sys
import json
from demand_bpnn import train_model, predict

if __name__ == '__main__':
    if len(sys.argv) < 2:
        result = {'success': False, 'error': 'Missing action parameter'}
        print(json.dumps(result))
        sys.exit(1)
    
    action = sys.argv[1]
    
    if action == 'train':
        train_model()
    elif action == 'predict':
        if len(sys.argv) < 3:
            result = {'success': False, 'error': 'Missing prediction data'}
            print(json.dumps(result))
            sys.exit(1)
        
        try:
            data = json.loads(sys.argv[2])
            predict(data)
        except json.JSONDecodeError as e:
            result = {'success': False, 'error': f'Invalid JSON data: {str(e)}'}
            print(json.dumps(result))
    else:
        result = {'success': False, 'error': 'Invalid action'}
        print(json.dumps(result))

