#!/usr/bin/env python3
"""
Test script for Child Grouping KNN Recommendation System
This script demonstrates the functionality of the ML-based child grouping system.
"""

import sys
import os
import json
from datetime import datetime, date, timedelta
import random

# Add the ml_models directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'ml_models'))

from child_grouping_knn import ChildGroupingKNN, create_sample_data

def create_extended_sample_data():
    """Create a more comprehensive sample dataset for testing."""
    base_date = date(2020, 1, 1)
    
    sample_children = [
        {
            '_id': 'child_1',
            'firstName': 'Emma',
            'lastName': 'Johnson',
            'dateOfBirth': '2020-03-15',
            'gender': 'female',
            'program': 'preschool',
            'interests': ['arts_crafts', 'reading', 'music', 'drawing', 'storytelling']
        },
        {
            '_id': 'child_2',
            'firstName': 'Liam',
            'lastName': 'Smith',
            'dateOfBirth': '2020-05-22',
            'gender': 'male',
            'program': 'preschool',
            'interests': ['building_blocks', 'outdoor_play', 'sports', 'running', 'technology']
        },
        {
            '_id': 'child_3',
            'firstName': 'Sophia',
            'lastName': 'Brown',
            'dateOfBirth': '2020-01-10',
            'gender': 'female',
            'program': 'preschool',
            'interests': ['arts_crafts', 'music', 'dancing', 'singing', 'pretend_play']
        },
        {
            '_id': 'child_4',
            'firstName': 'Noah',
            'lastName': 'Davis',
            'dateOfBirth': '2020-07-08',
            'gender': 'male',
            'program': 'preschool',
            'interests': ['building_blocks', 'puzzles', 'science', 'technology', 'board_games']
        },
        {
            '_id': 'child_5',
            'firstName': 'Olivia',
            'lastName': 'Wilson',
            'dateOfBirth': '2020-04-30',
            'gender': 'female',
            'program': 'preschool',
            'interests': ['reading', 'storytelling', 'pretend_play', 'animals', 'cooking']
        },
        {
            '_id': 'child_6',
            'firstName': 'William',
            'lastName': 'Miller',
            'dateOfBirth': '2020-06-12',
            'gender': 'male',
            'program': 'preschool',
            'interests': ['outdoor_play', 'sports', 'running', 'swimming', 'gardening']
        },
        {
            '_id': 'child_7',
            'firstName': 'Ava',
            'lastName': 'Garcia',
            'dateOfBirth': '2020-02-28',
            'gender': 'female',
            'program': 'preschool',
            'interests': ['arts_crafts', 'music', 'dancing', 'drawing', 'singing']
        },
        {
            '_id': 'child_8',
            'firstName': 'James',
            'lastName': 'Martinez',
            'dateOfBirth': '2020-08-15',
            'gender': 'male',
            'program': 'preschool',
            'interests': ['building_blocks', 'puzzles', 'science', 'technology', 'outdoor_play']
        },
        {
            '_id': 'child_9',
            'firstName': 'Isabella',
            'lastName': 'Anderson',
            'dateOfBirth': '2020-09-03',
            'gender': 'female',
            'program': 'preschool',
            'interests': ['reading', 'storytelling', 'pretend_play', 'animals', 'cooking']
        },
        {
            '_id': 'child_10',
            'firstName': 'Benjamin',
            'lastName': 'Taylor',
            'dateOfBirth': '2020-10-20',
            'gender': 'male',
            'program': 'preschool',
            'interests': ['outdoor_play', 'sports', 'running', 'swimming', 'building_blocks']
        }
    ]
    
    return sample_children

def test_basic_recommendations():
    """Test basic recommendation functionality."""
    print("=" * 60)
    print("TESTING BASIC CHILD GROUPING RECOMMENDATIONS")
    print("=" * 60)
    
    # Create and train model
    knn_model = ChildGroupingKNN(k_neighbors=3, min_group_size=2, max_group_size=4)
    sample_data = create_extended_sample_data()
    knn_model.fit(sample_data)
    
    # Test recommendations for different children
    test_children = ['child_1', 'child_2', 'child_5']
    
    for child_id in test_children:
        target_child = next(child for child in sample_data if child['_id'] == child_id)
        print(f"\n🎯 RECOMMENDATIONS FOR {target_child['firstName']} {target_child['lastName']}")
        print(f"Age: {knn_model.calculate_age_in_months(target_child['dateOfBirth']):.1f} months")
        print(f"Interests: {', '.join(target_child['interests'])}")
        print("-" * 50)
        
        recommendations = knn_model.get_recommendations(target_child)
        
        print("👥 INDIVIDUAL PARTNERS:")
        for i, partner in enumerate(recommendations['individual_partners'], 1):
            print(f"  {i}. {partner['name']} (Similarity: {partner['similarity_score']:.3f})")
            print(f"     Age: {partner['age_months']:.1f} months, Interests: {', '.join(partner['interests'])}")
        
        print("\n🏘️  RECOMMENDED GROUPS:")
        for group in recommendations['recommended_groups']:
            print(f"  Group {group['group_id']}: {group['group_size']} members")
            print(f"    Average Similarity: {group['average_similarity']:.3f}")
            print(f"    Common Interests: {', '.join(group['common_interests'])}")
            print(f"    Members: {', '.join([member['name'] for member in group['members']])}")
        
        print("\n" + "=" * 50)

def test_activity_specific_recommendations():
    """Test activity-specific recommendations."""
    print("\n" + "=" * 60)
    print("TESTING ACTIVITY-SPECIFIC RECOMMENDATIONS")
    print("=" * 60)
    
    knn_model = ChildGroupingKNN(k_neighbors=3, min_group_size=2, max_group_size=4)
    sample_data = create_extended_sample_data()
    knn_model.fit(sample_data)
    
    # Test different activity types
    activity_types = ['arts_crafts', 'building_blocks', 'outdoor_play', 'music']
    target_child = sample_data[0]  # Emma
    
    print(f"🎯 ACTIVITY PARTNERS FOR {target_child['firstName']} {target_child['lastName']}")
    print(f"Current Interests: {', '.join(target_child['interests'])}")
    print("-" * 50)
    
    for activity_type in activity_types:
        print(f"\n🎨 ACTIVITY: {activity_type.replace('_', ' ').title()}")
        recommendations = knn_model.get_activity_recommendations(target_child, activity_type)
        
        if recommendations['activity_specific_partners']:
            print(f"Found {len(recommendations['activity_specific_partners'])} children interested in {activity_type}:")
            for partner in recommendations['activity_specific_partners']:
                print(f"  • {partner['name']} (Similarity: {partner['similarity_score']:.3f})")
                print(f"    Age: {partner['age_months']:.1f} months")
        else:
            print(f"No children found with interest in {activity_type}")

def test_model_persistence():
    """Test model saving and loading."""
    print("\n" + "=" * 60)
    print("TESTING MODEL PERSISTENCE")
    print("=" * 60)
    
    # Create and train model
    knn_model = ChildGroupingKNN(k_neighbors=4, min_group_size=3, max_group_size=5)
    sample_data = create_extended_sample_data()
    knn_model.fit(sample_data)
    
    # Save model
    model_path = 'test_model.json'
    knn_model.save_model(model_path)
    print(f"✅ Model saved to {model_path}")
    
    # Create new model and load
    new_knn_model = ChildGroupingKNN()
    new_knn_model.load_model(model_path)
    print("✅ Model loaded successfully")
    
    # Test that loaded model works
    target_child = sample_data[0]
    recommendations = new_knn_model.get_recommendations(target_child)
    print(f"✅ Loaded model generated {len(recommendations['individual_partners'])} partner recommendations")
    
    # Clean up
    os.remove(model_path)
    print("✅ Test file cleaned up")

def test_edge_cases():
    """Test edge cases and error handling."""
    print("\n" + "=" * 60)
    print("TESTING EDGE CASES")
    print("=" * 60)
    
    # Test with minimal data
    print("🧪 Testing with minimal dataset...")
    minimal_data = create_extended_sample_data()[:3]
    knn_model = ChildGroupingKNN(k_neighbors=2, min_group_size=2, max_group_size=3)
    knn_model.fit(minimal_data)
    
    target_child = minimal_data[0]
    recommendations = knn_model.get_recommendations(target_child)
    print(f"✅ Minimal dataset: Generated {len(recommendations['individual_partners'])} recommendations")
    
    # Test with child having no interests
    print("\n🧪 Testing with child having no interests...")
    child_no_interests = {
        '_id': 'child_no_interests',
        'firstName': 'Test',
        'lastName': 'Child',
        'dateOfBirth': '2020-06-01',
        'gender': 'male',
        'program': 'preschool',
        'interests': []
    }
    
    recommendations = knn_model.get_recommendations(child_no_interests)
    print(f"✅ Child with no interests: Generated {len(recommendations['individual_partners'])} recommendations")
    
    # Test with very large k value
    print("\n🧪 Testing with large k value...")
    large_k_model = ChildGroupingKNN(k_neighbors=10, min_group_size=2, max_group_size=4)
    large_k_model.fit(minimal_data)
    recommendations = large_k_model.get_recommendations(target_child)
    print(f"✅ Large k value: Generated {len(recommendations['individual_partners'])} recommendations")

def generate_sample_mongodb_data():
    """Generate sample data in MongoDB format for testing."""
    print("\n" + "=" * 60)
    print("GENERATING SAMPLE MONGODB DATA")
    print("=" * 60)
    
    sample_data = create_extended_sample_data()
    
    # Convert to MongoDB format
    mongodb_data = []
    for child in sample_data:
        mongodb_child = {
            "_id": {"$oid": child['_id']},
            "firstName": child['firstName'],
            "lastName": child['lastName'],
            "dateOfBirth": {"$date": child['dateOfBirth']},
            "gender": child['gender'],
            "program": child['program'],
            "interests": child['interests'],
            "activityPreferences": [
                {
                    "activityType": random.choice(child['interests']),
                    "preferenceLevel": random.randint(3, 5),
                    "lastEngaged": {"$date": datetime.now().isoformat()}
                }
                for _ in range(random.randint(1, 3))
            ],
            "socialPreferences": {
                "groupSize": random.choice(['small', 'medium', 'large']),
                "interactionStyle": random.choice(['quiet', 'active', 'mixed']),
                "leadershipTendency": random.choice(['follower', 'leader', 'neutral'])
            },
            "isActive": True,
            "createdAt": {"$date": datetime.now().isoformat()},
            "updatedAt": {"$date": datetime.now().isoformat()}
        }
        mongodb_data.append(mongodb_child)
    
    # Save to file
    output_file = 'sample_mongodb_data.json'
    with open(output_file, 'w') as f:
        json.dump(mongodb_data, f, indent=2, default=str)
    
    print(f"✅ Generated {len(mongodb_data)} sample children records")
    print(f"✅ Saved to {output_file}")
    
    return mongodb_data

def main():
    """Run all tests."""
    print("🚀 CHILD GROUPING KNN RECOMMENDATION SYSTEM - TEST SUITE")
    print("=" * 60)
    
    try:
        # Run all tests
        test_basic_recommendations()
        test_activity_specific_recommendations()
        test_model_persistence()
        test_edge_cases()
        generate_sample_mongodb_data()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        
        print("\n📋 SUMMARY:")
        print("• Basic recommendations: ✅ Working")
        print("• Activity-specific recommendations: ✅ Working")
        print("• Model persistence: ✅ Working")
        print("• Edge case handling: ✅ Working")
        print("• Sample data generation: ✅ Working")
        
        print("\n🎯 NEXT STEPS:")
        print("1. Install Python dependencies: pip install -r ml_models/requirements.txt")
        print("2. Run the test script: python ml_models/test_knn_system.py")
        print("3. Start the Node.js server to test API endpoints")
        print("4. Use the frontend components to display recommendations")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
