# TutaLink - Student-to-Student Tutoring Platform

A comprehensive tutoring platform designed to streamline educational connections between students and tutors through intuitive digital infrastructure.

## Deployment Instructions for Render.com

### 1. Push Code to GitHub

First, make sure your code is pushed to a GitHub repository:

```bash
# Initialize Git if you haven't already
git init

# Add your files
git add .

# Commit your changes
git commit -m "Initial commit"

# Add your remote repository
git remote add origin https://github.com/YOUR-USERNAME/tutalink.git

# Push your code
git push -u origin main
```

### 2. Set Up Render.com

1. Create an account on [Render.com](https://render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Fill in the configuration:
   - **Name**: TutaLink (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `./render-build.sh`
   - **Start Command**: `./start.sh`
   - **Plan**: Free (or your preferred plan)

### 3. Set Up Environment Variables

Add the following environment variables in the Render dashboard:

**Required Variables:**
- `NODE_ENV`: `production`
- `NPM_CONFIG_PRODUCTION`: `false`
- `DATABASE_URL`: (your PostgreSQL connection string)
- `SESSION_SECRET`: (a random string for session security - generate using `openssl rand -hex 32`)
- `JWT_SECRET`: (a random string for JWT security - generate using `openssl rand -hex 32`)

**Optional Variables (for full functionality):**
- `GOOGLE_CLIENT_ID`: (for Google OAuth integration)
- `GOOGLE_CLIENT_SECRET`: (for Google OAuth integration)
- `FACEBOOK_APP_ID`: (for Facebook OAuth integration)
- `FACEBOOK_APP_SECRET`: (for Facebook OAuth integration)
- `FRONTEND_URL`: (your application URL, e.g., `https://your-app.onrender.com`)
- `SENDGRID_API_KEY`: (for email verification)

### 4. Create a PostgreSQL Database

1. In the Render dashboard, click "New +" and select "PostgreSQL"
2. Configure your database:
   - **Name**: tutalink-db
   - **Database**: tutalink
   - **User**: tutalink_user
   - **Plan**: Free (or your preferred plan)
3. Once created, find the "Internal Connection String" and use it for your `DATABASE_URL` environment variable

### 5. Deploy

Your service will automatically deploy when you push changes to the GitHub repository. The first deployment will initialize the database with the necessary schema and seed data.

### 6. Post-Deployment Steps

After the initial deployment completes:

1. **Verify Database Initialization**: The deployment script automatically runs database migrations. Check the deployment logs to confirm the database has been set up successfully.

2. **Create Admin User**: The system automatically creates an admin user with the following credentials:
   - Username: `admin123`
   - Password: `admin@123`
   
   For security reasons, we recommend changing the admin password immediately after first login.

3. **Configure OAuth (if using)**:
   - For Google OAuth: Add the deployment URL to the authorized domains in your Google Cloud Console
   - For Facebook Login: Add the deployment URL to the allowed domains in your Facebook Developer Console

4. **Test Core Functionality**:
   - User registration and login
   - Tutor creation and searching
   - Session booking and management
   - Messaging system
   - Payment processing (if implemented)

## Local Development

To run the project locally:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Features

- User authentication with email verification
- Social login integration (Google, Facebook)
- Session booking with course selection
- Tutor search with filtering by course, department, and GPA
- Rating and review system for tutors
- Payment processing for paid sessions
- Real-time notifications for session updates
- WebSocket-based messaging system
- Comprehensive analytics tracking

## Troubleshooting Deployment Issues

### Database Connection Issues

If you encounter database connection errors:

1. **Check DATABASE_URL**: Verify that the `DATABASE_URL` environment variable is correctly set to the Internal Connection String from your Render PostgreSQL instance.

2. **SSL Settings**: The application is configured to use SSL in production. If you encounter SSL-related errors, check if your PostgreSQL provider requires specific SSL certificates.

3. **Database Migrations**: If tables are missing, you may need to manually run migrations:
   ```bash
   npx drizzle-kit push:pg
   ```

### Authentication Issues

1. **JWT/Session Errors**: Ensure both `JWT_SECRET` and `SESSION_SECRET` environment variables are set.

2. **OAuth Integration**: If social login isn't working, confirm that the OAuth providers' configuration includes your deployment URL as an authorized domain.

3. **Email Verification**: If email verification isn't working, check that `SENDGRID_API_KEY` is set correctly and that your SendGrid account is active.

### WebSocket Connection Problems

If real-time messaging or notifications aren't working:

1. **Check Browser Console**: Look for WebSocket connection errors in the browser console.

2. **Verify Deployment Logs**: Check Render logs for any WebSocket initialization errors.

3. **WebSocket Path**: Ensure your client is connecting to the correct WebSocket endpoint (`/ws`).

### General Deployment Troubleshooting

1. **Review Render Logs**: Most issues can be diagnosed by reviewing the deployment and application logs in the Render dashboard.

2. **Clear Browser Cache**: After deployment, have users clear their browser cache to ensure they're getting the latest version.

3. **Environment Variables**: Confirm all required environment variables are set correctly.

For persistent issues, please open an issue on the GitHub repository with detailed information about the problem.