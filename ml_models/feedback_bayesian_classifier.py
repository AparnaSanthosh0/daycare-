import json
import re
import math
from collections import defaultdict, Counter
from typing import Dict, List, Tuple, Any
import numpy as np
from datetime import datetime

class FeedbackBayesianClassifier:
    """
    Bayesian Classifier for Parent Feedback Classification
    Categorizes feedback into 'Positive' or 'Needs Improvement'
    """
    
    def __init__(self):
        self.vocabulary = set()
        self.word_counts = {
            'positive': defaultdict(int),
            'needs_improvement': defaultdict(int)
        }
        self.category_counts = {
            'positive': defaultdict(int),
            'needs_improvement': defaultdict(int)
        }
        self.rating_counts = {
            'positive': defaultdict(int),
            'needs_improvement': defaultdict(int)
        }
        self.class_counts = {'positive': 0, 'needs_improvement': 0}
        self.total_documents = 0
        self.is_trained = False
        
        # Service categories
        self.service_categories = ['meal', 'activity', 'communication', 'staff', 'facility', 'safety']
        
        # Rating thresholds
        self.rating_threshold = 3.0  # Ratings >= 3 are generally positive
        
    def preprocess_text(self, text: str) -> List[str]:
        """Preprocess text for classification"""
        if not text:
            return []
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters and numbers, keep only letters and spaces
        text = re.sub(r'[^a-zA-Z\s]', ' ', text)
        
        # Split into words and remove empty strings
        words = [word.strip() for word in text.split() if word.strip()]
        
        # Remove very short words (less than 2 characters)
        words = [word for word in words if len(word) >= 2]
        
        return words
    
    def extract_features(self, feedback_text: str, rating: float, service_category: str) -> Dict[str, Any]:
        """Extract features from feedback data"""
        # Preprocess text
        words = self.preprocess_text(feedback_text)
        
        # Text features
        text_features = {
            'word_count': len(words),
            'avg_word_length': np.mean([len(word) for word in words]) if words else 0,
            'has_positive_words': any(word in self.positive_words for word in words),
            'has_negative_words': any(word in self.negative_words for word in words),
            'exclamation_count': feedback_text.count('!'),
            'question_count': feedback_text.count('?'),
            'caps_ratio': sum(1 for c in feedback_text if c.isupper()) / len(feedback_text) if feedback_text else 0
        }
        
        # Rating features
        rating_features = {
            'rating': rating,
            'is_high_rating': rating >= 4.0,
            'is_medium_rating': 2.0 <= rating < 4.0,
            'is_low_rating': rating < 2.0
        }
        
        # Service category features
        category_features = {
            'service_category': service_category.lower(),
            'is_meal_related': service_category.lower() in ['meal', 'food', 'nutrition'],
            'is_activity_related': service_category.lower() in ['activity', 'play', 'learning'],
            'is_communication_related': service_category.lower() in ['communication', 'staff', 'feedback']
        }
        
        return {
            'words': words,
            'text_features': text_features,
            'rating_features': rating_features,
            'category_features': category_features
        }
    
    def train(self, training_data: List[Dict[str, Any]]):
        """Train the Bayesian classifier"""
        print("Training Bayesian Classifier...")
        
        # Initialize positive and negative word lists
        self.positive_words = {
            'excellent', 'great', 'wonderful', 'amazing', 'fantastic', 'good', 'love', 'happy',
            'satisfied', 'pleased', 'outstanding', 'perfect', 'brilliant', 'superb', 'marvelous',
            'delicious', 'clean', 'friendly', 'helpful', 'professional', 'caring', 'attentive',
            'thank', 'appreciate', 'recommend', 'best', 'awesome', 'terrific', 'fabulous'
        }
        
        self.negative_words = {
            'bad', 'terrible', 'awful', 'horrible', 'disappointed', 'unhappy', 'angry', 'frustrated',
            'poor', 'worst', 'hate', 'disgusting', 'dirty', 'rude', 'unprofessional', 'careless',
            'slow', 'late', 'cold', 'tasteless', 'boring', 'unsafe', 'problem', 'issue', 'complaint',
            'unsatisfied', 'displeased', 'annoyed', 'upset', 'concerned', 'worried'
        }
        
        # Process training data
        for item in training_data:
            feedback_text = item.get('feedback_text', '')
            rating = item.get('rating', 0)
            service_category = item.get('service_category', '')
            label = item.get('label', '')
            
            if not label or label not in ['positive', 'needs_improvement']:
                continue
                
            # Extract features
            features = self.extract_features(feedback_text, rating, service_category)
            
            # Update vocabulary
            self.vocabulary.update(features['words'])
            
            # Update word counts
            for word in features['words']:
                self.word_counts[label][word] += 1
            
            # Update category counts
            self.category_counts[label][service_category.lower()] += 1
            
            # Update rating counts
            self.rating_counts[label][str(rating)] += 1
            
            # Update class counts
            self.class_counts[label] += 1
            self.total_documents += 1
        
        self.is_trained = True
        print(f"Training completed. Processed {self.total_documents} documents.")
        print(f"Vocabulary size: {len(self.vocabulary)}")
        print(f"Class distribution: {self.class_counts}")
    
    def calculate_word_probability(self, word: str, label: str, alpha: float = 1.0) -> float:
        """Calculate P(word|label) using Laplace smoothing"""
        word_count = self.word_counts[label][word]
        total_words_in_class = sum(self.word_counts[label].values())
        vocabulary_size = len(self.vocabulary)
        
        return (word_count + alpha) / (total_words_in_class + alpha * vocabulary_size)
    
    def calculate_category_probability(self, category: str, label: str) -> float:
        """Calculate P(category|label)"""
        category_count = self.category_counts[label][category.lower()]
        total_docs_in_class = self.class_counts[label]
        
        if total_docs_in_class == 0:
            return 0.0
        
        return category_count / total_docs_in_class
    
    def calculate_rating_probability(self, rating: float, label: str) -> float:
        """Calculate P(rating|label)"""
        rating_str = str(rating)
        rating_count = self.rating_counts[label][rating_str]
        total_docs_in_class = self.class_counts[label]
        
        if total_docs_in_class == 0:
            return 0.0
        
        return rating_count / total_docs_in_class
    
    def predict(self, feedback_text: str, rating: float, service_category: str) -> Dict[str, Any]:
        """Predict feedback category"""
        if not self.is_trained:
            raise ValueError("Classifier must be trained before making predictions")
        
        # Extract features
        features = self.extract_features(feedback_text, rating, service_category)
        words = features['words']
        
        # Calculate prior probabilities
        prior_positive = self.class_counts['positive'] / self.total_documents
        prior_needs_improvement = self.class_counts['needs_improvement'] / self.total_documents
        
        # Calculate likelihoods
        log_likelihood_positive = math.log(prior_positive)
        log_likelihood_needs_improvement = math.log(prior_needs_improvement)
        
        # Add word likelihoods
        for word in words:
            if word in self.vocabulary:
                word_prob_positive = self.calculate_word_probability(word, 'positive')
                word_prob_needs_improvement = self.calculate_word_probability(word, 'needs_improvement')
                
                if word_prob_positive > 0:
                    log_likelihood_positive += math.log(word_prob_positive)
                if word_prob_needs_improvement > 0:
                    log_likelihood_needs_improvement += math.log(word_prob_needs_improvement)
        
        # Add category likelihood
        category_prob_positive = self.calculate_category_probability(service_category, 'positive')
        category_prob_needs_improvement = self.calculate_category_probability(service_category, 'needs_improvement')
        
        if category_prob_positive > 0:
            log_likelihood_positive += math.log(category_prob_positive)
        if category_prob_needs_improvement > 0:
            log_likelihood_needs_improvement += math.log(category_prob_needs_improvement)
        
        # Add rating likelihood
        rating_prob_positive = self.calculate_rating_probability(rating, 'positive')
        rating_prob_needs_improvement = self.calculate_rating_probability(rating, 'needs_improvement')
        
        if rating_prob_positive > 0:
            log_likelihood_positive += math.log(rating_prob_positive)
        if rating_prob_needs_improvement > 0:
            log_likelihood_needs_improvement += math.log(rating_prob_needs_improvement)
        
        # Convert log-likelihoods to probabilities
        max_log_likelihood = max(log_likelihood_positive, log_likelihood_needs_improvement)
        
        prob_positive = math.exp(log_likelihood_positive - max_log_likelihood)
        prob_needs_improvement = math.exp(log_likelihood_needs_improvement - max_log_likelihood)
        
        # Normalize probabilities
        total_prob = prob_positive + prob_needs_improvement
        if total_prob > 0:
            prob_positive /= total_prob
            prob_needs_improvement /= total_prob
        
        # Determine prediction
        predicted_class = 'positive' if prob_positive > prob_needs_improvement else 'needs_improvement'
        confidence = max(prob_positive, prob_needs_improvement)
        
        return {
            'predicted_class': predicted_class,
            'confidence': confidence,
            'probabilities': {
                'positive': prob_positive,
                'needs_improvement': prob_needs_improvement
            },
            'features_used': {
                'word_count': len(words),
                'rating': rating,
                'service_category': service_category,
                'has_positive_words': features['text_features']['has_positive_words'],
                'has_negative_words': features['text_features']['has_negative_words']
            }
        }
    
    def save_model(self, filepath: str):
        """Save the trained model to a file"""
        model_data = {
            'vocabulary': list(self.vocabulary),
            'word_counts': dict(self.word_counts),
            'category_counts': dict(self.category_counts),
            'rating_counts': dict(self.rating_counts),
            'class_counts': self.class_counts,
            'total_documents': self.total_documents,
            'is_trained': self.is_trained,
            'positive_words': list(self.positive_words),
            'negative_words': list(self.negative_words),
            'service_categories': self.service_categories,
            'rating_threshold': self.rating_threshold,
            'saved_at': datetime.now().isoformat()
        }
        
        with open(filepath, 'w') as f:
            json.dump(model_data, f, indent=2)
        
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load a trained model from a file"""
        with open(filepath, 'r') as f:
            model_data = json.load(f)
        
        self.vocabulary = set(model_data['vocabulary'])
        self.word_counts = {
            'positive': defaultdict(int, model_data['word_counts']['positive']),
            'needs_improvement': defaultdict(int, model_data['word_counts']['needs_improvement'])
        }
        self.category_counts = {
            'positive': defaultdict(int, model_data['category_counts']['positive']),
            'needs_improvement': defaultdict(int, model_data['category_counts']['needs_improvement'])
        }
        self.rating_counts = {
            'positive': defaultdict(int, model_data['rating_counts']['positive']),
            'needs_improvement': defaultdict(int, model_data['rating_counts']['needs_improvement'])
        }
        self.class_counts = model_data['class_counts']
        self.total_documents = model_data['total_documents']
        self.is_trained = model_data['is_trained']
        self.positive_words = set(model_data['positive_words'])
        self.negative_words = set(model_data['negative_words'])
        self.service_categories = model_data['service_categories']
        self.rating_threshold = model_data['rating_threshold']
        
        print(f"Model loaded from {filepath}")
        print(f"Vocabulary size: {len(self.vocabulary)}")
        print(f"Class distribution: {self.class_counts}")


def generate_sample_training_data():
    """Generate sample training data for the Bayesian classifier"""
    return [
        # Positive feedback examples
        {'feedback_text': 'The food was excellent and my child loved it!', 'rating': 5, 'service_category': 'meal', 'label': 'positive'},
        {'feedback_text': 'Great activities, very engaging and fun', 'rating': 4, 'service_category': 'activity', 'label': 'positive'},
        {'feedback_text': 'Staff communication is wonderful, always helpful', 'rating': 5, 'service_category': 'communication', 'label': 'positive'},
        {'feedback_text': 'Amazing facility, clean and safe environment', 'rating': 5, 'service_category': 'facility', 'label': 'positive'},
        {'feedback_text': 'My child is very happy here, thank you!', 'rating': 4, 'service_category': 'activity', 'label': 'positive'},
        {'feedback_text': 'Delicious meals, well balanced nutrition', 'rating': 4, 'service_category': 'meal', 'label': 'positive'},
        {'feedback_text': 'Professional staff, caring and attentive', 'rating': 5, 'service_category': 'staff', 'label': 'positive'},
        {'feedback_text': 'Outstanding safety measures, very secure', 'rating': 5, 'service_category': 'safety', 'label': 'positive'},
        
        # Needs improvement feedback examples
        {'feedback_text': 'Food was cold and tasteless, very disappointed', 'rating': 2, 'service_category': 'meal', 'label': 'needs_improvement'},
        {'feedback_text': 'Activities are boring and not engaging', 'rating': 2, 'service_category': 'activity', 'label': 'needs_improvement'},
        {'feedback_text': 'Poor communication, staff never responds', 'rating': 1, 'service_category': 'communication', 'label': 'needs_improvement'},
        {'feedback_text': 'Facility is dirty and unsafe for children', 'rating': 1, 'service_category': 'facility', 'label': 'needs_improvement'},
        {'feedback_text': 'My child is unhappy and wants to leave', 'rating': 2, 'service_category': 'activity', 'label': 'needs_improvement'},
        {'feedback_text': 'Meals are unhealthy and poorly prepared', 'rating': 2, 'service_category': 'meal', 'label': 'needs_improvement'},
        {'feedback_text': 'Staff is rude and unprofessional', 'rating': 1, 'service_category': 'staff', 'label': 'needs_improvement'},
        {'feedback_text': 'Safety concerns, not secure enough', 'rating': 2, 'service_category': 'safety', 'label': 'needs_improvement'},
        
        # Mixed examples
        {'feedback_text': 'Good overall but could be better', 'rating': 3, 'service_category': 'meal', 'label': 'needs_improvement'},
        {'feedback_text': 'Satisfactory service, room for improvement', 'rating': 3, 'service_category': 'activity', 'label': 'needs_improvement'},
        {'feedback_text': 'Average communication, needs more updates', 'rating': 3, 'service_category': 'communication', 'label': 'needs_improvement'},
        {'feedback_text': 'Pretty good facility but some issues', 'rating': 3, 'service_category': 'facility', 'label': 'needs_improvement'},
        
        # More positive examples
        {'feedback_text': 'Fantastic experience, highly recommend!', 'rating': 5, 'service_category': 'activity', 'label': 'positive'},
        {'feedback_text': 'Wonderful staff, very caring and professional', 'rating': 5, 'service_category': 'staff', 'label': 'positive'},
        {'feedback_text': 'Excellent safety protocols, very secure', 'rating': 5, 'service_category': 'safety', 'label': 'positive'},
        {'feedback_text': 'Great communication, always informed', 'rating': 4, 'service_category': 'communication', 'label': 'positive'},
        {'feedback_text': 'Delicious and healthy meals every day', 'rating': 4, 'service_category': 'meal', 'label': 'positive'},
        {'feedback_text': 'Amazing activities, my child loves coming here', 'rating': 5, 'service_category': 'activity', 'label': 'positive'},
        {'feedback_text': 'Clean and modern facility, very impressed', 'rating': 4, 'service_category': 'facility', 'label': 'positive'},
        {'feedback_text': 'Outstanding service, thank you so much!', 'rating': 5, 'service_category': 'staff', 'label': 'positive'},
        
        # More needs improvement examples
        {'feedback_text': 'Terrible food quality, my child refuses to eat', 'rating': 1, 'service_category': 'meal', 'label': 'needs_improvement'},
        {'feedback_text': 'Activities are not age-appropriate', 'rating': 2, 'service_category': 'activity', 'label': 'needs_improvement'},
        {'feedback_text': 'No communication from staff, very frustrating', 'rating': 1, 'service_category': 'communication', 'label': 'needs_improvement'},
        {'feedback_text': 'Facility needs major improvements', 'rating': 2, 'service_category': 'facility', 'label': 'needs_improvement'},
        {'feedback_text': 'Safety issues that need immediate attention', 'rating': 1, 'service_category': 'safety', 'label': 'needs_improvement'},
        {'feedback_text': 'Staff is not helpful and seems disinterested', 'rating': 2, 'service_category': 'staff', 'label': 'needs_improvement'},
    ]


if __name__ == "__main__":
    # Create and train the classifier
    classifier = FeedbackBayesianClassifier()
    
    # Generate sample training data
    training_data = generate_sample_training_data()
    
    # Train the classifier
    classifier.train(training_data)
    
    # Test the classifier
    test_cases = [
        {'feedback_text': 'The food was amazing and my child loved it!', 'rating': 5, 'service_category': 'meal'},
        {'feedback_text': 'Poor service, very disappointed', 'rating': 2, 'service_category': 'staff'},
        {'feedback_text': 'Good activities but could be better', 'rating': 3, 'service_category': 'activity'},
        {'feedback_text': 'Excellent communication, always informed', 'rating': 5, 'service_category': 'communication'},
        {'feedback_text': 'Facility is dirty and unsafe', 'rating': 1, 'service_category': 'facility'},
    ]
    
    print("\nTesting the classifier:")
    print("=" * 50)
    
    for i, test_case in enumerate(test_cases, 1):
        result = classifier.predict(
            test_case['feedback_text'],
            test_case['rating'],
            test_case['service_category']
        )
        
        print(f"\nTest Case {i}:")
        print(f"Feedback: {test_case['feedback_text']}")
        print(f"Rating: {test_case['rating']}")
        print(f"Service: {test_case['service_category']}")
        print(f"Prediction: {result['predicted_class']}")
        print(f"Confidence: {result['confidence']:.3f}")
        print(f"Probabilities: {result['probabilities']}")
    
    # Save the model
    classifier.save_model('feedback_bayesian_model.json')
    print("\nModel training and testing completed!")
