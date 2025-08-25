# TinyTots Daycare Management System

A comprehensive daycare management and sales system built with React.js and Node.js.

## Features

### Core Functionality
- **User Authentication & Authorization** - Role-based access (Admin, Staff, Parent)
- **Children Management** - Profiles, enrollment, medical information
- **Parent Management** - Contact information, emergency contacts
- **Staff Management** - Employee profiles, schedules, roles
- **Attendance Tracking** - Check-in/out, reports, notifications
- **Billing & Payments** - Invoice generation, payment tracking, financial reports
- **Activities & Programs** - Daily activities, educational programs, milestone tracking
- **Reports & Analytics** - Comprehensive reporting system

### Technology Stack
- **Frontend**: React 18, Material-UI, React Router, Axios, React Query
- **Backend**: Node.js, Express.js, MongoDB, JWT Authentication
- **Additional**: PDF generation, Email notifications, File uploads

## Project Structure

```
TinyTots/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   └── package.json
└── package.json           # Root package.json
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Quick Start

1. **Clone and install dependencies:**
```bash
cd TinyTots
npm run install-all
```

2. **Set up environment variables:**
   - Copy `server/.env` and update with your MongoDB URI and other settings
   - Update JWT_SECRET with a secure random string
   - Configure email settings if needed

3. **Start MongoDB:**
   - Make sure MongoDB is running locally or update MONGODB_URI in .env

4. **Run the application:**
```bash
npm run dev
```

This will start both the backend server (port 5000) and frontend development server (port 3000).

### Individual Commands

**Backend only:**
```bash
cd server
npm run dev
```

**Frontend only:**
```bash
cd client
npm start
```

**Production build:**
```bash
npm run build
```

## Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/tinytots

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Core Resources
- `/api/children` - Children management
- `/api/parents` - Parent management
- `/api/staff` - Staff management
- `/api/attendance` - Attendance tracking
- `/api/billing` - Billing and payments
- `/api/activities` - Activities and programs
- `/api/reports` - Reports and analytics

## Default Users

After setting up the database, you can create users through the registration page. The first user registered with role 'admin' will have full system access.

## Development

### Adding New Features
1. Create backend routes in `server/routes/`
2. Create corresponding models in `server/models/`
3. Add frontend pages in `client/src/pages/`
4. Update navigation in `client/src/components/Layout/Sidebar.jsx`

### Database Models
- **User** - Authentication and user profiles
- **Child** - Children information and enrollment
- Additional models can be added as needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository.