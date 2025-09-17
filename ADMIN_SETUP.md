# Admin Dashboard Setup Guide

## Admin Account Details

**Username:** Aparna  
**Email:** aparna@tinytots.com  
**Password:** Aparna123@  
**Role:** Admin

## Admin Features

### 1. Secure Role-Based Access
- Only users with `admin` role can access admin routes
- Protected routes with middleware authentication
- Automatic redirection for non-admin users

### 2. Admin Dashboard (`/admin`)
- **Dashboard Statistics:**
  - Total Staff, Parents, Children, and Vendors
  - Pending approvals count
  - Real-time data from database

- **Pending Approvals Management:**
  - View pending staff registrations
  - View pending parent registrations  
  - View pending vendor registrations
  - Approve/reject with optional reason
  - View detailed information before approval

### 3. User Management (`/admin/users`)
- **User Overview:**
  - View all users with pagination
  - Filter by role (admin, staff, parent, vendor, customer)
  - Filter by status (active/inactive)
  - Search by name or email

- **User Actions:**
  - View detailed user information
  - Activate/deactivate user accounts
  - Cannot deactivate own admin account

### 4. Account Creation & Approval

#### Staff Account Approval
- Review staff applications with certificates
- View qualifications and experience
- Approve to activate account
- Reject with reason

#### Parent Account Management
- Approve parent registrations
- Create parent accounts directly (admin-created accounts are active by default)
- Generate temporary passwords for new accounts

#### Vendor Account Approval
- Review vendor applications with business licenses
- Verify company information and documents
- Approve/reject vendor applications
- Track approval history

## API Endpoints

### Admin Routes (`/api/admin`)
- `GET /dashboard/stats` - Dashboard statistics
- `GET /staff/pending` - Pending staff accounts
- `GET /staff` - All staff accounts
- `PUT /staff/:id/status` - Approve/reject staff
- `GET /parents/pending` - Pending parent accounts
- `GET /parents` - All parent accounts
- `PUT /parents/:id/status` - Approve/reject parent
- `POST /parents` - Create parent account
- `GET /vendors` - All vendor accounts
- `GET /vendors/pending` - Pending vendor accounts
- `PUT /vendors/:id/status` - Approve/reject vendor
- `GET /users` - User management with filters
- `PUT /users/:id/toggle-status` - Toggle user active status

## Setup Instructions

### 1. Create Admin User
```bash
cd server
npm run create-admin
```

### 2. Start the Application
```bash
# Start backend
cd server
npm run dev

# Start frontend (in another terminal)
cd client
npm start
```

### 3. Login as Admin
1. Go to http://localhost:3000/login
2. Use the admin credentials:
   - Email: aparna@tinytots.com
   - Password: Aparna123@

### 4. Access Admin Features
- Admin Dashboard: `/admin`
- User Management: `/admin/users`
- Admin menu items appear in sidebar for admin users

## Security Features

1. **JWT Authentication:** All admin routes require valid JWT token
2. **Role-Based Authorization:** Middleware checks for admin role
3. **Protected Routes:** Frontend routes redirect non-admin users
4. **Input Validation:** Server-side validation for all admin actions
5. **Error Handling:** Comprehensive error handling and logging

## Database Models

### User Model Extensions
- `role` field with admin option
- `isActive` field for account status
- `staff` subdocument for staff-specific data

### Vendor Model
- `status` field (pending, approved, rejected)
- `approvedBy` reference to admin user
- `approvedAt` timestamp

## Workflow

### Staff Registration & Approval
1. Staff registers via `/register` with certificates
2. Account created but `isActive: false`
3. Admin reviews in dashboard
4. Admin approves → `isActive: true`
5. Staff can now login and access system

### Parent Registration & Approval
1. Parent registers via `/register`
2. Account created but `isActive: false`
3. Admin reviews application
4. Admin approves → `isActive: true`
5. Parent can login and manage children

### Vendor Registration & Approval
1. Vendor submits application via `/vendor-register`
2. Vendor record created with `status: 'pending'`
3. Admin reviews business license and documents
4. Admin approves → `status: 'approved'`
5. Vendor can provide services

## Notes

- Admin accounts are active by default when created
- Only one admin user is created initially
- Additional admin users can be created by existing admins
- All admin actions are logged for audit purposes
- Temporary passwords are generated for admin-created accounts