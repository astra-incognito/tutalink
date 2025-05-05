import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from 'express-session';
import MemoryStore from 'memorystore';
import { z } from "zod";
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
  insertErrorLogSchema
} from "@shared/schema";

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
      cookie: { maxAge: 86400000 }, // 24 hours
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "tuta-link-secret",
      store: new MemoryStoreFactory({
        checkPeriod: 86400000, // clear expired entries every 24h
      }),
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
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid login data", errors: error.errors });
      }
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
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
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
      const filters = tutorSearchSchema.parse({
        courseId: req.query.courseId ? parseInt(req.query.courseId as string) : undefined,
        department: req.query.department as string || undefined,
        minGpa: req.query.minGpa ? parseFloat(req.query.minGpa as string) : undefined,
        isPaid: req.query.isPaid ? req.query.isPaid === 'true' : undefined
      });
      
      const tutors = await storage.getTutors(filters);
      
      // Process tutors to respect GPA visibility settings
      // Note: For tutors, GPA is always shown as it's required to be public
      // We keep this code here for completeness and consistency
      const processedTutors = tutors.map(tutor => {
        return {
          ...tutor,
          // Only show GPA if showGPA is true or if role is tutor
          gpa: (tutor.showGPA === true || tutor.role === 'tutor') ? tutor.gpa : null
        };
      });
      
      res.json(processedTutors);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid filter parameters", errors: error.errors });
      }
      res.status(500).json({ message: "Error fetching tutors" });
    }
  });

  app.get("/api/tutors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tutor = await storage.getTutorDetails(id);
      
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
      
      res.json(processedTutor);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tutor details" });
    }
  });

  // Tutor course management
  app.post("/api/tutor/courses", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.role !== "tutor") {
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
      const role = req.session.role as 'tutor' | 'learner';
      const sessions = await storage.getUserSessions(req.session.userId, role);
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

  const httpServer = createServer(app);
  return httpServer;
}
