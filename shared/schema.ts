import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json, date, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  department: text("department").notNull(),
  yearOfStudy: integer("year_of_study").notNull(),
  role: text("role", { enum: ['admin', 'tutor', 'learner'] }).notNull(),
  gpa: doublePrecision("gpa"),
  showGPA: boolean("show_gpa").default(false), // Learners can choose to show GPA or not
  bio: text("bio"),
  averageRating: doublePrecision("average_rating").default(0),
  isVerified: boolean("is_verified").default(false),
  verificationToken: text("verification_token"),
  profileImage: text("profile_image"),
  googleId: text("google_id").unique(),
  facebookId: text("facebook_id").unique(),
  refreshToken: text("refresh_token"),
  preferences: json("preferences").$type<{
    notifications: boolean;
    darkMode: boolean;
    emailUpdates: boolean;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  code: text("code").notNull().unique(),
  department: text("department").notNull(),
});

export const tutorCourses = pgTable("tutor_courses", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  isPaid: boolean("is_paid").default(false),
  hourlyRate: doublePrecision("hourly_rate"),
});

export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 for Sunday to Saturday
  startTime: text("start_time").notNull(), // e.g., "09:00"
  endTime: text("end_time").notNull(), // e.g., "10:00"
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  learnerId: integer("learner_id").notNull().references(() => users.id),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  status: text("status").notNull().default('pending'), // pending, accepted, rejected, completed, cancelled
  scheduleDate: timestamp("schedule_date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  location: text("location").notNull(), // virtual or location name
  price: doublePrecision("price"),
  isPaid: boolean("is_paid").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id),
  learnerId: integer("learner_id").notNull().references(() => users.id),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'system', 'session', 'message', etc.
  isRead: boolean("is_read").default(false),
  link: text("link"), // Optional link to navigate when clicked
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id),
  learnerId: integer("learner_id").notNull().references(() => users.id),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull(), // 'pending', 'completed', 'failed', 'refunded'
  paymentMethod: text("payment_method").notNull(), // 'card', 'paypal', etc.
  stripePaymentId: text("stripe_payment_id"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Analytics tables
export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'login', 'logout', 'search', 'view_profile', 'book_session', etc.
  targetId: integer("target_id"), // Optional, references another entity like a tutor or course
  targetType: text("target_type"), // 'tutor', 'course', 'session', etc.
  metadata: json("metadata"), // Additional data related to the action
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const analyticsMetrics = pgTable("analytics_metrics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  metricType: text("metric_type").notNull(), // 'daily_active_users', 'new_users', 'sessions_booked', 'sessions_completed', etc.
  value: integer("value").notNull(),
  metadata: json("metadata"), // Additional information about the metric
});

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // Optional: could be anonymous
  path: text("path").notNull(),
  queryParams: text("query_params"),
  referrer: text("referrer"),
  duration: integer("duration"), // Time spent on page in seconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const searchAnalytics = pgTable("search_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // Optional: could be anonymous
  searchTerm: text("search_term").notNull(),
  filters: json("filters"), // Filters applied, e.g. department, course, etc.
  resultCount: integer("result_count").notNull(),
  clickedResult: integer("clicked_result"), // ID of the clicked result, if any
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // Optional: could be anonymous
  errorType: text("error_type").notNull(),
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  url: text("url").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Messaging system tables
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title"), // Optional title (e.g., for group conversations or better organization)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at"),
  sessionId: integer("session_id").references(() => sessions.id), // Optional link to a session (for session-related conversations)
});

export const conversationParticipants = pgTable("conversation_participants", {
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastReadAt: timestamp("last_read_at"), // Track when user last read the conversation
  isActive: boolean("is_active").notNull().default(true), // Allow users to leave a conversation
  role: text("role").notNull().default('member'), // 'member', 'admin' (for group chats)
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.conversationId, table.userId] }),
  };
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  contentType: text("content_type").notNull().default('text'), // 'text', 'image', 'file', etc.
  attachment: text("attachment"), // URL to attachment if any
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users)
  .omit({ 
    id: true, 
    averageRating: true, 
    isVerified: true, 
    verificationToken: true, 
    googleId: true, 
    facebookId: true, 
    refreshToken: true, 
    createdAt: true,
    preferences: true
  });

export const insertCourseSchema = createInsertSchema(courses)
  .omit({ id: true });

export const insertTutorCourseSchema = createInsertSchema(tutorCourses)
  .omit({ id: true });

export const insertAvailabilitySchema = createInsertSchema(availability)
  .omit({ id: true });

export const insertSessionSchema = createInsertSchema(sessions)
  .omit({ id: true, createdAt: true });

export const insertReviewSchema = createInsertSchema(reviews)
  .omit({ id: true, createdAt: true });

export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({ id: true, isRead: true, createdAt: true });

export const insertPaymentSchema = createInsertSchema(payments)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertUserActivitySchema = createInsertSchema(userActivity)
  .omit({ id: true, createdAt: true });

export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics)
  .omit({ id: true });

export const insertPageViewSchema = createInsertSchema(pageViews)
  .omit({ id: true, createdAt: true });

export const insertSearchAnalyticsSchema = createInsertSchema(searchAnalytics)
  .omit({ id: true, createdAt: true });

export const insertErrorLogSchema = createInsertSchema(errorLogs)
  .omit({ id: true, createdAt: true });

// Messaging schema
export const insertConversationSchema = createInsertSchema(conversations)
  .omit({ id: true, createdAt: true, updatedAt: true, lastMessageAt: true });

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants)
  .omit({ joinedAt: true, lastReadAt: true });

export const insertMessageSchema = createInsertSchema(messages)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Custom Zod schemas for frontend validation
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  department: z.string().min(1, "Department is required"),
  yearOfStudy: z.number().int().min(1).max(10),
  role: z.enum(["admin", "tutor", "learner"]),
  gpa: z.number().optional(),
  showGPA: z.boolean().optional(),
  bio: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const tutorSearchSchema = z.object({
  courseId: z.number().optional(),
  department: z.string().optional(),
  minGpa: z.number().optional(),
  isPaid: z.boolean().optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type TutorCourse = typeof tutorCourses.$inferSelect;
export type InsertTutorCourse = z.infer<typeof insertTutorCourseSchema>;
export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// Analytics types
export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;
export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type SearchAnalytic = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytic = z.infer<typeof insertSearchAnalyticsSchema>;
export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;

export type UserWithDetails = User & {
  courses?: (TutorCourse & { course: Course })[];
  availability?: Availability[];
  averageRating?: number;
  reviewCount?: number;
};

export type SessionWithDetails = Session & {
  learner: User;
  tutor: User;
  course: Course;
  review?: Review;
};

export type ReviewWithDetails = Review & {
  learner: User;
  tutor: User;
  session: Session;
  course: Course;
};

// Messaging types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Detailed messaging types
export type ConversationWithParticipants = Conversation & {
  participants: (ConversationParticipant & { user: User })[];
  lastMessage?: Message;
  unreadCount?: number;
};

export type MessageWithSender = Message & {
  sender: User;
};
