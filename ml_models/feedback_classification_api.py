#!/usr/bin/env python3
"""
API script for Bayesian Feedback Classification
Handles classification requests from Node.js server
"""

import sys
import json
import os
from feedback_bayesian_classifier import FeedbackBayesianClassifier, generate_sample_training_data

def load_or_train_model():
    """Load existing model or train a new one"""
    model_path = 'feedback_bayesian_model.json'
    
    classifier = FeedbackBayesianClassifier()
    
    if os.path.exists(model_path):
        try:
            classifier.load_model(model_path)
            return classifier
        except Exception as e:
            print(f"Error loading model: {e}", file=sys.stderr)
            # Fall back to training new model
            pass
    
    # Train new model
    training_data = generate_sample_training_data()
    classifier.train(training_data)
    classifier.save_model(model_path)
    
    return classifier

def classify_feedback(feedback_text, rating, service_category):
    """Classify a single feedback entry"""
    try:
        classifier = load_or_train_model()
        result = classifier.predict(feedback_text, rating, service_category)
        return {
            'success': True,
            'result': result
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def batch_classify(feedback_entries):
    """Classify multiple feedback entries"""
    try:
        classifier = load_or_train_model()
        results = []
        
        for entry in feedback_entries:
            result = classifier.predict(
                entry['feedback_text'],
                entry['rating'],
                entry['service_category']
            )
            results.append({
                'input': entry,
                'classification': result
            })
        
        return {
            'success': True,
            'results': results
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_model_stats():
    """Get model statistics"""
    try:
        classifier = load_or_train_model()
        
        stats = {
            'vocabulary_size': len(classifier.vocabulary),
            'total_documents': classifier.total_documents,
            'class_distribution': classifier.class_counts,
            'is_trained': classifier.is_trained,
            'service_categories': classifier.service_categories,
            'positive_words_count': len(classifier.positive_words),
            'negative_words_count': len(classifier.negative_words)
        }
        
        return {
            'success': True,
            'result': stats
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main function to handle API requests"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'No action specified'
        }))
        sys.exit(1)
    
    action = sys.argv[1]
    
    try:
        if action == 'classify':
            if len(sys.argv) < 3:
                print(json.dumps({
                    'success': False,
                    'error': 'No data provided for classification'
                }))
                sys.exit(1)
            
            data = json.loads(sys.argv[2])
            result = classify_feedback(
                data['feedback_text'],
                data['rating'],
                data['service_category']
            )
            print(json.dumps(result))
            
        elif action == 'batch_classify':
            if len(sys.argv) < 3:
                print(json.dumps({
                    'success': False,
                    'error': 'No data provided for batch classification'
                }))
                sys.exit(1)
            
            data = json.loads(sys.argv[2])
            result = batch_classify(data['feedback_entries'])
            print(json.dumps(result))
            
        elif action == 'get_stats':
            result = get_model_stats()
            print(json.dumps(result))
            
        elif action == 'load_model':
            if len(sys.argv) < 3:
                print(json.dumps({
                    'success': False,
                    'error': 'No model path provided'
                }))
                sys.exit(1)
            
            data = json.loads(sys.argv[2])
            model_path = data['model_path']
            
            if os.path.exists(model_path):
                classifier = FeedbackBayesianClassifier()
                classifier.load_model(model_path)
                print(json.dumps({
                    'success': True,
                    'message': 'Model loaded successfully'
                }))
            else:
                print(json.dumps({
                    'success': False,
                    'error': 'Model file not found'
                }))
                sys.exit(1)
                
        else:
            print(json.dumps({
                'success': False,
                'error': f'Unknown action: {action}'
            }))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
