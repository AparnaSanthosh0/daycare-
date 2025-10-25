"""
K-Nearest Neighbors (KNN) Child Grouping Recommendation System
for TinyTots Daycare Management System

This module implements a machine learning algorithm to recommend optimal
child groups and activity partners based on age and interests.
"""

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime, date
import json
import os
from typing import List, Dict, Tuple, Optional


class ChildGroupingKNN:
    """
    K-Nearest Neighbors implementation for child grouping recommendations.
    
    Features:
    - Age-based similarity
    - Interest-based matching
    - Activity preference alignment
    - Developmental stage consideration
    """
    
    def __init__(self, k_neighbors: int = 3, min_group_size: int = 2, max_group_size: int = 6):
        """
        Initialize the KNN model for child grouping.
        
        Args:
            k_neighbors: Number of nearest neighbors to consider
            min_group_size: Minimum children in a recommended group
            max_group_size: Maximum children in a recommended group
        """
        self.k_neighbors = k_neighbors
        self.min_group_size = min_group_size
        self.max_group_size = max_group_size
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.model = None
        self.children_data = None
        self.feature_columns = []
        
        # Define interest categories
        self.interest_categories = [
            'arts_crafts', 'music', 'dancing', 'reading', 'outdoor_play',
            'building_blocks', 'puzzles', 'sports', 'cooking', 'science',
            'storytelling', 'drawing', 'singing', 'running', 'swimming',
            'board_games', 'pretend_play', 'gardening', 'animals', 'technology'
        ]
        
        # Age groups for developmental considerations
        self.age_groups = {
            'infant': (0, 1),
            'toddler': (1, 3),
            'preschool': (3, 5),
            'prekindergarten': (4, 6)
        }
    
    def calculate_age_in_months(self, birth_date: str) -> float:
        """Calculate age in months from birth date."""
        try:
            birth = datetime.strptime(birth_date, '%Y-%m-%d').date()
            today = date.today()
            age_in_months = (today.year - birth.year) * 12 + (today.month - birth.month)
            if today.day < birth.day:
                age_in_months -= 1
            return age_in_months
        except:
            return 0
    
    def encode_interests(self, interests: List[str]) -> np.ndarray:
        """Convert interest list to binary feature vector."""
        interest_vector = np.zeros(len(self.interest_categories))
        for interest in interests:
            if interest in self.interest_categories:
                idx = self.interest_categories.index(interest)
                interest_vector[idx] = 1
        return interest_vector
    
    def prepare_features(self, children_data: List[Dict]) -> np.ndarray:
        """
        Prepare feature matrix from children data.
        
        Features:
        1. Age in months (normalized)
        2. Interest vectors (binary encoding)
        3. Program type (encoded)
        4. Gender (encoded)
        """
        features = []
        
        for child in children_data:
            feature_vector = []
            
            # Age feature (in months)
            age_months = self.calculate_age_in_months(child.get('dateOfBirth', ''))
            feature_vector.append(age_months)
            
            # Interest features (binary vector)
            interests = child.get('interests', [])
            interest_vector = self.encode_interests(interests)
            feature_vector.extend(interest_vector)
            
            # Program type (encoded)
            program = child.get('program', 'infant')
            program_encoding = {
                'infant': 0, 'toddler': 1, 'preschool': 2, 'prekindergarten': 3
            }
            feature_vector.append(program_encoding.get(program, 0))
            
            # Gender (encoded)
            gender = child.get('gender', 'male')
            gender_encoding = {'male': 0, 'female': 1}
            feature_vector.append(gender_encoding.get(gender, 0))
            
            features.append(feature_vector)
        
        return np.array(features)
    
    def fit(self, children_data: List[Dict]) -> None:
        """
        Train the KNN model on children data.
        
        Args:
            children_data: List of child dictionaries with required fields
        """
        self.children_data = children_data
        
        # Prepare feature matrix
        X = self.prepare_features(children_data)
        
        # Store feature column names for reference
        self.feature_columns = ['age_months'] + self.interest_categories + ['program', 'gender']
        
        # Normalize features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train KNN model
        self.model = NearestNeighbors(
            n_neighbors=min(self.k_neighbors + 1, len(children_data)),
            metric='cosine',
            algorithm='auto'
        )
        self.model.fit(X_scaled)
        
        print(f"KNN model trained on {len(children_data)} children")
    
    def get_recommendations(self, target_child: Dict, exclude_child_ids: List[str] = None) -> Dict:
        """
        Get grouping recommendations for a target child.
        
        Args:
            target_child: Child dictionary to find recommendations for
            exclude_child_ids: List of child IDs to exclude from recommendations
            
        Returns:
            Dictionary containing recommended groups and individual partners
        """
        if self.model is None:
            raise ValueError("Model must be fitted before making predictions")
        
        exclude_child_ids = exclude_child_ids or []
        
        # Prepare target child features
        target_features = self.prepare_features([target_child])
        target_scaled = self.scaler.transform(target_features)
        
        # Find nearest neighbors
        distances, indices = self.model.kneighbors(target_scaled)
        
        recommendations = {
            'target_child': {
                'id': target_child.get('_id', 'unknown'),
                'name': f"{target_child.get('firstName', '')} {target_child.get('lastName', '')}",
                'age_months': self.calculate_age_in_months(target_child.get('dateOfBirth', '')),
                'interests': target_child.get('interests', []),
                'program': target_child.get('program', 'infant')
            },
            'recommended_groups': [],
            'individual_partners': [],
            'similarity_scores': []
        }
        
        # Process neighbors
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if i == 0:  # Skip self
                continue
                
            neighbor_child = self.children_data[idx]
            neighbor_id = str(neighbor_child.get('_id', f'child_{idx}'))
            
            # Skip excluded children
            if neighbor_id in exclude_child_ids:
                continue
            
            similarity_score = 1 - distance  # Convert distance to similarity
            
            partner_info = {
                'id': neighbor_id,
                'name': f"{neighbor_child.get('firstName', '')} {neighbor_child.get('lastName', '')}",
                'age_months': self.calculate_age_in_months(neighbor_child.get('dateOfBirth', '')),
                'interests': neighbor_child.get('interests', []),
                'program': neighbor_child.get('program', 'infant'),
                'similarity_score': round(similarity_score, 3),
                'age_difference_months': abs(
                    self.calculate_age_in_months(target_child.get('dateOfBirth', '')) -
                    self.calculate_age_in_months(neighbor_child.get('dateOfBirth', ''))
                )
            }
            
            recommendations['individual_partners'].append(partner_info)
            recommendations['similarity_scores'].append(similarity_score)
        
        # Create recommended groups
        recommendations['recommended_groups'] = self._create_groups(
            recommendations['individual_partners']
        )
        
        return recommendations
    
    def _create_groups(self, partners: List[Dict]) -> List[Dict]:
        """Create optimal groups from individual partners."""
        if len(partners) < self.min_group_size:
            return []
        
        groups = []
        
        # Sort partners by similarity score
        sorted_partners = sorted(partners, key=lambda x: x['similarity_score'], reverse=True)
        
        # Create groups of optimal size
        for i in range(0, len(sorted_partners), self.max_group_size):
            group = sorted_partners[i:i + self.max_group_size]
            if len(group) >= self.min_group_size:
                group_info = {
                    'group_id': f"group_{len(groups) + 1}",
                    'members': group,
                    'average_similarity': round(
                        sum(member['similarity_score'] for member in group) / len(group), 3
                    ),
                    'age_range_months': {
                        'min': min(member['age_months'] for member in group),
                        'max': max(member['age_months'] for member in group)
                    },
                    'common_interests': self._find_common_interests(group),
                    'group_size': len(group)
                }
                groups.append(group_info)
        
        return groups
    
    def _find_common_interests(self, group: List[Dict]) -> List[str]:
        """Find common interests among group members."""
        if not group:
            return []
        
        # Get all interests from group members
        all_interests = []
        for member in group:
            all_interests.extend(member.get('interests', []))
        
        # Count interest frequency
        interest_counts = {}
        for interest in all_interests:
            interest_counts[interest] = interest_counts.get(interest, 0) + 1
        
        # Return interests shared by at least 2 members
        common_interests = [
            interest for interest, count in interest_counts.items()
            if count >= 2
        ]
        
        return sorted(common_interests)
    
    def get_activity_recommendations(self, target_child: Dict, activity_type: str = None) -> Dict:
        """
        Get activity-specific recommendations based on interests.
        
        Args:
            target_child: Child to find activity partners for
            activity_type: Specific activity type to match on
            
        Returns:
            Dictionary with activity-specific partner recommendations
        """
        recommendations = self.get_recommendations(target_child)
        
        if activity_type:
            # Filter partners based on specific activity interest
            activity_partners = [
                partner for partner in recommendations['individual_partners']
                if activity_type in partner.get('interests', [])
            ]
            
            recommendations['activity_specific_partners'] = activity_partners
            recommendations['activity_type'] = activity_type
        
        return recommendations
    
    def save_model(self, filepath: str) -> None:
        """Save the trained model to file."""
        model_data = {
            'k_neighbors': self.k_neighbors,
            'min_group_size': self.min_group_size,
            'max_group_size': self.max_group_size,
            'feature_columns': self.feature_columns,
            'interest_categories': self.interest_categories,
            'age_groups': self.age_groups,
            'scaler_mean': self.scaler.mean_.tolist(),
            'scaler_scale': self.scaler.scale_.tolist(),
            'children_data': self.children_data
        }
        
        with open(filepath, 'w') as f:
            json.dump(model_data, f, indent=2, default=str)
        
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str) -> None:
        """Load a trained model from file."""
        with open(filepath, 'r') as f:
            model_data = json.load(f)
        
        self.k_neighbors = model_data['k_neighbors']
        self.min_group_size = model_data['min_group_size']
        self.max_group_size = model_data['max_group_size']
        self.feature_columns = model_data['feature_columns']
        self.interest_categories = model_data['interest_categories']
        self.age_groups = model_data['age_groups']
        self.children_data = model_data['children_data']
        
        # Reconstruct scaler
        self.scaler.mean_ = np.array(model_data['scaler_mean'])
        self.scaler.scale_ = np.array(model_data['scaler_scale'])
        
        # Retrain model
        X = self.prepare_features(self.children_data)
        X_scaled = self.scaler.transform(X)
        
        self.model = NearestNeighbors(
            n_neighbors=min(self.k_neighbors + 1, len(self.children_data)),
            metric='cosine',
            algorithm='auto'
        )
        self.model.fit(X_scaled)
        
        print(f"Model loaded from {filepath}")


def create_sample_data() -> List[Dict]:
    """Create sample children data for testing."""
    sample_children = [
        {
            '_id': 'child_1',
            'firstName': 'Emma',
            'lastName': 'Johnson',
            'dateOfBirth': '2020-03-15',
            'gender': 'female',
            'program': 'preschool',
            'interests': ['arts_crafts', 'reading', 'music', 'drawing']
        },
        {
            '_id': 'child_2',
            'firstName': 'Liam',
            'lastName': 'Smith',
            'dateOfBirth': '2020-05-22',
            'gender': 'male',
            'program': 'preschool',
            'interests': ['building_blocks', 'outdoor_play', 'sports', 'running']
        },
        {
            '_id': 'child_3',
            'firstName': 'Sophia',
            'lastName': 'Brown',
            'dateOfBirth': '2020-01-10',
            'gender': 'female',
            'program': 'preschool',
            'interests': ['arts_crafts', 'music', 'dancing', 'singing']
        },
        {
            '_id': 'child_4',
            'firstName': 'Noah',
            'lastName': 'Davis',
            'dateOfBirth': '2020-07-08',
            'gender': 'male',
            'program': 'preschool',
            'interests': ['building_blocks', 'puzzles', 'science', 'technology']
        },
        {
            '_id': 'child_5',
            'firstName': 'Olivia',
            'lastName': 'Wilson',
            'dateOfBirth': '2020-04-30',
            'gender': 'female',
            'program': 'preschool',
            'interests': ['reading', 'storytelling', 'pretend_play', 'animals']
        },
        {
            '_id': 'child_6',
            'firstName': 'William',
            'lastName': 'Miller',
            'dateOfBirth': '2020-06-12',
            'gender': 'male',
            'program': 'preschool',
            'interests': ['outdoor_play', 'sports', 'running', 'swimming']
        }
    ]
    return sample_children


if __name__ == "__main__":
    # Example usage
    print("Initializing Child Grouping KNN System...")
    
    # Create and train model
    knn_model = ChildGroupingKNN(k_neighbors=3, min_group_size=2, max_group_size=4)
    sample_data = create_sample_data()
    knn_model.fit(sample_data)
    
    # Test recommendations
    target_child = sample_data[0]  # Emma
    recommendations = knn_model.get_recommendations(target_child)
    
    print(f"\nRecommendations for {recommendations['target_child']['name']}:")
    print(f"Age: {recommendations['target_child']['age_months']} months")
    print(f"Interests: {recommendations['target_child']['interests']}")
    
    print(f"\nIndividual Partners:")
    for partner in recommendations['individual_partners']:
        print(f"- {partner['name']} (Similarity: {partner['similarity_score']}, Age: {partner['age_months']} months)")
    
    print(f"\nRecommended Groups:")
    for group in recommendations['recommended_groups']:
        print(f"Group {group['group_id']}: {group['group_size']} members")
        print(f"  Average Similarity: {group['average_similarity']}")
        print(f"  Common Interests: {group['common_interests']}")
        print(f"  Members: {[member['name'] for member in group['members']]}")
    
    # Save model
    knn_model.save_model('ml_models/child_grouping_model.json')
