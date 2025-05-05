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

- `NODE_ENV`: `production`
- `NPM_CONFIG_PRODUCTION`: `false`
- `DATABASE_URL`: (your PostgreSQL connection string)

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