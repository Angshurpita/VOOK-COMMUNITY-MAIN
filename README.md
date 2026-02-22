# VOOK Community Platform

A modern campus community platform built with React, Node.js, and Supabase.

## 🚀 Features

- **Social Feed**: Create, share, and interact with posts
- **User Profiles**: Customizable profiles with academic information
- **Real-time Chat**: Private and group messaging
- **Stories**: Share ephemeral content with campus-specific visibility
- **Communities**: WhatsApp-style group discussions
- **Notifications**: Stay updated with likes, follows, and comments
- **Secure Authentication**: JWT-based authentication with Supabase
- **Rate Limiting**: Built-in protection against API abuse
- **Responsive Design**: Mobile-first UI with TailwindCSS

## 📁 Project Structure

```
COMMUNITY-main-main/
├── backend/                 # Node.js + Express API
│   ├── middleware/         # Authentication, error handling, security
│   ├── scripts/            # Database utilities
│   ├── supabase/           # Database migrations
│   ├── index.js            # Main server file
│   └── package.json
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── context/       # React context providers
│   │   ├── types/         # TypeScript type definitions
│   │   └── integrations/   # Supabase client configuration
│   └── package.json
├── .env.example           # Environment variable templates
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for styling
- **shadcn/ui** component library
- **React Router** for navigation
- **React Query** for state management
- **Lucide React** for icons

### Backend
- **Node.js** with Express.js
- **Supabase** for database and auth
- **PostgreSQL** database
- **JWT** authentication
- **Helmet** for security headers
- **Express Rate Limit** for API protection

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd COMMUNITY-main-main

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Setup

#### Backend Environment
```bash
# Copy the example environment file
cp backend/.env.example backend/.env

# Edit the .env file with your Supabase credentials
nano backend/.env
```

Required environment variables:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=5000
NODE_ENV=development
```

#### Frontend Environment
```bash
# Copy the example environment file
cp frontend/.env.example frontend/.env.local

# Edit the .env.local file with your Supabase credentials
nano frontend/.env.local
```

Required environment variables:
```env
VITE_SUPABASE_URL=https://ydigvfxbufxhafmpkefx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the database schema from `backend/supabase_schema.sql`
3. Enable the required extensions and RLS policies

### 4. Start the Development Servers

```bash
# Start the backend server (from backend directory)
npm run dev

# Start the frontend development server (from frontend directory)
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 📚 API Documentation

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Posts
- `GET /api/posts` - Get posts with pagination
- `POST /api/posts` - Create a new post (protected)
- `POST /api/posts/:postId/like` - Like a post (protected)
- `DELETE /api/posts/:postId/like` - Unlike a post (protected)

#### Profiles
- `GET /api/profiles/:userId` - Get user profile
- `PUT /api/profiles` - Update profile (protected)

#### Following
- `POST /api/profiles/:userId/follow` - Follow a user (protected)
- `DELETE /api/profiles/:userId/follow` - Unfollow a user (protected)

#### System
- `GET /api/health` - Health check
- `GET /api/test-db` - Database connection test

### Rate Limits
- **General**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Post Creation**: 10 posts per hour
- **Interactions**: 30 interactions per minute

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Configured cross-origin resource sharing
- **Security Headers**: Helmet middleware for HTTP security
- **Row Level Security**: Database-level access control

## 🧪 Development

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend linting
cd frontend && npm run lint
```

### Database Migrations
Run the schema file in your Supabase SQL editor:
```sql
-- Execute the contents of backend/supabase_schema.sql
```

## 📝 Environment Variables

### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://ydigvfxbufxhafmpkefx.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CORS_ORIGIN=http://localhost:8080
```

### Frontend (.env.local)
```env
# Supabase
VITE_SUPABASE_URL=https://ydigvfxbufxhafmpkefx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Application
VITE_APP_NAME=VOOK Community
VITE_APP_VERSION=1.0.0
```

## 🚀 Deployment

### Backend Deployment
1. Set production environment variables
2. Install production dependencies: `npm install --production`
3. Start with: `npm start`

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy the `dist` folder to your hosting provider

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
1. Check the API documentation
2. Review the environment setup
3. Ensure all dependencies are installed
4. Verify Supabase configuration

---

Built with ❤️ for campus communities
