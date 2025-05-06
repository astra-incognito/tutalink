import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from 'express-session';
import MemoryStore from 'memorystore';
import { z } from "zod";
import { WebSocketServer, WebSocket } from 'ws';
import { 
  insertUserSchema, 
  loginSchema, 
  tutorSearchSchema, 
  insertSessionSchema, 
  insertReviewSchema,
  insertUserActivitySchema,
  insertAnalyticsMetricSchema,
  insertPageViewSchema,
  insertSearchAnalyticsSchema,
  insertErrorLogSchema,
  insertMessageSchema,
  insertConversationSchema,
  insertConversationParticipantSchema,
  insertSiteSettingsSchema,
  Message,
  SiteSetting
} from "@shared/schema";
import PgStore from 'connect-pg-simple';

// For simplicity, we use a memory store for sessions
const MemoryStoreFactory = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === "production", // true if HTTPS
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      },
      store: new PgStore({ pool }),
    })
  );

  // Authentication routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // For tutors, validate GPA requirement and force showGPA to true
      if (userData.role === "tutor") {
        if (!userData.gpa || userData.gpa < 3.5) {
          return res.status(400).json({ message: "Tutors must have a GPA of at least 3.5" });
        }
        // Tutors must always show their GPA
        userData.showGPA = true;
      } else if (userData.role === "learner") {
        // Learners have showGPA defaulted to false unless explicitly set
        userData.showGPA = userData.showGPA || false;
      }

      const { hashPassword } = await import('./auth');
      userData.password = await hashPassword(userData.password);

      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      // Check if we already have this user in the session
      if (req.session.userId && req.session.username === username) {
        // User is already logged in with this username
        const user = await storage.getUser(req.session.userId);
        if (user) {
          // Remove password from response
          const { password: _, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        }
      }
      
      // Performance optimization: Add a short cache for failed login attempts by IP
      // to prevent brute force attacks while keeping successful logins fast
      const user = await storage.getUserByUsername(username);
      
      // Import comparePasswords function from auth.ts
      const { comparePasswords } = await import('./auth');
      
      // Check if user exists and password is correct using our secure comparison function
      const isPasswordValid = user ? await comparePasswords(password, user.password) : false;
      
      if (!user || !isPasswordValid) {
        // Record the failed login attempt for potential security monitoring
        try {
          await storage.logActivity({
            userId: user?.id || null,
            action: 'LOGIN_FAILED',
            metadata: { username },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null
          });
        } catch (logErr) {
          console.error('Failed to log failed login:', logErr);
        }
        
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set session with more data for quick access
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      req.session.fullName = user.fullName;
      
      // Log successful login
      try {
        await storage.logActivity({
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null
        });
      } catch (logErr) {
        console.error('Failed to log successful login:', logErr);
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      // Return the user data
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid login data", errors: error.errors });
      }
      console.error('Login error:', error);
      res.status(500).json({ message: "Error during login" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Cache header for better performance (5 seconds)
    res.set('Cache-Control', 'private, max-age=5');
    
    // User data lookup with timing
    const startTime = process.hrtime();
    const user = await storage.getUser(req.session.userId);
    const elapsed = process.hrtime(startTime);
    const elapsedMs = (elapsed[0] * 1000 + elapsed[1] / 1000000).toFixed(2);
    
    // Log slow queries for performance monitoring
    if (elapsed[0] > 0 || elapsed[1] > 200000000) { // More than 200ms
      console.warn(`Slow user lookup: ${elapsedMs}ms for user ID ${req.session.userId}`);
    }
    
    if (!user) {
      // Session exists but user doesn't - clear invalid session
      req.session.destroy((err) => {
        if (err) console.error('Error destroying invalid session:', err);
      });
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    // Apply GPA visibility rules for consistency
    // Note: For the user's own data we don't hide their GPA since they own the data
    // This is mainly for type consistency with other endpoints
    const processedUser = {
      ...userWithoutPassword,
      // Force showGPA to true for tutors
      showGPA: user.role === 'tutor' ? true : userWithoutPassword.showGPA
    };
    
    res.json(processedUser);
  });
  
  // Get users for messaging
  app.get("/api/users", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      // Get all users
      let users = Array.from((storage as any).users.values());
      
      // Filter by role if specified
      const role = req.query.role as string;
      if (role) {
        users = users.filter(user => user.role === role);
      }
      
      // Remove passwords and sensitive information
      const processedUsers = users.map(user => {
        const { password, refreshToken, verificationToken, ...userWithoutSensitiveInfo } = user;
        
        // Apply GPA visibility rules
        return {
          ...userWithoutSensitiveInfo,
          gpa: (userWithoutSensitiveInfo.showGPA === true || userWithoutSensitiveInfo.role === 'tutor') 
            ? userWithoutSensitiveInfo.gpa 
            : null
        };
      });
      
      res.json(processedUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  // Update user profile (users can update their own profile)
  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const userId = parseInt(req.params.id);
      
      // Users can only update their own profile
      if (userId !== req.session.userId) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }
      
      // We don't use zod validation here as we want to allow partial updates
      const userData = req.body;
      
      // Don't allow password or role updates through this endpoint
      if (userData.password) {
        delete userData.password;
      }
      
      if (userData.role) {
        delete userData.role;
      }
      
      // For tutors, ensure GPA requirements and visibility
      const currentUser = await storage.getUser(userId);
      if (currentUser?.role === "tutor") {
        // Tutors must have a minimum GPA of 3.5
        if (userData.gpa !== undefined && userData.gpa !== null && userData.gpa < 3.5) {
          return res.status(400).json({ message: "Tutors must maintain a GPA of at least 3.5" });
        }
        
        // Tutors must always show their GPA
        userData.showGPA = true;
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Course routes
  app.get("/api/courses", async (_req: Request, res: Response) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Error fetching courses" });
    }
  });

  app.get("/api/courses/department/:department", async (req: Request, res: Response) => {
    try {
      const { department } = req.params;
      const courses = await storage.getCoursesByDepartment(department);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Error fetching courses by department" });
    }
  });

  // Tutor routes
  app.get("/api/tutors", async (req: Request, res: Response) => {
    try {
      const tutors = await storage.getTutors();
      res.json(tutors);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tutors" });
    }
  });

  app.get("/api/tutors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Cache header for better performance - 30 seconds for tutor profiles
      // since they don't change frequently
      res.set('Cache-Control', 'private, max-age=30');
      
      const startTime = process.hrtime();
      const tutor = await storage.getTutorDetails(id);
      const elapsed = process.hrtime(startTime);
      const elapsedMs = (elapsed[0] * 1000 + elapsed[1] / 1000000).toFixed(2);
      
      // Log slow queries for performance monitoring
      if (elapsed[0] > 0 || elapsed[1] > 100000000) { // More than 100ms
        console.warn(`Slow tutor lookup: ${elapsedMs}ms for tutor ID ${id}`);
      }
      
      if (!tutor) {
        return res.status(404).json({ message: "Tutor not found" });
      }
      
      // Remove password from response
      const { password, ...tutorWithoutPassword } = tutor;
      
      // Process tutor to respect GPA visibility settings
      // For students with showGPA=false, hide their GPA
      // For tutors, always show GPA as it's a requirement
      const processedTutor = {
        ...tutorWithoutPassword,
        gpa: (tutorWithoutPassword.showGPA === true || tutorWithoutPassword.role === 'tutor') 
          ? tutorWithoutPassword.gpa 
          : null
      };
      
      // Log profile view for analytics
      if (req.session.userId) {
        try {
          await storage.logActivity({
            userId: req.session.userId,
            action: 'TUTOR_PROFILE_VIEW',
            targetId: id,
            targetType: 'tutor',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null
          });
        } catch (logErr) {
          console.error('Failed to log tutor profile view:', logErr);
        }
      }
      
      res.json(processedTutor);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tutor details" });
    }
  });

  // Tutor course management
  app.post("/api/tutor/courses", async (req: Request, res: Response) => {
    if (req.session.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can add courses" });
    }
    
    try {
      const { courseId, isPaid, hourlyRate } = req.body;
      
      // Validate course exists
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Create tutor course
      const tutorCourse = await storage.createTutorCourse({
        tutorId: req.session.userId,
        courseId,
        isPaid,
        hourlyRate: isPaid ? hourlyRate : null
      });
      
      const tutorCourseWithCourse = {
        ...tutorCourse,
        course
      };
      
      res.status(201).json(tutorCourseWithCourse);
    } catch (error) {
      res.status(500).json({ message: "Error adding course to tutor" });
    }
  });

  app.delete("/api/tutor/courses/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can remove courses" });
    }
    
    try {
      const id = parseInt(req.params.id);
      
      // Verify the tutor course belongs to the requesting tutor
      const tutorCourses = await storage.getTutorCourses(req.session.userId);
      const tutorCourse = tutorCourses.find(tc => tc.id === id);
      
      if (!tutorCourse) {
        return res.status(404).json({ message: "Tutor course not found or not authorized" });
      }
      
      await storage.deleteTutorCourse(id);
      res.json({ message: "Course removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error removing course from tutor" });
    }
  });

  // Availability management
  app.post("/api/tutor/availability", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can add availability" });
    }
    
    try {
      const { dayOfWeek, startTime, endTime } = req.body;
      
      const availability = await storage.createAvailability({
        tutorId: req.session.userId,
        dayOfWeek,
        startTime,
        endTime
      });
      
      res.status(201).json(availability);
    } catch (error) {
      res.status(500).json({ message: "Error adding availability" });
    }
  });

  app.delete("/api/tutor/availability/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.role !== "tutor") {
      return res.status(403).json({ message: "Only tutors can remove availability" });
    }
    
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAvailability(id);
      res.json({ message: "Availability removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error removing availability" });
    }
  });

  // Session booking routes
  app.post("/api/sessions", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const sessionData = insertSessionSchema.parse({
        ...req.body,
        learnerId: req.session.userId
      });
      
      const session = await storage.createSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating session" });
    }
  });

  app.put("/api/sessions/:id/status", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      // Verify session exists and user has permission to update
      const session = await storage.getSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Only the tutor can update status
      if (session.tutorId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to update this session" });
      }
      
      const updatedSession = await storage.updateSessionStatus(id, status);
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Error updating session status" });
    }
  });

  app.get("/api/sessions", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      // Cache results for 30 seconds
      res.set('Cache-Control', 'private, max-age=30');
      
      const role = req.session.role as 'tutor' | 'learner';
      
      const startTime = process.hrtime();
      const sessions = await storage.getUserSessions(req.session.userId, role);
      const elapsed = process.hrtime(startTime);
      const elapsedMs = (elapsed[0] * 1000 + elapsed[1] / 1000000).toFixed(2);
      
      // Log slow session queries
      if (elapsed[0] > 0 || elapsed[1] > 100000000) { // More than 100ms
        console.warn(`Slow session lookup: ${elapsedMs}ms for user ID ${req.session.userId} (${role})`);
      }
      
      // Track session dashboard view for analytics
      try {
        await storage.logActivity({
          userId: req.session.userId,
          action: 'SESSION_DASHBOARD_VIEW',
          metadata: { 
            sessionCount: sessions.length,
            role: role
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null
        });
      } catch (logErr) {
        console.error('Failed to log session dashboard view:', logErr);
      }
      
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sessions" });
    }
  });

  // Review routes
  app.post("/api/reviews", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.role !== "learner") {
      return res.status(403).json({ message: "Only learners can post reviews" });
    }
    
    try {
      const { sessionId, tutorId, rating, comment } = req.body;
      
      // Verify session exists and belongs to the learner
      const session = await storage.getSession(sessionId);
      if (!session || session.learnerId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to review this session" });
      }
      
      // Verify session is completed
      if (session.status !== "completed") {
        return res.status(400).json({ message: "Cannot review a session that is not completed" });
      }
      
      const review = await storage.createReview({
        sessionId,
        learnerId: req.session.userId,
        tutorId,
        rating,
        comment
      });
      
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating review" });
    }
  });

  app.get("/api/tutors/:id/reviews", async (req: Request, res: Response) => {
    try {
      const tutorId = parseInt(req.params.id);
      const reviews = await storage.getTutorReviews(tutorId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tutor reviews" });
    }
  });

  // Admin routes
  // Middleware to check if user is admin
  const requireAdmin = (req: Request, res: Response, next: Function) => {
    if (req.session.userId && req.session.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: "Access denied. Admin privileges required." });
    }
  };

  // Get all users (admin only)
  app.get("/api/admin/users", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user (admin only)
  app.put("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      // We don't use zod validation here as we want to allow partial updates
      const userData = req.body;
      
      // Don't allow password updates through this endpoint
      if (userData.password) {
        delete userData.password;
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Change user password (admin only)
  app.post("/api/admin/users/:id/change-password", requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;
      
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ message: "Invalid password format" });
      }
      
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(newPassword);
      
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Get admin analytics dashboard data
  app.get("/api/admin/analytics", requireAdmin, async (_req: Request, res: Response) => {
    try {
      // Mock analytics for now - these would be implemented in storage
      const userCount = await storage.getUserCount();
      const sessionCount = await storage.getSessionCount();
      
      // Sample data for the admin dashboard
      res.json({
        userCount: userCount || 0,
        sessionCount: sessionCount || 0,
        activeUsers: Math.floor(userCount * 0.7) || 0,
        conversionRate: 45.8,
        topSearches: [
          { term: "Computer Science", count: 42 },
          { term: "Calculus", count: 38 },
          { term: "Physics", count: 25 },
          { term: "Engineering", count: 19 },
          { term: "Linear Algebra", count: 15 }
        ],
        userGrowth: [
          { date: "Jan 2023", count: 20, change: 0 },
          { date: "Feb 2023", count: 35, change: 75 },
          { date: "Mar 2023", count: 48, change: 37 },
          { date: "Apr 2023", count: 62, change: 29 },
          { date: "May 2023", count: 85, change: 37 },
          { date: "Jun 2023", count: 103, change: 21 }
        ]
      });
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Analytics routes - These routes require admin privileges
  // User activity logging and retrieval
  app.post("/api/analytics/user-activity", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userActivity = insertUserActivitySchema.parse({
        ...req.body,
        userId: req.session.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      const result = await storage.logUserActivity(userActivity);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Error logging user activity" });
    }
  });

  app.get("/api/analytics/user-activity", async (req: Request, res: Response) => {
    // Only admins should access this endpoint in production
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const action = req.query.action as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const activities = await storage.getUserActivities(userId, action, startDate, endDate);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user activities" });
    }
  });

  // Page views tracking
  app.post("/api/analytics/page-view", async (req: Request, res: Response) => {
    try {
      const pageView = insertPageViewSchema.parse({
        ...req.body,
        userId: req.session.userId || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      const result = await storage.logPageView(pageView);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid page view data", errors: error.errors });
      }
      res.status(500).json({ message: "Error logging page view" });
    }
  });

  app.get("/api/analytics/page-views", async (req: Request, res: Response) => {
    // Only admins should access this endpoint in production
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const path = req.query.path as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const pageViews = await storage.getPageViews(path, startDate, endDate);
      res.json(pageViews);
    } catch (error) {
      res.status(500).json({ message: "Error fetching page views" });
    }
  });

  app.get("/api/analytics/most-viewed-pages", async (req: Request, res: Response) => {
    // Only admins should access this endpoint in production
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const mostViewedPages = await storage.getMostViewedPages(limit);
      res.json(mostViewedPages);
    } catch (error) {
      res.status(500).json({ message: "Error fetching most viewed pages" });
    }
  });

  // Search analytics
  app.post("/api/analytics/search", async (req: Request, res: Response) => {
    try {
      const searchData = insertSearchAnalyticsSchema.parse({
        ...req.body,
        userId: req.session.userId || null
      });
      
      const result = await storage.logSearch(searchData);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid search data", errors: error.errors });
      }
      res.status(500).json({ message: "Error logging search" });
    }
  });

  app.get("/api/analytics/popular-searches", async (req: Request, res: Response) => {
    // Only admins should access this endpoint in production
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const popularSearches = await storage.getPopularSearches(limit);
      res.json(popularSearches);
    } catch (error) {
      res.status(500).json({ message: "Error fetching popular searches" });
    }
  });

  // Error logging
  app.post("/api/analytics/error", async (req: Request, res: Response) => {
    try {
      const errorData = insertErrorLogSchema.parse({
        ...req.body,
        userId: req.session.userId || null,
        userAgent: req.headers['user-agent']
      });
      
      const result = await storage.logError(errorData);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid error data", errors: error.errors });
      }
      res.status(500).json({ message: "Error logging error" });
    }
  });

  app.get("/api/analytics/errors", async (req: Request, res: Response) => {
    // Only admins should access this endpoint in production
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const errorType = req.query.errorType as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const errors = await storage.getErrors(errorType, startDate, endDate);
      res.json(errors);
    } catch (error) {
      res.status(500).json({ message: "Error fetching errors" });
    }
  });

  // Analytics metrics
  app.post("/api/analytics/metrics", async (req: Request, res: Response) => {
    // Only admins should be able to create metrics in production
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const metricData = insertAnalyticsMetricSchema.parse(req.body);
      const result = await storage.saveAnalyticsMetric(metricData);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid metric data", errors: error.errors });
      }
      res.status(500).json({ message: "Error saving metric" });
    }
  });

  app.get("/api/analytics/metrics/:metricType", async (req: Request, res: Response) => {
    // Only admins should access this endpoint in production
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const { metricType } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const metrics = await storage.getAnalyticsMetrics(metricType, startDate, endDate);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Error fetching metrics" });
    }
  });

  // Messaging API endpoints
  
  // Get user's conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const conversations = await storage.getUserConversations(req.session.userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching conversations" });
    }
  });
  
  // Get a specific conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationWithDetails(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user is a participant in this conversation
      const isParticipant = conversation.participants.some(p => p.userId === req.session.userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this conversation" });
      }
      
      // Get messages for this conversation
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const messages = await storage.getConversationMessages(conversationId, limit, offset);
      
      // Mark conversation as read for this user
      await storage.updateParticipantLastRead(conversationId, req.session.userId);
      
      res.json({ conversation, messages });
    } catch (error) {
      res.status(500).json({ message: "Error fetching conversation details" });
    }
  });
  
  // Create a new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const { title, participantIds } = req.body;
      
      // Ensure the current user is included in participants
      if (!participantIds.includes(req.session.userId)) {
        participantIds.push(req.session.userId);
      }
      
      // Create conversation
      const conversation = await storage.createConversation({
        title: title || null,
        sessionId: null
      });
      
      // Add participants
      for (const userId of participantIds) {
        await storage.addParticipantToConversation({
          conversationId: conversation.id,
          userId,
          isActive: true,
          role: userId === req.session.userId ? 'owner' : 'member'
        });
      }
      
      const conversationWithDetails = await storage.getConversationWithDetails(conversation.id);
      res.status(201).json(conversationWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Error creating conversation" });
    }
  });
  
  // Find or create a direct conversation between users
  app.post("/api/conversations/direct", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const { otherUserId } = req.body;
      
      if (!otherUserId) {
        return res.status(400).json({ message: "otherUserId is required" });
      }
      
      // Verify other user exists
      const otherUser = await storage.getUser(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Find or create conversation between these two users
      const conversation = await storage.findOrCreateConversationBetweenUsers([
        req.session.userId,
        otherUserId
      ]);
      
      const conversationWithDetails = await storage.getConversationWithDetails(conversation.id);
      res.json(conversationWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Error creating direct conversation" });
    }
  });
  
  // Send a message to a conversation
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationWithDetails(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user is a participant in this conversation
      const isParticipant = conversation.participants.some(p => 
        p.userId === req.session.userId && p.isActive
      );
      
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this conversation" });
      }
      
      // Parse and validate message data
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        senderId: req.session.userId,
        contentType: req.body.contentType || 'text'
      });
      
      // Create message
      const message = await storage.createMessage(messageData);
      
      // For the response, include the sender details
      const sender = await storage.getUser(req.session.userId);
      if (!sender) {
        return res.status(500).json({ message: "Error retrieving sender details" });
      }
      
      const { password: _, ...senderWithoutPassword } = sender;
      
      const messageWithSender = {
        ...message,
        sender: senderWithoutPassword
      };
      
      // Mark conversation as read for the sender
      await storage.updateParticipantLastRead(conversationId, req.session.userId);
      
      // Broadcast this message to all connected WebSocket clients who are participants
      broadcastMessageToConversation(conversationId, messageWithSender);
      
      res.status(201).json(messageWithSender);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Error sending message" });
    }
  });
  
  // Session-specific conversation
  app.get("/api/sessions/:id/conversation", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const sessionId = parseInt(req.params.id);
      
      // Verify session exists and user is a participant
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Check if user is a participant in this session
      if (session.tutorId !== req.session.userId && session.learnerId !== req.session.userId) {
        return res.status(403).json({ message: "You are not a participant in this session" });
      }
      
      // Get or create conversation for this session
      let conversation = await storage.getSessionConversation(sessionId);
      
      if (!conversation) {
        // Create a new conversation for this session
        conversation = await storage.createSessionConversation(
          sessionId,
          [session.tutorId, session.learnerId]
        );
      }
      
      // Get messages for this conversation
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const messages = await storage.getConversationMessages(conversation.id, limit, offset);
      
      // Mark conversation as read for this user
      await storage.updateParticipantLastRead(conversation.id, req.session.userId);
      
      res.json({ conversation, messages });
    } catch (error) {
      res.status(500).json({ message: "Error fetching session conversation" });
    }
  });
  // Site settings routes
  app.get("/api/site-settings", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string;
      const settings = await storage.getAllSiteSettings(category);
      
      // Cache settings for 1 minute
      res.set('Cache-Control', 'public, max-age=60');
      res.json(settings);
    } catch (error) {
      console.error('Error fetching site settings:', error);
      res.status(500).json({ message: "Error fetching site settings" });
    }
  });

  app.get("/api/site-settings/:key", async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSiteSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: `Setting with key '${key}' not found` });
      }
      
      // Cache individual settings for 1 minute
      res.set('Cache-Control', 'public, max-age=60');
      res.json(setting);
    } catch (error) {
      console.error(`Error fetching site setting with key ${req.params.key}:`, error);
      res.status(500).json({ message: "Error fetching site setting" });
    }
  });

  app.post("/api/site-settings", async (req: Request, res: Response) => {
    // Only admins can create/update site settings
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const settingData = insertSiteSettingsSchema.parse(req.body);
      
      // Check if setting already exists
      const existingSetting = await storage.getSiteSetting(settingData.key);
      
      let setting: SiteSetting;
      if (existingSetting) {
        // Update existing setting
        setting = await storage.updateSiteSetting(
          settingData.key, 
          settingData.value, 
          req.session.userId
        ) as SiteSetting;
      } else {
        // Create new setting
        setting = await storage.createSiteSetting({
          ...settingData,
          updatedBy: req.session.userId
        });
      }
      
      // Log the action
      await storage.logActivity({
        userId: req.session.userId,
        action: existingSetting ? 'SITE_SETTING_UPDATED' : 'SITE_SETTING_CREATED',
        targetId: setting.id,
        targetType: 'site_setting',
        metadata: { key: setting.key, category: setting.category }
      });
      
      res.status(existingSetting ? 200 : 201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid setting data", errors: error.errors });
      }
      console.error('Error creating/updating site setting:', error);
      res.status(500).json({ message: "Error creating/updating site setting" });
    }
  });

  app.put("/api/site-settings/:key", async (req: Request, res: Response) => {
    // Only admins can update site settings
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value || typeof value !== 'string') {
        return res.status(400).json({ message: "Value is required and must be a string" });
      }
      
      const setting = await storage.getSiteSetting(key);
      if (!setting) {
        return res.status(404).json({ message: `Setting with key '${key}' not found` });
      }
      
      const updatedSetting = await storage.updateSiteSetting(
        key, 
        value, 
        req.session.userId
      );
      
      if (!updatedSetting) {
        return res.status(500).json({ message: "Failed to update setting" });
      }
      
      // Log the action
      await storage.logActivity({
        userId: req.session.userId,
        action: 'SITE_SETTING_UPDATED',
        targetId: setting.id,
        targetType: 'site_setting',
        metadata: { key: setting.key, category: setting.category }
      });
      
      res.json(updatedSetting);
    } catch (error) {
      console.error(`Error updating site setting with key ${req.params.key}:`, error);
      res.status(500).json({ message: "Error updating site setting" });
    }
  });

  app.delete("/api/site-settings/:key", async (req: Request, res: Response) => {
    // Only admins can delete site settings
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { key } = req.params;
      const setting = await storage.getSiteSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: `Setting with key '${key}' not found` });
      }
      
      const success = await storage.deleteSiteSetting(key);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete setting" });
      }
      
      // Log the action
      await storage.logActivity({
        userId: req.session.userId,
        action: 'SITE_SETTING_DELETED',
        targetType: 'site_setting',
        metadata: { key, category: setting.category }
      });
      
      res.status(204).end();
    } catch (error) {
      console.error(`Error deleting site setting with key ${req.params.key}:`, error);
      res.status(500).json({ message: "Error deleting site setting" });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time messaging
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });
  
  // Store active connections with user IDs
  const clients = new Map<number, Set<WebSocket>>();
  
  // Helper function to broadcast message to all participants of a conversation
  function broadcastMessageToConversation(conversationId: number, message: Message & { sender: any }) {
    storage.getConversationParticipants(conversationId)
      .then(participants => {
        participants.forEach(participant => {
          const userConnections = clients.get(participant.userId);
          if (userConnections) {
            const payload = JSON.stringify({
              type: 'message',
              conversationId,
              message
            });
            
            userConnections.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
              }
            });
          }
        });
      })
      .catch(err => {
        console.error('Error broadcasting message:', err);
      });
  }
  
  wss.on('connection', (ws: WebSocket, req) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('WebSocket connection established');
    }
    
    // Find the user ID from the session
    (req as any).session = undefined;
    
    const sessionParser = (req: any, res: any, next: () => void) => {
      session({
        secret: process.env.SESSION_SECRET || "tuta-link-secret",
        resave: false,
        saveUninitialized: false,
        store: new MemoryStoreFactory({
          checkPeriod: 86400000,
        }),
      })(req, res, next);
    };
    
    sessionParser(req, {}, async () => {
      const userId = (req as any).session?.userId;
      
      if (!userId) {
        ws.close(1008, 'Not authenticated');
        return;
      }
      
      // Store connection with user ID
      if (!clients.has(userId)) {
        clients.set(userId, new Set());
      }
      clients.get(userId)?.add(ws);
      
      // Send initial connection success message
      ws.send(JSON.stringify({ 
        type: 'connection', 
        status: 'connected',
        userId
      }));
      
      // Handle WebSocket messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Handle different message types
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });
      
      // Handle WebSocket closure
      ws.on('close', () => {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`WebSocket connection closed for user ${userId}`);
        }
        clients.get(userId)?.delete(ws);
        if (clients.get(userId)?.size === 0) {
          clients.delete(userId);
        }
      });
    });
  });
  
  return httpServer;
}
