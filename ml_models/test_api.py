#!/usr/bin/env python3
"""
Test script for the feedback classification API
"""

import json
from feedback_classification_api import classify_feedback, batch_classify, get_model_stats

def test_classification():
    """Test single feedback classification"""
    print("Testing single feedback classification...")
    
    test_data = {
        "feedback_text": "The food was excellent and my child loved it!",
        "rating": 5,
        "service_category": "meal"
    }
    
    result = classify_feedback(
        test_data["feedback_text"],
        test_data["rating"],
        test_data["service_category"]
    )
    
    print(f"Input: {test_data}")
    print(f"Result: {json.dumps(result, indent=2)}")
    return result

def test_batch_classification():
    """Test batch feedback classification"""
    print("\nTesting batch feedback classification...")
    
    test_entries = [
        {
            "feedback_text": "Great service overall!",
            "rating": 4.5,
            "service_category": "meal"
        },
        {
            "feedback_text": "Needs improvement in communication",
            "rating": 2.5,
            "service_category": "communication"
        },
        {
            "feedback_text": "Amazing activities, my child loves it!",
            "rating": 5,
            "service_category": "activity"
        }
    ]
    
    result = batch_classify(test_entries)
    
    print(f"Input: {len(test_entries)} entries")
    print(f"Result: {json.dumps(result, indent=2)}")
    return result

def test_model_stats():
    """Test model statistics"""
    print("\nTesting model statistics...")
    
    result = get_model_stats()
    
    print(f"Stats: {json.dumps(result, indent=2)}")
    return result

if __name__ == "__main__":
    try:
        # Test single classification
        test_classification()
        
        # Test batch classification
        test_batch_classification()
        
        # Test model stats
        test_model_stats()
        
        print("\n✅ All tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
