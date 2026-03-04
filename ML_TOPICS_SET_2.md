# 🎯 ML Prediction Topics - Set 2
## 3-4 Seminar-Ready Topics for TinyTots Project

---

## 1️⃣ Customer Segmentation & Next Purchase Prediction ⭐⭐⭐⭐⭐

### **What It Does**:
Uses unsupervised learning to group customers into segments, then predicts what products each customer is likely to purchase next.

### **Complexity**: Medium-High (Perfect for seminar!)

### **Business Impact**:
- Personalized product recommendations
- Targeted marketing campaigns
- Increase average order value by 20-30%
- Reduce marketing costs

---

### 📊 **Algorithms Used**:

**Part 1: Customer Segmentation**
- **K-Means Clustering** - Group customers by behavior
- **DBSCAN** - Identify outliers/VIP customers
- **Hierarchical Clustering** - Create customer hierarchy

**Part 2: Product Recommendation**
- **Collaborative Filtering** - "Customers like you bought..."
- **Association Rules (Apriori)** - Frequent itemset mining
- **Neural Collaborative Filtering** - Deep learning approach

---

### 🔧 **Data You Have**:

```javascript
// Customer purchase history
{
  customer: ObjectId("..."),
  totalOrders: 15,
  totalSpent: 12500,
  avgOrderValue: 833,
  categories: ["Diapers", "Toys", "Clothing"],
  lastOrderDate: "2026-02-28",
  daysSinceFirstOrder: 120
}

// Product co-purchase data
{
  productA: "Baby Lotion",
  productB: "Baby Powder",
  purchasedTogether: 45  // times
}

// Customer demographics
{
  hasChildEnrolled: true,
  childAge: 2,  // from Child model
  location: "Mumbai",
  preferredPayment: "UPI"
}
```

---

### 🎯 **What You'll Predict**:

1. **Customer Segments**: Budget Shoppers / Premium Buyers / Occasional / VIP
2. **Next Product Category**: What category they'll buy from next
3. **Next Specific Product**: Top 5 product recommendations
4. **Purchase Probability**: Likelihood of purchase in next 7/14/30 days
5. **Upsell Opportunities**: Higher-value product suggestions

---

### 📈 **Features to Engineer**:

```python
# RFM Features (Recency, Frequency, Monetary)
- days_since_last_order
- total_orders
- total_spent
- avg_order_value
- order_frequency (orders per month)

# Product Preferences
- top_3_categories
- unique_products_purchased
- avg_products_per_order
- category_diversity (how many different categories)

# Behavioral Features
- discount_sensitivity (% orders with discounts)
- cart_abandonment_rate
- payment_method_preference
- time_between_orders_avg
- weekend_vs_weekday_shopper

# Engagement Features
- app_usage_frequency
- reviews_written
- feedback_submitted
- has_child_enrolled (boolean)

# Temporal Features
- customer_lifetime_days
- seasonal_buyer (prefer specific months)
- time_of_day_preference
```

---

### 🔬 **Implementation Overview**:

#### **Step 1: Customer Segmentation with K-Means**

```python
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns

# Load customer data
customers = get_customer_features()  # From MongoDB

# Features for clustering
features = [
    'total_orders', 'total_spent', 'avg_order_value',
    'days_since_last_order', 'order_frequency',
    'category_diversity', 'discount_sensitivity'
]

X = customers[features]

# Standardize features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Find optimal number of clusters (Elbow method)
inertias = []
silhouette_scores = []
K_range = range(2, 10)

for k in K_range:
    kmeans = KMeans(n_clusters=k, random_state=42)
    kmeans.fit(X_scaled)
    inertias.append(kmeans.inertia_)
    silhouette_scores.append(silhouette_score(X_scaled, kmeans.labels_))

# Plot elbow curve
plt.plot(K_range, inertias, 'bo-')
plt.xlabel('Number of Clusters')
plt.ylabel('Inertia')
plt.title('Elbow Method')
plt.savefig('elbow_curve.png')

# Train final model with optimal K (let's say K=4)
kmeans = KMeans(n_clusters=4, random_state=42)
customers['segment'] = kmeans.fit_predict(X_scaled)

# Name segments based on characteristics
segment_names = {
    0: 'Budget Shoppers',
    1: 'Premium Buyers',
    2: 'Occasional Customers',
    3: 'VIP Customers'
}
customers['segment_name'] = customers['segment'].map(segment_names)

# Analyze segments
for segment in range(4):
    print(f"\n{segment_names[segment]}:")
    print(customers[customers['segment'] == segment][features].mean())

# Visualize clusters (2D PCA projection)
from sklearn.decomposition import PCA

pca = PCA(n_components=2)
X_pca = pca.fit_transform(X_scaled)

plt.figure(figsize=(10, 6))
scatter = plt.scatter(X_pca[:, 0], X_pca[:, 1], 
                     c=customers['segment'], cmap='viridis', alpha=0.6)
plt.xlabel('First Principal Component')
plt.ylabel('Second Principal Component')
plt.title('Customer Segments')
plt.colorbar(scatter)
plt.savefig('customer_segments.png')
```

#### **Step 2: Product Recommendation (Collaborative Filtering)**

```python
from sklearn.neighbors import NearestNeighbors
from scipy.sparse import csr_matrix

# Create user-item matrix
user_item_matrix = pd.pivot_table(
    order_items,
    values='quantity',
    index='customer_id',
    columns='product_id',
    fill_value=0
)

# Convert to sparse matrix
sparse_matrix = csr_matrix(user_item_matrix.values)

# Train k-NN model
knn = NearestNeighbors(metric='cosine', algorithm='brute', n_neighbors=10)
knn.fit(sparse_matrix)

def get_recommendations(customer_id, n_recommendations=5):
    """Get top N product recommendations for a customer"""
    
    # Find similar customers
    customer_idx = user_item_matrix.index.get_loc(customer_id)
    distances, indices = knn.kneighbors(
        user_item_matrix.iloc[customer_idx, :].values.reshape(1, -1),
        n_neighbors=11
    )
    
    # Get products purchased by similar customers
    similar_customers = indices.flatten()[1:]  # Exclude self
    
    # Products this customer hasn't bought yet
    customer_products = set(user_item_matrix.iloc[customer_idx, :].nonzero()[0])
    
    recommendations = {}
    for similar_idx in similar_customers:
        similar_products = user_item_matrix.iloc[similar_idx, :].nonzero()[0]
        
        for product_idx in similar_products:
            if product_idx not in customer_products:
                product_id = user_item_matrix.columns[product_idx]
                if product_id not in recommendations:
                    recommendations[product_id] = 0
                recommendations[product_id] += 1
    
    # Sort by frequency
    top_recommendations = sorted(recommendations.items(), 
                                key=lambda x: x[1], reverse=True)[:n_recommendations]
    
    return [product_id for product_id, score in top_recommendations]

# Test
customer_id = "65abc123def456"
recommendations = get_recommendations(customer_id)
print(f"Recommended products: {recommendations}")
```

#### **Step 3: Association Rules (Market Basket Analysis)**

```python
from mlxtend.frequent_patterns import apriori, association_rules

# Create basket (one-hot encoding)
basket = order_items.groupby(['order_id', 'product_name'])['quantity'].sum().unstack().fillna(0)
basket = basket.applymap(lambda x: 1 if x > 0 else 0)

# Find frequent itemsets
frequent_itemsets = apriori(basket, min_support=0.01, use_colnames=True)
print(f"Found {len(frequent_itemsets)} frequent itemsets")

# Generate association rules
rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1.5)
rules = rules.sort_values('confidence', ascending=False)

print("\nTop 10 Association Rules:")
print(rules[['antecedents', 'consequents', 'support', 'confidence', 'lift']].head(10))

# Example: If customer buys Baby Lotion, they'll likely buy...
baby_lotion_rules = rules[rules['antecedents'].apply(lambda x: 'Baby Lotion' in x)]
print("\nIf customer buys Baby Lotion, they might also buy:")
print(baby_lotion_rules[['consequents', 'confidence', 'lift']].head())
```

---

### 📱 **Dashboard Integration**:

```jsx
// CustomerSegments.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, Card, Grid, Typography, Chip, List, ListItem,
  Avatar, Button 
} from '@mui/material';

const CustomerSegments = () => {
  const [segments, setSegments] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const segmentColors = {
    'Budget Shoppers': '#4caf50',
    'Premium Buyers': '#ff9800',
    'Occasional Customers': '#2196f3',
    'VIP Customers': '#9c27b0'
  };

  const loadRecommendations = async (customerId) => {
    const response = await api.post('/predictions/next-purchase', { customerId });
    setRecommendations(response.data.recommendations);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        🎯 Customer Segments & Recommendations
      </Typography>

      {/* Segment Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(segmentStats).map(([segment, stats]) => (
          <Grid item xs={12} md={3} key={segment}>
            <Card sx={{ bgcolor: segmentColors[segment], color: 'white', p: 2 }}>
              <Typography variant="h4">{stats.count}</Typography>
              <Typography>{segment}</Typography>
              <Typography variant="caption">
                Avg Spend: ₹{stats.avgSpend}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6">
            Recommended Products for Customer
          </Typography>
          <List>
            {recommendations.map((product) => (
              <ListItem key={product.id}>
                <Avatar src={product.image} />
                <Typography sx={{ ml: 2 }}>
                  {product.name} - {product.confidence}% match
                </Typography>
              </ListItem>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
};
```

---

### 🎓 **Seminar Highlights**:

1. **Unsupervised Learning** - K-Means, DBSCAN
2. **Collaborative Filtering** - User-based recommendations
3. **Association Rules** - Market basket analysis
4. **Visualization** - Cluster plots, dendrograms
5. **Business Impact** - Increased sales, better targeting

---

## 2️⃣ Order Cancellation Risk Prediction ⭐⭐⭐⭐

### **What It Does**:
Predicts which orders are likely to be cancelled before delivery, allowing proactive intervention.

### **Complexity**: Medium

### **Business Impact**:
- Reduce cancellation rate by 15-25%
- Save processing costs on doomed orders
- Improve customer retention
- Better inventory management

---

### 📊 **Data Available**:

```javascript
// Orders with status transitions
{
  _id: ObjectId("..."),
  customer: ObjectId("..."),
  status: "cancelled",  // or "delivered"
  paymentMethod: "cash_on_delivery",
  total: 1500,
  items: [/* products */],
  createdAt: "2026-02-15",
  cancelledAt: "2026-02-17",
  cancelReason: "Changed mind"
}

// Customer history
{
  previousCancellations: 2,
  totalOrders: 10,
  cancellationRate: 0.2
}
```

---

### 🎯 **What You'll Predict**:

1. **Cancellation Probability**: 0-100% likelihood
2. **Risk Category**: Low / Medium / High / Critical
3. **Likely Reason**: Payment issue / Changed mind / Price / Delivery time
4. **Intervention Needed**: Contact customer / Offer discount / Expedite shipping

---

### 📈 **Features**:

```python
# Order Features
- order_total
- number_of_items
- avg_item_price
- has_discount
- discount_percentage
- payment_method (COD has higher cancellation)
- shipping_method
- estimated_delivery_days

# Customer Features
- customer_tenure_days
- previous_cancellation_rate
- total_orders
- avg_order_value
- payment_pattern (always COD?)
- location_distance_km

# Temporal Features
- day_of_week
- hour_of_day
- is_weekend
- time_to_estimated_delivery

# Product Features
- product_category_risk (some categories cancel more)
- product_return_rate_avg
- product_rating_avg
- has_3d_model (lower cancellation)
```

---

### 🔬 **Model Training**:

```python
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

# Prepare data
X = df[feature_columns]
y = df['is_cancelled']  # 1 if cancelled, 0 if not

# Handle imbalance with SMOTE
smote = SMOTE(random_state=42)
X_resampled, y_resampled = smote.fit_resample(X, y)

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X_resampled, y_resampled, test_size=0.2, random_state=42
)

# Train
model = XGBClassifier(
    max_depth=5,
    learning_rate=0.1,
    n_estimators=100,
    scale_pos_weight=len(y[y==0]) / len(y[y==1])  # Handle imbalance
)

model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
y_pred_proba = model.predict_proba(X_test)[:, 1]

print(classification_report(y_test, y_pred))
print(f"ROC-AUC: {roc_auc_score(y_test, y_pred_proba):.3f}")

# Feature importance
import matplotlib.pyplot as plt

feature_importance = pd.DataFrame({
    'feature': feature_columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

plt.figure(figsize=(10, 6))
plt.barh(feature_importance['feature'][:10], feature_importance['importance'][:10])
plt.xlabel('Importance')
plt.title('Top 10 Features for Cancellation Prediction')
plt.tight_layout()
plt.savefig('cancellation_feature_importance.png')
```

---

### 🎓 **Seminar Highlights**:

1. **Imbalanced Classification** - SMOTE technique
2. **XGBoost** - Gradient boosting for classification
3. **Feature Engineering** - Temporal, customer, product features
4. **Business ROI** - Calculate cost savings
5. **Intervention Strategy** - Actionable insights

---

## 3️⃣ Staff Performance & Workload Prediction ⭐⭐⭐⭐

### **What It Does**:
Predicts staff performance scores and optimal workload distribution based on historical data.

### **Complexity**: Medium-High

### **Business Impact**:
- Improve staff satisfaction
- Reduce burnout and turnover
- Optimize child-to-staff ratios
- Better resource allocation

---

### 📊 **Data Available**:

```javascript
// Staff assignments
{
  staff: ObjectId("..."),
  assignedChildren: [ObjectId1, ObjectId2, ...],
  currentWorkload: 8,  // number of children
  specializations: ["infant_care", "special_needs"]
}

// Attendance records
{
  staff: ObjectId("..."),
  date: "2026-03-01",
  checkIn: "08:00",
  checkOut: "17:00",
  totalHours: 9
}

// Parent feedback about staff
{
  staff: ObjectId("..."),
  rating: 4.5,
  category: "staff",
  sentiment: "positive"
}
```

---

### 🎯 **What You'll Predict**:

1. **Performance Score**: 0-100 rating
2. **Burnout Risk**: Probability of leaving in next 3 months
3. **Optimal Workload**: Ideal number of children per staff
4. **Training Needs**: Which skills need improvement
5. **Best Child Matches**: Which children work best with which staff

---

### 📈 **Features**:

```python
# Workload Features
- current_children_count
- children_with_special_needs_count
- avg_child_age
- children_diversity (age range)
- hours_worked_per_week
- overtime_hours

# Performance Features
- parent_feedback_avg_rating
- parent_complaints_count
- on_time_arrival_rate
- attendance_regularity
- training_courses_completed

# Experience Features
- tenure_months
- total_children_handled
- specializations_count
- certifications_count

# Temporal Features
- current_month
- season
- days_since_last_vacation
```

---

### 🔬 **Model**:

```python
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score

# Multi-output regression (predict multiple targets)
targets = ['performance_score', 'burnout_risk', 'optimal_workload']

model = RandomForestRegressor(n_estimators=100, max_depth=10)
model.fit(X_train, y_train[targets])

# Predictions
predictions = model.predict(X_test)

# Evaluate each target
for i, target in enumerate(targets):
    mae = mean_absolute_error(y_test[target], predictions[:, i])
    print(f"{target} MAE: {mae:.2f}")
```

---

### 🎓 **Seminar Highlights**:

1. **Multi-output Regression** - Predict multiple targets simultaneously
2. **Random Forest** - Ensemble learning
3. **HR Analytics** - Staff optimization
4. **Explainability** - Feature importance for HR decisions
5. **Fairness in AI** - Ensure unbiased predictions

---

## 4️⃣ Revenue Forecasting by Product Category ⭐⭐⭐⭐

### **What It Does**:
Forecasts monthly revenue for each product category using time series analysis.

### **Complexity**: Medium-High

### **Business Impact**:
- Better financial planning
- Inventory optimization
- Marketing budget allocation
- Vendor negotiations

---

### 📊 **Algorithm**: 
- **Facebook Prophet** - Handles seasonality, holidays, trends
- **SARIMA** - Statistical time series model
- **LSTM** - Deep learning for complex patterns

---

### 🎯 **What You'll Predict**:

1. **Next Month Revenue**: By category
2. **Growth Trend**: Increasing/decreasing
3. **Seasonal Patterns**: Peak months
4. **Confidence Intervals**: Revenue range with 95% confidence
5. **Anomaly Detection**: Unusual revenue drops

---

### 📈 **Features**:

```python
# Time series data
- month
- revenue_diapers
- revenue_toys
- revenue_clothing
- revenue_skincare
- total_revenue

# Exogenous variables
- marketing_spend
- discount_percentage
- new_products_launched
- competitor_activity
- holidays (Diwali, Christmas, etc.)
- season (summer, monsoon, winter)
```

---

### 🔬 **Model (Prophet)**:

```python
from fbprophet import Prophet
import pandas as pd

# Prepare data for Prophet
df_prophet = pd.DataFrame({
    'ds': monthly_data['month'],  # Date column
    'y': monthly_data['revenue_diapers']  # Revenue column
})

# Add holidays
holidays = pd.DataFrame({
    'holiday': 'diwali',
    'ds': pd.to_datetime(['2025-11-01', '2026-10-20']),
    'lower_window': 0,
    'upper_window': 1,
})

# Train model
model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=False,
    daily_seasonality=False,
    holidays=holidays
)

# Add exogenous regressors
model.add_regressor('marketing_spend')
model.add_regressor('discount_percentage')

model.fit(df_prophet)

# Forecast next 6 months
future = model.make_future_dataframe(periods=6, freq='M')
future['marketing_spend'] = expected_marketing  # Your estimates
future['discount_percentage'] = expected_discounts

forecast = model.predict(future)

# Visualize
fig = model.plot(forecast)
plt.savefig('revenue_forecast.png')

# Components (trend, seasonality)
fig2 = model.plot_components(forecast)
plt.savefig('revenue_components.png')

print(forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail())
```

---

### 🎓 **Seminar Highlights**:

1. **Time Series Forecasting** - Prophet algorithm
2. **Seasonality Decomposition** - Trend, seasonal, residual
3. **Confidence Intervals** - Uncertainty quantification
4. **Multiple Categories** - Hierarchical forecasting
5. **Business Planning** - Strategic decision support

---

## 📊 Summary Comparison

| Topic | Complexity | Implementation | Business Impact | Uniqueness | Data Required |
|-------|-----------|----------------|----------------|------------|---------------|
| Customer Segmentation | Medium-High | 2-3 weeks | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Orders, Customers |
| Order Cancellation | Medium | 1-2 weeks | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Orders, Customers |
| Staff Performance | Medium-High | 2-3 weeks | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Staff, Children, Feedback |
| Revenue Forecasting | Medium-High | 2 weeks | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Orders (historical) |

---

## 🎯 Recommendation

**Best for Seminar**: **Customer Segmentation & Next Purchase Prediction**

**Why?**
1. ✅ Combines unsupervised (clustering) + supervised (recommendation) learning
2. ✅ Multiple algorithms (K-Means, Collaborative Filtering, Association Rules)
3. ✅ Beautiful visualizations (cluster plots, dendrograms)
4. ✅ Clear business value (increase sales by recommendations)
5. ✅ Different from common prediction topics
6. ✅ Uses YOUR e-commerce data extensively
7. ✅ Can compare multiple approaches

**Runner-up**: **Order Cancellation Risk** (easier to implement, clear ROI)

---

**All topics use YOUR actual TinyTots data and solve real business problems!** 🚀
