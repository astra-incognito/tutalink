import { eq, and, or, gte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  courses,
  tutorCourses,
  availability,
  sessions,
  reviews,
  notifications,
  payments,
  User,
  InsertUser,
  Course,
  InsertCourse,
  TutorCourse,
  InsertTutorCourse,
  Availability,
  InsertAvailability,
  Session,
  InsertSession,
  Review,
  InsertReview,
  UserWithDetails,
  SessionWithDetails,
  ReviewWithDetails,
} from "@shared/schema";
import { IStorage } from "./storage";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

const PostgresSessionStore = connectPgSimple(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async verifyUser(id: number): Promise<User | undefined> {
    return this.updateUser(id, { isVerified: true, verificationToken: null });
  }

  async updateRefreshToken(id: number, token: string): Promise<User | undefined> {
    return this.updateUser(id, { refreshToken: token });
  }

  async getTutors(options?: {
    courseId?: number;
    department?: string;
    minGpa?: number;
    isPaid?: boolean;
  }): Promise<UserWithDetails[]> {
    let query = db
      .select()
      .from(users)
      .where(eq(users.role, "tutor"));

    const tutors = await query;
    
    // Apply filters
    const filteredTutors = await Promise.all(
      tutors.map(async (tutor) => {
        const tutorWithDetails = { ...tutor } as UserWithDetails;
        
        // Get tutor courses
        const tutorCoursesWithDetails = await this.getTutorCourses(tutor.id);
        tutorWithDetails.courses = tutorCoursesWithDetails;
        
        // Get availability
        tutorWithDetails.availability = await this.getAvailability(tutor.id);
        
        // Get reviews
        const reviews = await this.getTutorReviews(tutor.id);
        tutorWithDetails.reviewCount = reviews.length;
        
        // Calculate average rating
        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          tutorWithDetails.averageRating = totalRating / reviews.length;
        } else {
          tutorWithDetails.averageRating = 0;
        }
        
        return tutorWithDetails;
      })
    );
    
    // Apply filters after getting detailed information
    const result = filteredTutors.filter((tutor) => {
      // Course filter
      if (options?.courseId) {
        const hasCourse = tutor.courses?.some(
          (tc) => tc.courseId === options.courseId
        );
        if (!hasCourse) return false;
      }
      
      // Department filter
      if (options?.department) {
        const hasDepartment = tutor.courses?.some(
          (tc) => tc.course.department === options.department
        );
        if (!hasDepartment) return false;
      }
      
      // GPA filter
      if (options?.minGpa && (!tutor.gpa || tutor.gpa < options.minGpa)) {
        return false;
      }
      
      // Paid filter
      if (options?.isPaid) {
        const hasPaidCourses = tutor.courses?.some((tc) => tc.isPaid);
        if (!hasPaidCourses) return false;
      }
      
      return true;
    });
    
    return result;
  }

  async getTutorDetails(id: number): Promise<UserWithDetails | undefined> {
    const tutor = await this.getUser(id);
    if (!tutor || tutor.role !== "tutor") return undefined;
    
    const tutorWithDetails = { ...tutor } as UserWithDetails;
    
    // Get tutor courses
    tutorWithDetails.courses = await this.getTutorCourses(id);
    
    // Get availability
    tutorWithDetails.availability = await this.getAvailability(id);
    
    // Get reviews
    const reviews = await this.getTutorReviews(id);
    tutorWithDetails.reviewCount = reviews.length;
    
    // Calculate average rating
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      tutorWithDetails.averageRating = totalRating / reviews.length;
    } else {
      tutorWithDetails.averageRating = 0;
    }
    
    return tutorWithDetails;
  }

  // Course operations
  async getCourse(id: number): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCourseByCode(code: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.code, code));
    return course;
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(insertCourse).returning();
    return course;
  }

  async getCourses(): Promise<Course[]> {
    return db.select().from(courses).orderBy(courses.department, courses.title);
  }

  async getCoursesByDepartment(department: string): Promise<Course[]> {
    return db
      .select()
      .from(courses)
      .where(eq(courses.department, department))
      .orderBy(courses.title);
  }

  // TutorCourse operations
  async getTutorCourses(tutorId: number): Promise<(TutorCourse & { course: Course })[]> {
    const result = await db
      .select({
        tutorCourse: tutorCourses,
        course: courses,
      })
      .from(tutorCourses)
      .innerJoin(courses, eq(tutorCourses.courseId, courses.id))
      .where(eq(tutorCourses.tutorId, tutorId));
    
    return result.map(({ tutorCourse, course }) => ({
      ...tutorCourse,
      course,
    }));
  }

  async createTutorCourse(insertTutorCourse: InsertTutorCourse): Promise<TutorCourse> {
    const [tutorCourse] = await db
      .insert(tutorCourses)
      .values(insertTutorCourse)
      .returning();
    return tutorCourse;
  }

  async updateTutorCourse(id: number, data: Partial<TutorCourse>): Promise<TutorCourse | undefined> {
    const [updatedTutorCourse] = await db
      .update(tutorCourses)
      .set(data)
      .where(eq(tutorCourses.id, id))
      .returning();
    return updatedTutorCourse;
  }

  async deleteTutorCourse(id: number): Promise<boolean> {
    const result = await db.delete(tutorCourses).where(eq(tutorCourses.id, id)).returning();
    return result.length > 0;
  }

  // Availability operations
  async getAvailability(tutorId: number): Promise<Availability[]> {
    return db
      .select()
      .from(availability)
      .where(eq(availability.tutorId, tutorId))
      .orderBy(availability.dayOfWeek, availability.startTime);
  }

  async createAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
    const [newAvailability] = await db
      .insert(availability)
      .values(insertAvailability)
      .returning();
    return newAvailability;
  }

  async deleteAvailability(id: number): Promise<boolean> {
    const result = await db.delete(availability).where(eq(availability.id, id)).returning();
    return result.length > 0;
  }

  // Session operations
  async getSession(id: number): Promise<SessionWithDetails | undefined> {
    const result = await db
      .select({
        session: sessions,
        learner: users,
        tutor: users,
        course: courses,
      })
      .from(sessions)
      .innerJoin(courses, eq(sessions.courseId, courses.id))
      .innerJoin(users.as('learner'), eq(sessions.learnerId, users.as('learner').id))
      .innerJoin(users.as('tutor'), eq(sessions.tutorId, users.as('tutor').id))
      .where(eq(sessions.id, id));
    
    if (result.length === 0) return undefined;
    
    const { session, learner, tutor, course } = result[0];
    
    // Get review if exists
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.sessionId, id));
    
    return {
      ...session,
      learner,
      tutor,
      course,
      review,
    };
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(insertSession).returning();
    return session;
  }

  async updateSessionStatus(id: number, status: string): Promise<Session | undefined> {
    const [updatedSession] = await db
      .update(sessions)
      .set({ status })
      .where(eq(sessions.id, id))
      .returning();
    return updatedSession;
  }

  async getUserSessions(userId: number, role: 'tutor' | 'learner'): Promise<SessionWithDetails[]> {
    const userField = role === 'tutor' ? sessions.tutorId : sessions.learnerId;
    
    const result = await db
      .select({
        session: sessions,
        learner: users.as('learner'),
        tutor: users.as('tutor'),
        course: courses,
      })
      .from(sessions)
      .innerJoin(courses, eq(sessions.courseId, courses.id))
      .innerJoin(users.as('learner'), eq(sessions.learnerId, users.as('learner').id))
      .innerJoin(users.as('tutor'), eq(sessions.tutorId, users.as('tutor').id))
      .where(eq(userField, userId))
      .orderBy(sessions.scheduleDate);
    
    // Get reviews for these sessions
    const sessionIds = result.map(r => r.session.id);
    const sessionReviews = await db
      .select()
      .from(reviews)
      .where(sql`${reviews.sessionId} IN ${sessionIds}`);
    
    // Map reviews to sessions
    return result.map(({ session, learner, tutor, course }) => {
      const review = sessionReviews.find(r => r.sessionId === session.id);
      return {
        ...session,
        learner,
        tutor,
        course,
        review,
      };
    });
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(insertReview).returning();
    return review;
  }

  async getTutorReviews(tutorId: number): Promise<ReviewWithDetails[]> {
    const result = await db
      .select({
        review: reviews,
        learner: users,
        tutor: users.as('tutor'),
        session: sessions,
        course: courses,
      })
      .from(reviews)
      .innerJoin(sessions, eq(reviews.sessionId, sessions.id))
      .innerJoin(courses, eq(sessions.courseId, courses.id))
      .innerJoin(users, eq(reviews.learnerId, users.id))
      .innerJoin(users.as('tutor'), eq(reviews.tutorId, users.as('tutor').id))
      .where(eq(reviews.tutorId, tutorId))
      .orderBy(reviews.createdAt);
    
    return result.map(({ review, learner, tutor, session, course }) => ({
      ...review,
      learner,
      tutor,
      session,
      course,
    }));
  }

  // Notification operations
  async getUserNotifications(userId: number): Promise<any[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(sql`${notifications.createdAt} DESC`);
  }

  async createNotification(notification: any): Promise<any> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.id, id))
      .returning();
    return result.length > 0;
  }

  // Payment operations
  async createPayment(payment: any): Promise<any> {
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getSessionPayment(sessionId: number): Promise<any | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.sessionId, sessionId));
    return payment;
  }

  async updatePaymentStatus(id: number, status: string): Promise<any | undefined> {
    const [updatedPayment] = await db
      .update(payments)
      .set({ status })
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }
}