# 🛒 SVM Purchase Prediction - Complete Workflow

## Overview
This document explains the complete workflow for using the SVM (Support Vector Machine) Purchase Prediction system in TinyTots Daycare Management.

## 📋 Workflow Steps

### **1️⃣ Admin Decides Discounts**

Admins set product discounts based on:

- **Inventory Management**: Low stock items get higher discounts
- **Seasonal Campaigns**: Festive or birthday discounts
- **Marketing Campaigns**: Promotional sales

**Location**: Admin Dashboard → Products → Update Discount %

---

### **2️⃣ Admin Updates Discount in Database**

- Admin updates discount percentage for products
- Changes are stored in the product database
- Discounts affect purchase prediction results

---

### **3️⃣ Customer Views Discounted Products**

- Customers browse e-commerce store
- See discounted prices for toys, diapers, skincare products
- Compare products by category, price, and offers

**Location**: E-commerce Shop (`/shop`)

---

### **4️⃣ SVM Predicts Purchase Likelihood**

**Admin can test predictions using the AI Purchase Prediction tool**

#### **Input Parameters:**
- **Product Category**: Toy, Diaper, Skincare
- **Price**: In ₹ (Indian Rupees)
- **Discount**: Percentage (0-100%)
- **Customer Type**: Parent or Customer

#### **SVM Algorithm:**
```
Prediction Factors:
├── Discount Effect (20%+ = high likelihood)
├── Price Effect (₹200-500 = ideal range)
├── Category Effect (Diaper = highest likelihood)
└── Customer Type (Parent = highest likelihood)
```

#### **Output:**
- **Prediction**: ✅ Yes / ❌ No
- **Confidence**: 0-100%
- **Detailed Explanation**: AI reasoning

---

### **5️⃣ Example Predictions**

#### **Example 1: High Likelihood Purchase**
```
Product: Toy
Price: ₹500
Discount: 10%
Customer: Parent

Prediction: ✅ Yes (85% confidence)
Explanation: "High discount of 10% makes this attractive. 
Reasonable price at ₹500 is acceptable. Parents show high 
purchase intent. Consider increasing discount to improve 
purchase likelihood."
```

#### **Example 2: Low Likelihood Purchase**
```
Product: Skincare
Price: ₹1500
Discount: 5%
Customer: Customer

Prediction: ❌ No (65% confidence)
Explanation: "Small discount of 5% offers minimal savings. 
Higher price at ₹1500 may deter purchases. Consider 
increasing discount to improve purchase likelihood."
```

#### **Example 3: Successful Purchase with Good Discount**
```
Product: Diaper
Price: ₹200
Discount: 20%
Customer: Parent

Prediction: ✅ Yes (95% confidence)
Explanation: "Excellent discount of 20% creates strong 
purchase incentive. Affordable price at ₹200 is within 
easy reach. Diapers are essential items with high purchase 
likelihood. Parents show high purchase intent. Current 
discount is effective for driving purchases."
```

---

### **6️⃣ Admin Uses Predictions to Adjust Discounts**

#### **If SVM Predicts "No":**
- ❌ **Action**: Consider increasing discount
- **Strategy**: Increase discount by 5-10%
- **Goal**: Improve purchase probability

#### **If SVM Predicts "Yes":**
- ✅ **Action**: Maintain current discount
- **Strategy**: Monitor sales performance
- **Goal**: Maximize revenue

---

### **7️⃣ Customer Purchases**

- Customer sees final discounted price in store
- Makes purchase decision
- Complete transaction

---

## 🎯 AI Prediction Logic

### **Prediction Algorithm:**

```javascript
probability = 0.5  // Base probability

// Discount Effect
if (discount >= 20%) probability += 0.35
else if (discount >= 15%) probability += 0.25
else if (discount >= 10%) probability += 0.15
else if (discount >= 5%) probability += 0.05

// Price Effect (in rupees)
if (price <= ₹200) probability += 0.2   // Affordable
else if (price <= ₹500) probability += 0.1  // Reasonable
else if (price <= ₹1000) probability += 0.0  // Moderate
else if (price > ₹1000) probability -= 0.15  // Expensive

// Category Effect
if (category === 'Diaper') probability += 0.15  // Essential
else if (category === 'Toy') probability += 0.1   // Popular
else if (category === 'Skincare') probability += 0.05  // Optional

// Customer Type Effect
if (customerType === 'Parent') probability += 0.15
else if (customerType === 'Customer') probability += 0.1

// Final Decision
if (probability > 0.5) return 'Yes' else return 'No'
```

---

## 📊 Accessing the Feature

### **Admin Dashboard → AI Predictions Tab**

1. Login as Admin
2. Navigate to Admin Dashboard
3. Click "AI Predictions" tab (8th tab)
4. Enter product details:
   - Select category (Toy/Diaper/Skincare)
   - Enter price in ₹
   - Enter discount %
   - Select customer type (Parent/Customer)
5. Click "Predict Purchase"
6. View results and recommendations

---

## 🔧 Recommended Discounts by Scenario

| Product | Price | Discount | Customer | Likely Purchase? |
|---------|-------|----------|----------|------------------|
| Diaper | ₹300 | 15% | Parent | ✅ Yes |
| Toy | ₹500 | 10% | Parent | ✅ Yes |
| Toy | ₹500 | 5% | Parent | ❌ No → Increase to 10%+ |
| Skincare | ₹800 | 5% | Customer | ❌ No → Increase to 15%+ |
| Diaper | ₹200 | 20% | Parent | ✅ Yes |
| Toy | ₹1500 | 10% | Customer | ❌ No → Increase to 20%+ |

---

## ✅ Benefits

1. **Optimize Discounts**: Test different discount levels
2. **Improve Sales**: Increase purchase likelihood
3. **Data-Driven**: Make informed pricing decisions
4. **Maximize Revenue**: Balance discounts and sales volume
5. **Reduce Markdowns**: Predict effective discount levels

---

## 🎉 Ready to Use!

The SVM Purchase Prediction system is fully integrated and ready for use in the Admin Dashboard. Administrators can now make data-driven decisions about product pricing and promotional strategies!

