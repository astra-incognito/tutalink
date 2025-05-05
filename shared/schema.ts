import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json } from "drizzle-orm/pg-core";
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
  role: text("role").notNull(),
  gpa: doublePrecision("gpa"),
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

// Custom Zod schemas for frontend validation
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  department: z.string().min(1, "Department is required"),
  yearOfStudy: z.number().int().min(1).max(10),
  role: z.enum(["tutor", "learner"]),
  gpa: z.number().optional(),
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
