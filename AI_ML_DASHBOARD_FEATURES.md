# AI/ML Features Per Dashboard

## Admin Dashboard
- SVM Purchase Prediction — predict if a customer will buy (already implemented: `PurchasePrediction.jsx`)
- Sentiment Analysis on feedback — auto-classify parent feedback (already implemented: `FeedbackClassification.jsx`)
- Customer Segmentation — K-Means clustering to group parents/customers by behavior
- Order Cancellation Risk — XGBoost to flag orders likely to be cancelled
- Fraud/Anomaly Detection — Isolation Forest on unusual order patterns
- Staff Performance Prediction — regression on attendance, ratings, incidents
- Revenue Forecasting — Prophet time series on monthly revenue
- NLP Auto-tagging — TF-IDF/BERT to auto-categorize support tickets and feedback

---

## Vendor Dashboard
- **Product Demand Prediction (BPNN)** — moved here from Admin (already implemented: `DemandPrediction.jsx`)
  - Shows Low/Medium/High demand per product with confidence score
- Smart Restock Alert — Random Forest on sales velocity to flag low-stock products
- Price Suggestion — regression model on category, season, competitor pricing
- Product Image Quality Scorer — CNN to flag blurry/bad product photos
- Sales Revenue Forecasting — Prophet time series per vendor
- Return/Defect Prediction — classify which products are likely to be returned

---

## Doctor Dashboard
- Child Malnutrition Prediction — already implemented (clinical panel, Tab 7)
- Growth Forecast — linear projection from historical BMI/weight/height (already implemented)
- Predictive Health Alerts — rule + ML risk scoring (already implemented)
- Symptom Analysis — NLP keyword matching + severity scoring (already implemented)
- Medication Interaction Check — rule-based + ML flag for unsafe combos (already implemented)
- Appointment No-Show Prediction — logistic regression on parent history
- Disease Outbreak Detection — anomaly detection across children's symptoms

---

## Nanny Dashboard
- Routine Suggestions — collaborative filtering on past booking patterns (already implemented)
- Child Mood/Behavior Pattern — sentiment analysis on service notes (already implemented via `bucketLine`)
- Activity Recommendation — age + milestone based suggestion engine
- Meal Suggestion — nutrition history + allergy-aware recommendation
- Attendance Anomaly Alert — flag unusual absence or late pickup patterns
- Parent Satisfaction Prediction — regression on notes, ratings, booking frequency

---

## Delivery Dashboard (Delivery Agent)
- Estimated Delivery Time Prediction — regression on distance, load, time of day
- Delivery Failure Risk — logistic regression on address type, time window, history
- Route Optimization — nearest-neighbor / OR-Tools greedy algorithm
- Anomaly Detection — flag unusual delivery patterns (too fast, wrong zone)
- Earnings Forecast — simple time series on daily earnings trend

---

## Driver Dashboard
- Route Anomaly Detection — already implemented (routeDeviationAlert, unexpectedStops)
- Pickup Delay Prediction — regression on traffic, weather, route history
- On-Time Rate Forecasting — trend analysis from compliance report data
- Child Safety Risk Score — flag trips with multiple incidents or deviations
- Optimal Pickup Order — TSP (Travelling Salesman) approximation for stop ordering
- Fatigue/Overwork Alert — threshold + regression on hours driven per week

---

## Notes on Demand Prediction Move

`DemandPrediction.jsx` and its backend (`/api/demand-prediction`) should be:
- **Removed** from `AdminDashboard.jsx` AI Predictions tab
- **Added** to `VendorDashboard.jsx` as a new "AI Demand Forecast" tab or section

The component is already built at `client/src/components/DemandPrediction.jsx`.
Import and render it in VendorDashboard under a new tab or inside the Quick Actions section.
