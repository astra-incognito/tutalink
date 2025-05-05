import session from "express-session";
import {
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
  users,
  courses,
  tutorCourses,
  availability,
  sessions,
  reviews
} from "@shared/schema";

// We'll import DatabaseStorage at the end of the file to avoid circular dependencies

export interface IStorage {
  // Session store for express-session
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  verifyUser(id: number): Promise<User | undefined>;
  updateRefreshToken(id: number, token: string): Promise<User | undefined>;
  getTutors(options?: { courseId?: number; department?: string; minGpa?: number; isPaid?: boolean }): Promise<UserWithDetails[]>;
  getTutorDetails(id: number): Promise<UserWithDetails | undefined>;

  // Course operations
  getCourse(id: number): Promise<Course | undefined>;
  getCourseByCode(code: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  getCourses(): Promise<Course[]>;
  getCoursesByDepartment(department: string): Promise<Course[]>;

  // TutorCourse operations
  getTutorCourses(tutorId: number): Promise<(TutorCourse & { course: Course })[]>;
  createTutorCourse(tutorCourse: InsertTutorCourse): Promise<TutorCourse>;
  updateTutorCourse(id: number, data: Partial<TutorCourse>): Promise<TutorCourse | undefined>;
  deleteTutorCourse(id: number): Promise<boolean>;

  // Availability operations
  getAvailability(tutorId: number): Promise<Availability[]>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  deleteAvailability(id: number): Promise<boolean>;

  // Session operations
  getSession(id: number): Promise<SessionWithDetails | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSessionStatus(id: number, status: string): Promise<Session | undefined>;
  getUserSessions(userId: number, role: 'tutor' | 'learner'): Promise<SessionWithDetails[]>;

  // Review operations
  getReview(id: number): Promise<Review | undefined>;
  createReview(review: InsertReview): Promise<Review>;
  getTutorReviews(tutorId: number): Promise<ReviewWithDetails[]>;
  
  // Notification operations
  getUserNotifications(userId: number): Promise<any[]>;
  createNotification(notification: any): Promise<any>;
  markNotificationAsRead(id: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  
  // Payment operations
  createPayment(payment: any): Promise<any>;
  getSessionPayment(sessionId: number): Promise<any | undefined>;
  updatePaymentStatus(id: number, status: string): Promise<any | undefined>;
}

export class MemStorage implements IStorage {
  sessionStore: session.Store;
  private users: Map<number, User>;
  private courses: Map<number, Course>;
  private tutorCourses: Map<number, TutorCourse>;
  private availabilities: Map<number, Availability>;
  private sessions: Map<number, Session>;
  private reviews: Map<number, Review>;
  private notifications: Map<number, any>;
  private payments: Map<number, any>;
  private idCounters: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.tutorCourses = new Map();
    this.availabilities = new Map();
    this.sessions = new Map();
    this.reviews = new Map();
    this.notifications = new Map();
    this.payments = new Map();
    this.idCounters = {
      users: 1,
      courses: 1,
      tutorCourses: 1,
      availabilities: 1,
      sessions: 1,
      reviews: 1,
      notifications: 1,
      payments: 1,
    };
    
    // Create a memory store for sessions - using a simple in-memory implementation
    this.sessionStore = new session.MemoryStore();

    // Add some initial courses
    this.initializeCourses();
  }

  private initializeCourses() {
    const initialCourses: InsertCourse[] = [
      { title: "Data Structures", code: "CS201", department: "Computer Science" },
      { title: "Algorithms", code: "CS301", department: "Computer Science" },
      { title: "Web Development", code: "CS410", department: "Computer Science" },
      { title: "Calculus", code: "MATH101", department: "Mathematics" },
      { title: "Linear Algebra", code: "MATH201", department: "Mathematics" },
      { title: "Statistics", code: "MATH301", department: "Mathematics" },
      { title: "Genetics", code: "BIO201", department: "Biology" },
      { title: "Molecular Biology", code: "BIO301", department: "Biology" },
      { title: "Biochemistry", code: "BIO401", department: "Biology" },
    ];

    initialCourses.forEach(course => {
      this.createCourse(course);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.verificationToken === token
    );
  }
  
  async verifyUser(id: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    return this.updateUser(id, { 
      isVerified: true, 
      verificationToken: null 
    });
  }
  
  async updateRefreshToken(id: number, token: string): Promise<User | undefined> {
    return this.updateUser(id, { refreshToken: token });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.idCounters.users++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now,
      averageRating: 0,
      isVerified: false,
      verificationToken: null,
      googleId: null,
      facebookId: null,
      refreshToken: null,
      preferences: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getTutors(options?: { courseId?: number; department?: string; minGpa?: number; isPaid?: boolean }): Promise<UserWithDetails[]> {
    let tutors = Array.from(this.users.values()).filter(user => user.role === 'tutor');
    
    // Apply filters if provided
    if (options) {
      if (options.department) {
        tutors = tutors.filter(tutor => tutor.department === options.department);
      }
      
      if (options.minGpa !== undefined) {
        tutors = tutors.filter(tutor => tutor.gpa !== undefined && tutor.gpa >= options.minGpa);
      }
    }

    // Enhance tutors with additional details
    const tutorsWithDetails: UserWithDetails[] = await Promise.all(
      tutors.map(async tutor => {
        const tutorCourses = await this.getTutorCourses(tutor.id);
        
        // Apply course filter if provided
        if (options?.courseId) {
          const hasCourse = tutorCourses.some(tc => tc.courseId === options.courseId);
          if (!hasCourse) return null;
        }
        
        // Apply paid filter if provided
        if (options?.isPaid !== undefined) {
          const hasPaidCourse = tutorCourses.some(tc => tc.isPaid === options.isPaid);
          if (!hasPaidCourse) return null;
        }
        
        const reviews = await this.getTutorReviews(tutor.id);
        const averageRating = reviews.length 
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
          : 0;
          
        return {
          ...tutor,
          courses: tutorCourses,
          averageRating,
          reviewCount: reviews.length
        };
      })
    );
    
    // Filter out null values (from tutors that didn't match course or paid filters)
    return tutorsWithDetails.filter(Boolean) as UserWithDetails[];
  }

  async getTutorDetails(id: number): Promise<UserWithDetails | undefined> {
    const tutor = await this.getUser(id);
    if (!tutor || tutor.role !== 'tutor') return undefined;
    
    const tutorCourses = await this.getTutorCourses(id);
    const availabilityList = await this.getAvailability(id);
    const reviews = await this.getTutorReviews(id);
    const averageRating = reviews.length 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;
    
    return {
      ...tutor,
      courses: tutorCourses,
      availability: availabilityList,
      averageRating,
      reviewCount: reviews.length
    };
  }

  // Course operations
  async getCourse(id: number): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async getCourseByCode(code: string): Promise<Course | undefined> {
    return Array.from(this.courses.values()).find(
      (course) => course.code === code
    );
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const id = this.idCounters.courses++;
    const course: Course = { ...insertCourse, id };
    this.courses.set(id, course);
    return course;
  }

  async getCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async getCoursesByDepartment(department: string): Promise<Course[]> {
    return Array.from(this.courses.values()).filter(
      course => course.department === department
    );
  }

  // TutorCourse operations
  async getTutorCourses(tutorId: number): Promise<(TutorCourse & { course: Course })[]> {
    const tutorCoursesList = Array.from(this.tutorCourses.values()).filter(
      tc => tc.tutorId === tutorId
    );
    
    return tutorCoursesList.map(tc => {
      const course = this.courses.get(tc.courseId);
      if (!course) throw new Error(`Course with id ${tc.courseId} not found`);
      return { ...tc, course };
    });
  }

  async createTutorCourse(insertTutorCourse: InsertTutorCourse): Promise<TutorCourse> {
    const id = this.idCounters.tutorCourses++;
    const tutorCourse: TutorCourse = { ...insertTutorCourse, id };
    this.tutorCourses.set(id, tutorCourse);
    return tutorCourse;
  }

  async updateTutorCourse(id: number, data: Partial<TutorCourse>): Promise<TutorCourse | undefined> {
    const tutorCourse = this.tutorCourses.get(id);
    if (!tutorCourse) return undefined;

    const updatedTutorCourse = { ...tutorCourse, ...data };
    this.tutorCourses.set(id, updatedTutorCourse);
    return updatedTutorCourse;
  }

  async deleteTutorCourse(id: number): Promise<boolean> {
    return this.tutorCourses.delete(id);
  }

  // Availability operations
  async getAvailability(tutorId: number): Promise<Availability[]> {
    return Array.from(this.availabilities.values()).filter(
      a => a.tutorId === tutorId
    );
  }

  async createAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
    const id = this.idCounters.availabilities++;
    const availability: Availability = { ...insertAvailability, id };
    this.availabilities.set(id, availability);
    return availability;
  }

  async deleteAvailability(id: number): Promise<boolean> {
    return this.availabilities.delete(id);
  }

  // Session operations
  async getSession(id: number): Promise<SessionWithDetails | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const learner = await this.getUser(session.learnerId);
    const tutor = await this.getUser(session.tutorId);
    const course = await this.getCourse(session.courseId);
    
    if (!learner || !tutor || !course) return undefined;
    
    return {
      ...session,
      learner,
      tutor,
      course
    };
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.idCounters.sessions++;
    const session: Session = { ...insertSession, id };
    this.sessions.set(id, session);
    return session;
  }

  async updateSessionStatus(id: number, status: string): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, status };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async getUserSessions(userId: number, role: 'tutor' | 'learner'): Promise<SessionWithDetails[]> {
    const userSessions = Array.from(this.sessions.values()).filter(
      session => role === 'tutor' ? session.tutorId === userId : session.learnerId === userId
    );
    
    const sessionsWithDetails: SessionWithDetails[] = await Promise.all(
      userSessions.map(async session => {
        const learner = await this.getUser(session.learnerId);
        const tutor = await this.getUser(session.tutorId);
        const course = await this.getCourse(session.courseId);
        
        if (!learner || !tutor || !course) {
          throw new Error(`Missing related data for session ${session.id}`);
        }
        
        return {
          ...session,
          learner,
          tutor,
          course
        };
      })
    );
    
    return sessionsWithDetails;
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.idCounters.reviews++;
    const review: Review = { ...insertReview, id };
    this.reviews.set(id, review);
    
    // Update tutor's average rating
    const tutorReviews = await this.getTutorReviews(review.tutorId);
    const averageRating = tutorReviews.reduce((sum, r) => sum + r.rating, 0) / tutorReviews.length;
    await this.updateUser(review.tutorId, { averageRating });
    
    return review;
  }

  async getTutorReviews(tutorId: number): Promise<ReviewWithDetails[]> {
    const tutorReviews = Array.from(this.reviews.values()).filter(
      review => review.tutorId === tutorId
    );
    
    const reviewsWithDetails: ReviewWithDetails[] = await Promise.all(
      tutorReviews.map(async review => {
        const session = await this.getSession(review.sessionId);
        if (!session) throw new Error(`Session with id ${review.sessionId} not found`);
        
        const learner = await this.getUser(review.learnerId);
        const tutor = await this.getUser(review.tutorId);
        if (!learner || !tutor) throw new Error(`User not found for review ${review.id}`);
        
        return {
          ...review,
          learner,
          tutor,
          session,
          course: session.course
        };
      })
    );
    
    return reviewsWithDetails;
  }

  // Notification operations
  async getUserNotifications(userId: number): Promise<any[]> {
    return Array.from(this.notifications.values()).filter(
      notification => notification.userId === userId
    );
  }

  async createNotification(notification: any): Promise<any> {
    const id = this.idCounters.notifications++;
    const newNotification = { ...notification, id };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }

  // Payment operations
  async createPayment(payment: any): Promise<any> {
    const id = this.idCounters.payments++;
    const newPayment = { ...payment, id };
    this.payments.set(id, newPayment);
    return newPayment;
  }

  async getSessionPayment(sessionId: number): Promise<any | undefined> {
    return Array.from(this.payments.values()).find(
      payment => payment.sessionId === sessionId
    );
  }

  async updatePaymentStatus(id: number, status: string): Promise<any | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, status };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
}

// For now, use in-memory storage until we fix the database implementation
export const storage = new MemStorage();
