import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { db } from "./db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";
import { storage } from "./storage";

// Function to initialize database on first run
async function initializeDatabase() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log("Checking database connection and running migrations if needed...");
    }
    
    // Push schema to database
    const { users, courses, tutorCourses, availability, sessions, reviews, notifications, payments } = schema;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log("Setting up database schema...");
    }
    
    // Check if users table exists
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'users'
        );
      `);
      
      const tablesExist = result.rows?.[0]?.exists === true;
      
      if (!tablesExist) {
        if (process.env.NODE_ENV !== 'production') {
          console.log("Creating database tables...");
        }
        
        // Create users table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            department VARCHAR(255) NOT NULL,
            year_of_study INTEGER NOT NULL,
            role VARCHAR(50) NOT NULL,
            gpa NUMERIC(3,2),
            bio TEXT,
            average_rating NUMERIC(3,2),
            is_verified BOOLEAN NOT NULL DEFAULT FALSE,
            verification_token VARCHAR(255),
            google_id VARCHAR(255),
            facebook_id VARCHAR(255),
            refresh_token VARCHAR(255),
            profile_image VARCHAR(255),
            preferences JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Create courses table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            department VARCHAR(50) NOT NULL,
            code VARCHAR(50) NOT NULL UNIQUE,
            title VARCHAR(255) NOT NULL
          )
        `);
        
        // Create tutor_courses table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS tutor_courses (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES users(id),
            course_id INTEGER NOT NULL REFERENCES courses(id),
            is_paid BOOLEAN,
            hourly_rate NUMERIC(10,2),
            UNIQUE(tutor_id, course_id)
          )
        `);
        
        // Create availability table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS availability (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES users(id),
            day_of_week INTEGER NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL
          )
        `);
        
        // Create sessions table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES users(id),
            learner_id INTEGER NOT NULL REFERENCES users(id),
            course_id INTEGER NOT NULL REFERENCES courses(id),
            schedule_date TIMESTAMP NOT NULL,
            duration INTEGER NOT NULL,
            location VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            is_paid BOOLEAN,
            price NUMERIC(10,2),
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Create reviews table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            tutor_id INTEGER NOT NULL REFERENCES users(id),
            learner_id INTEGER NOT NULL REFERENCES users(id),
            session_id INTEGER NOT NULL REFERENCES sessions(id),
            rating INTEGER NOT NULL,
            comment TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(session_id)
          )
        `);
        
        // Create notifications table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            related_id INTEGER,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Create payments table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES sessions(id),
            amount NUMERIC(10,2) NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'USD',
            status VARCHAR(50) NOT NULL,
            payment_method VARCHAR(50),
            transaction_id VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(session_id)
          )
        `);
        
        // Seed some initial courses
        await db.execute(sql`
          INSERT INTO courses (department, code, title)
          VALUES 
            ('CS', 'CS101', 'Introduction to Computer Science'),
            ('CS', 'CS201', 'Data Structures'),
            ('MATH', 'MATH101', 'Calculus I'),
            ('MATH', 'MATH201', 'Linear Algebra'),
            ('PHYS', 'PHYS101', 'Physics I'),
            ('ENG', 'ENG101', 'English Composition')
          ON CONFLICT (code) DO NOTHING
        `);
        
        // Check if admin user exists and create if needed
        const { hashPassword } = await import('./auth');
        const adminUser = await db.execute(sql`
          SELECT * FROM users WHERE username = 'admin123' LIMIT 1
        `);
        
        if (adminUser.rows.length === 0) {
          if (process.env.NODE_ENV !== 'production') {
            console.log("Creating admin user...");
          }
          const hashedPassword = await hashPassword('admin@123');
          await db.execute(sql`
            INSERT INTO users (
              username, password, full_name, email, department, 
              year_of_study, role, bio, is_verified
            ) VALUES (
              'admin123', ${hashedPassword}, 'System Administrator', 
              'admin@tutalink.com', 'Administration', 0, 'admin', 
              'System Administrator Account', TRUE
            )
          `);
          if (process.env.NODE_ENV !== 'production') {
            console.log("Admin user created successfully");
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log("Admin user already exists");
          }
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log("Database schema created successfully");
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log("Database tables already exist, skipping creation");
        }
      }
    } catch (error) {
      console.error("Error checking/creating database tables:", error);
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log("Database initialization complete");
    }
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add security headers in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Protect against XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Strict Transport Security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'same-origin');
    
    next();
  });
}

// Set up authentication
setupAuth(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database in all environments to ensure admin user exists
  try {
    await initializeDatabase();
    if (process.env.NODE_ENV !== 'production') {
      console.log("Database initialized successfully");
    }
    // Ensure the admin user is initialized in memory storage
    await storage.initialized();
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }
  
  const server = await registerRoutes(app);

  // Improved error handler with better logging and sanitized error responses
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log full error details in development, sanitized version in production
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${req.method} ${req.path}:`, err);
    } else {
      // In production, log without potentially sensitive data
      console.error(`[ERROR] ${req.method} ${req.path}: ${message} (${status})`);
    }

    // Send appropriate error response to client
    const errorResponse = {
      message,
      // Add stack trace only in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };

    res.status(status).json(errorResponse);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    if (process.env.NODE_ENV !== 'production') {
      log(`serving on port ${port}`);
    }
  });
})();
