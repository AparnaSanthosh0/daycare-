# Child Grouping Recommendation System - K-Nearest Neighbors (KNN)

This implementation provides an intelligent child grouping recommendation system for TinyTots Daycare Management System using the K-Nearest Neighbors (KNN) machine learning algorithm.

## 🎯 Features

- **Age-based Similarity**: Matches children with similar developmental stages
- **Interest-based Matching**: Groups children with compatible activity preferences
- **Activity-specific Recommendations**: Find partners for specific activities
- **Group Formation**: Automatically creates optimal group sizes (2-6 children)
- **Real-time Updates**: Dynamic recommendations based on current child data
- **Configurable Parameters**: Adjustable K values, group sizes, and similarity thresholds

## 🏗️ Architecture

### Backend Components

1. **ML Model** (`ml_models/child_grouping_knn.py`)
   - Core KNN algorithm implementation
   - Feature engineering for age and interests
   - Similarity calculations and group formation

2. **API Endpoints** (`server/routes/recommendations.js`)
   - `/api/recommendations/child/:childId` - Get grouping recommendations
   - `/api/recommendations/activity/:childId` - Activity-specific partners
   - `/api/recommendations/update-interests/:childId` - Update child interests
   - `/api/recommendations/available-interests` - Get interest categories
   - `/api/recommendations/stats` - System statistics

3. **Database Schema** (`server/models/Child.js`)
   - Extended with interests, activity preferences, and social preferences
   - Interest categories and preference levels
   - Social interaction preferences

### Frontend Components

1. **ChildRecommendations** (`client/src/components/ChildRecommendations.jsx`)
   - Display grouping recommendations
   - Activity-specific partner search
   - Configurable recommendation parameters

2. **ChildInterestsManager** (`client/src/components/ChildInterestsManager.jsx`)
   - Manage child interests and preferences
   - Category-based interest selection
   - Activity preference tracking

## 🚀 Setup Instructions

### 1. Install Python Dependencies

```bash
cd ml_models
pip install -r requirements.txt
```

### 2. Test the ML System

```bash
python test_knn_system.py
```

This will run comprehensive tests including:
- Basic recommendation functionality
- Activity-specific recommendations
- Model persistence
- Edge case handling
- Sample data generation

### 3. Start the Node.js Server

```bash
# From the project root
npm install
npm start
```

### 4. Test API Endpoints

```bash
# Get recommendations for a child
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/recommendations/child/CHILD_ID"

# Get activity-specific recommendations
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/recommendations/activity/CHILD_ID?activityType=arts_crafts"

# Update child interests
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"interests": ["arts_crafts", "music", "reading"]}' \
     "http://localhost:5000/api/recommendations/update-interests/CHILD_ID"
```

## 📊 How It Works

### Feature Engineering

The system creates feature vectors for each child including:

1. **Age Features**
   - Age in months (normalized)
   - Developmental stage consideration

2. **Interest Features**
   - Binary encoding of 20 interest categories
   - Weighted by activity engagement

3. **Social Features**
   - Program type (infant, toddler, preschool, prekindergarten)
   - Gender (for balanced groups)
   - Social preferences

### Similarity Calculation

The KNN algorithm uses cosine similarity to find the most similar children:

```python
similarity = (age_similarity * 0.4) + (interest_similarity * 0.4) + (program_similarity * 0.2)
```

### Group Formation

Groups are formed based on:
- **Similarity Threshold**: Minimum similarity score
- **Group Size**: Configurable min/max sizes (default: 2-6)
- **Common Interests**: Activities shared by group members
- **Age Range**: Maximum age difference within groups

## 🎨 Interest Categories

The system supports 20 interest categories organized into 5 groups:

### Creative Arts
- Arts & Crafts, Music, Dancing, Drawing, Singing, Storytelling

### Physical Activities
- Outdoor Play, Sports, Running, Swimming

### Cognitive Skills
- Reading, Puzzles, Science, Board Games, Technology

### Social Interaction
- Pretend Play, Cooking, Gardening, Animals

### Building & Construction
- Building Blocks

## 📈 Usage Examples

### Basic Recommendations

```javascript
// Get recommendations for Emma
const recommendations = await fetch('/api/recommendations/child/child_1');
const data = await recommendations.json();

console.log('Individual Partners:', data.individualPartners);
console.log('Recommended Groups:', data.recommendedGroups);
```

### Activity-Specific Partners

```javascript
// Find children interested in arts and crafts
const activityPartners = await fetch(
  '/api/recommendations/activity/child_1?activityType=arts_crafts'
);
```

### Update Child Interests

```javascript
// Update Emma's interests
await fetch('/api/recommendations/update-interests/child_1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    interests: ['arts_crafts', 'music', 'reading'],
    activityPreferences: [
      {
        activityType: 'arts_crafts',
        preferenceLevel: 5,
        lastEngaged: new Date()
      }
    ],
    socialPreferences: {
      groupSize: 'medium',
      interactionStyle: 'mixed',
      leadershipTendency: 'neutral'
    }
  })
});
```

## 🔧 Configuration

### Model Parameters

- **K Neighbors**: Number of similar children to consider (default: 3)
- **Min Group Size**: Minimum children per group (default: 2)
- **Max Group Size**: Maximum children per group (default: 4)
- **Similarity Threshold**: Minimum similarity for recommendations (default: 0.3)

### API Parameters

- **k**: Number of neighbors to return
- **minGroupSize**: Minimum group size
- **maxGroupSize**: Maximum group size
- **excludeIds**: Child IDs to exclude from recommendations

## 📊 Performance Metrics

The system tracks:
- **Similarity Scores**: How well children match
- **Group Formation Rate**: Percentage of successful group formations
- **Interest Coverage**: Percentage of children with interest data
- **Recommendation Accuracy**: User feedback on recommendations

## 🧪 Testing

Run the comprehensive test suite:

```bash
python ml_models/test_knn_system.py
```

Tests include:
- ✅ Basic recommendation functionality
- ✅ Activity-specific recommendations
- ✅ Model persistence (save/load)
- ✅ Edge case handling
- ✅ Sample data generation

## 🔮 Future Enhancements

1. **Machine Learning Improvements**
   - Deep learning models for better similarity
   - Reinforcement learning for group optimization
   - Multi-objective optimization for balanced groups

2. **Advanced Features**
   - Parental preferences integration
   - Staff recommendations
   - Seasonal activity adjustments
   - Conflict resolution algorithms

3. **Analytics & Insights**
   - Recommendation effectiveness tracking
   - Child development progress monitoring
   - Group dynamics analysis
   - Predictive modeling for future preferences

## 📝 API Documentation

### GET /api/recommendations/child/:childId

Get grouping recommendations for a specific child.

**Query Parameters:**
- `k` (number): Number of neighbors to consider (default: 3)
- `minGroupSize` (number): Minimum group size (default: 2)
- `maxGroupSize` (number): Maximum group size (default: 4)
- `excludeIds` (array): Child IDs to exclude

**Response:**
```json
{
  "targetChild": {
    "id": "child_1",
    "name": "Emma Johnson",
    "age": 3.2,
    "interests": ["arts_crafts", "music"],
    "program": "preschool"
  },
  "recommendedGroups": [
    {
      "groupId": "group_1",
      "members": [...],
      "averageSimilarity": 0.85,
      "commonInterests": ["arts_crafts", "music"],
      "groupSize": 3
    }
  ],
  "individualPartners": [
    {
      "id": "child_2",
      "name": "Sophia Brown",
      "similarity": 0.82,
      "ageDifference": 0.3
    }
  ]
}
```

### GET /api/recommendations/activity/:childId

Get activity-specific partner recommendations.

**Query Parameters:**
- `activityType` (string): Required activity type
- `k` (number): Number of partners to return

### POST /api/recommendations/update-interests/:childId

Update child's interests and preferences.

**Request Body:**
```json
{
  "interests": ["arts_crafts", "music"],
  "activityPreferences": [
    {
      "activityType": "arts_crafts",
      "preferenceLevel": 5,
      "lastEngaged": "2024-01-15T10:00:00Z"
    }
  ],
  "socialPreferences": {
    "groupSize": "medium",
    "interactionStyle": "mixed",
    "leadershipTendency": "neutral"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is part of the TinyTots Daycare Management System.
