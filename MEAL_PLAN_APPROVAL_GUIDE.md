# 🍽️ Meal Plan Approval Workflow - Implementation Guide

## Overview
A comprehensive meal plan management system where staff create meal plans, and admins review, approve, and publish them for parents to view.

## Key Features

### **Admin Control**
- ✅ View all pending meal plan submissions
- ✅ Approve or reject meal plans with reasons
- ✅ Publish approved meal plans (makes them visible to parents)
- ✅ View detailed meal plan information
- ✅ Track approval/rejection history
- ✅ Complete control over what parents see

### **Staff Participation**
- ✅ Create meal plan drafts
- ✅ Submit meal plans for admin approval
- ✅ View their own meal plans
- ❌ Cannot publish meal plans directly (admin approval required)
- ❌ Parents cannot see unpublished meal plans

## Workflow

1. **Staff Creates Draft**
   - Staff logs into dashboard
   - Navigates to Meal Planning section
   - Creates a new meal plan with weekly menu
   - Saves as draft

2. **Staff Submits for Approval**
   - Staff clicks "Submit for Approval"
   - Status changes to "pending_approval"
   - Notifies admin of new submission

3. **Admin Reviews**
   - Admin sees pending meal plans in "Meal Plan Approvals" tab
   - Views full meal plan details
   - Makes decision

4. **Admin Decision**
   - **Approve**: Meal plan is approved and ready for publishing
   - **Reject**: Admin provides reason, staff can revise
   - **Publish**: Makes approved meal plan visible to parents

5. **Parents View**
   - Parents see only published meal plans
   - Viewed on parent dashboard under "Meals" tab

## System Architecture

### **Backend Implementation**

#### **Meal Plan Model** (`server/models/MealPlan.js`)
```javascript
Added fields:
- status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'rejected'
- submittedForApproval: Boolean
- approvedBy: User reference
- approvedAt: Date
- rejectedBy: User reference
- rejectedAt: Date
- rejectionReason: String
- publishedAt: Date
```

#### **API Routes** (`server/routes/mealPlans.js`)
- `POST /:id/submit` - Submit for approval (staff)
- `POST /:id/approve` - Approve meal plan (admin)
- `POST /:id/reject` - Reject with reason (admin)
- `POST /:id/publish` - Publish approved plan (admin)
- `GET /pending` - Get pending approvals (admin)
- Updated child meal plan query to only show 'published' plans

### **Frontend Implementation**

#### **Admin Dashboard** (`client/src/pages/Admin/AdminDashboard.jsx`)
- Added "Meal Plan Approvals" tab
- Integrated MealPlanApprovals component

#### **Meal Plan Approvals Component** (`client/src/components/MealPlanApprovals.jsx`)
- Lists all pending meal plans
- View detailed meal plan dialog
- Approve/Reject/Publish actions
- Shows status, created by, dates

## Status Flow

```
Draft → Pending Approval → Approved → Published → Visible to Parents
                                    ↓
                                 Rejected (with reason)
```

## Usage Instructions

### **For Staff:**
1. Go to Meal Planning page
2. Create a new meal plan
3. Fill in weekly menu details
4. Click "Submit for Approval"
5. Wait for admin response

### **For Admin:**
1. Go to Admin Dashboard
2. Click "Meal Plan Approvals" tab
3. Review pending meal plans
4. Click "View" to see full details
5. Click "Approve" or "Reject"
6. If approved, click "Publish" to make it visible to parents

### **For Parents:**
1. Login to parent dashboard
2. Select child
3. Go to "Meals" tab
4. View published weekly meal plans

## API Endpoints

### **Staff Endpoints**
- `POST /api/mealPlans` - Create new meal plan (status: 'draft')
- `PUT /api/mealPlans/:id` - Update meal plan
- `POST /api/mealPlans/:id/submit` - Submit for approval

### **Admin Endpoints**
- `GET /api/mealPlans/pending` - Get pending meal plans
- `POST /api/mealPlans/:id/approve` - Approve meal plan
- `POST /api/mealPlans/:id/reject` - Reject meal plan
- `POST /api/mealPlans/:id/publish` - Publish meal plan

### **Parent Endpoints**
- `GET /api/children/:childId/meals` - Get published meal plans

## Features

### **Status Indicators**
- 🟡 **Draft**: Not submitted yet
- 🟠 **Pending**: Awaiting admin review
- 🟢 **Approved**: Ready to publish
- 🟢 **Published**: Visible to parents
- 🔴 **Rejected**: Needs revision

### **User Permissions**
- **Staff**: Create, edit, submit drafts
- **Admin**: Approve, reject, publish (full control)
- **Parents**: View only published plans

## Benefits
1. **Quality Control**: Admin ensures meal plans meet nutrition standards
2. **Consistency**: Standardized meal plans across programs
3. **Transparency**: Parents see approved, official meal plans
4. **Flexibility**: Staff can suggest menu items
5. **Accountability**: Track who created and approved each plan

## Testing
1. Create a meal plan as staff
2. Submit it for approval
3. Login as admin and review
4. Approve the meal plan
5. Publish it
6. Login as parent and verify it's visible

## Future Enhancements
- Email notifications for submissions/approvals
- Meal plan templates
- Nutritional analysis
- Allergy warnings
- Meal preferences tracking
- Historical meal plan archive

---

**Implementation Date**: 2024
**Status**: ✅ Complete and Ready for Use
