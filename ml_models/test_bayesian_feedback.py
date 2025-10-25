#!/usr/bin/env python3
"""
Test script for the Bayesian Feedback Classifier
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from feedback_bayesian_classifier import FeedbackBayesianClassifier, generate_sample_training_data

def test_bayesian_classifier():
    """Test the Bayesian classifier with sample data"""
    print("🤖 Testing Bayesian Feedback Classifier")
    print("=" * 50)
    
    # Create classifier instance
    classifier = FeedbackBayesianClassifier()
    
    # Generate training data
    print("📊 Generating training data...")
    training_data = generate_sample_training_data()
    print(f"Generated {len(training_data)} training samples")
    
    # Train the classifier
    print("\n🎓 Training the classifier...")
    classifier.train(training_data)
    
    # Test cases
    test_cases = [
        {
            'feedback_text': 'The food was absolutely delicious and my child loved every bite!',
            'rating': 5,
            'service_category': 'meal',
            'expected': 'positive'
        },
        {
            'feedback_text': 'Terrible service, staff was rude and unhelpful',
            'rating': 1,
            'service_category': 'staff',
            'expected': 'needs_improvement'
        },
        {
            'feedback_text': 'Activities are okay but could be more engaging',
            'rating': 3,
            'service_category': 'activity',
            'expected': 'needs_improvement'
        },
        {
            'feedback_text': 'Excellent communication, always kept informed about my child',
            'rating': 5,
            'service_category': 'communication',
            'expected': 'positive'
        },
        {
            'feedback_text': 'Facility is clean and safe, very impressed',
            'rating': 4,
            'service_category': 'facility',
            'expected': 'positive'
        },
        {
            'feedback_text': 'Safety concerns, not secure enough for children',
            'rating': 2,
            'service_category': 'safety',
            'expected': 'needs_improvement'
        },
        {
            'feedback_text': 'Wonderful experience, highly recommend to other parents',
            'rating': 5,
            'service_category': 'activity',
            'expected': 'positive'
        },
        {
            'feedback_text': 'Poor quality food, my child refuses to eat',
            'rating': 2,
            'service_category': 'meal',
            'expected': 'needs_improvement'
        }
    ]
    
    print("\n🧪 Testing classifier predictions:")
    print("=" * 50)
    
    correct_predictions = 0
    total_predictions = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        result = classifier.predict(
            test_case['feedback_text'],
            test_case['rating'],
            test_case['service_category']
        )
        
        predicted = result['predicted_class']
        expected = test_case['expected']
        confidence = result['confidence']
        is_correct = predicted == expected
        
        if is_correct:
            correct_predictions += 1
        
        status = "✅" if is_correct else "❌"
        
        print(f"\n{status} Test Case {i}:")
        print(f"   Feedback: {test_case['feedback_text']}")
        print(f"   Rating: {test_case['rating']} | Service: {test_case['service_category']}")
        print(f"   Expected: {expected} | Predicted: {predicted}")
        print(f"   Confidence: {confidence:.3f}")
        print(f"   Probabilities: Positive={result['probabilities']['positive']:.3f}, Needs Improvement={result['probabilities']['needs_improvement']:.3f}")
    
    # Calculate accuracy
    accuracy = (correct_predictions / total_predictions) * 100
    print(f"\n📈 Results:")
    print(f"   Correct Predictions: {correct_predictions}/{total_predictions}")
    print(f"   Accuracy: {accuracy:.1f}%")
    
    # Save the model
    model_path = 'feedback_bayesian_model.json'
    classifier.save_model(model_path)
    print(f"\n💾 Model saved to: {model_path}")
    
    # Test loading the model
    print("\n🔄 Testing model loading...")
    new_classifier = FeedbackBayesianClassifier()
    new_classifier.load_model(model_path)
    
    # Test with a new prediction
    test_result = new_classifier.predict(
        "Amazing staff, very professional and caring!",
        5,
        "staff"
    )
    print(f"   Loaded model prediction: {test_result['predicted_class']} (confidence: {test_result['confidence']:.3f})")
    
    print("\n🎉 Bayesian Classifier testing completed successfully!")
    return classifier

def test_api_integration():
    """Test the classifier for API integration"""
    print("\n🔌 Testing API Integration:")
    print("=" * 30)
    
    classifier = FeedbackBayesianClassifier()
    training_data = generate_sample_training_data()
    classifier.train(training_data)
    
    # Simulate API requests
    api_test_cases = [
        {
            "feedback_text": "Great service overall!",
            "rating": 4.5,
            "service_category": "meal"
        },
        {
            "feedback_text": "Needs improvement in communication",
            "rating": 2.5,
            "service_category": "communication"
        }
    ]
    
    for i, test_case in enumerate(api_test_cases, 1):
        result = classifier.predict(
            test_case["feedback_text"],
            test_case["rating"],
            test_case["service_category"]
        )
        
        print(f"\nAPI Test {i}:")
        print(f"Input: {test_case}")
        print(f"Output: {result}")
    
    return classifier

if __name__ == "__main__":
    try:
        # Test the classifier
        classifier = test_bayesian_classifier()
        
        # Test API integration
        test_api_integration()
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
