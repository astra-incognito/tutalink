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
  UserActivity,
  InsertUserActivity,
  AnalyticsMetric,
  InsertAnalyticsMetric,
  PageView,
  InsertPageView,
  SearchAnalytic,
  InsertSearchAnalytic,
  ErrorLog,
  InsertErrorLog,
  Conversation,
  InsertConversation,
  ConversationParticipant,
  InsertConversationParticipant,
  Message,
  InsertMessage,
  ConversationWithParticipants,
  MessageWithSender,
  users,
  courses,
  tutorCourses,
  availability,
  sessions,
  reviews,
  userActivity,
  analyticsMetrics,
  pageViews,
  searchAnalytics,
  errorLogs,
  conversations,
  conversationParticipants,
  messages
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
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  getSessionCount(): Promise<number>;
  getActiveUserCount(days: number): Promise<number>;
  getConversionRate(): Promise<number>;
  getTopSearches(limit: number): Promise<{term: string, count: number}[]>;
  getUserGrowthData(months: number): Promise<{date: string, count: number, change: number}[]>;

  // Analytics operations
  // User Activity tracking - including login, access and app events
  logActivity(activity: { 
    userId: number | null;
    action: string;
    metadata?: any;
    targetId?: number | null;
    targetType?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<UserActivity>;
  logUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivities(userId?: number, action?: string, startDate?: Date, endDate?: Date): Promise<UserActivity[]>;
  
  // Analytics metrics
  saveAnalyticsMetric(metric: InsertAnalyticsMetric): Promise<AnalyticsMetric>;
  getAnalyticsMetrics(metricType: string, startDate?: Date, endDate?: Date): Promise<AnalyticsMetric[]>;
  
  // Page views
  logPageView(pageView: InsertPageView): Promise<PageView>;
  getPageViews(path?: string, startDate?: Date, endDate?: Date): Promise<PageView[]>;
  getMostViewedPages(limit?: number): Promise<{path: string, count: number}[]>;
  
  // Search analytics
  logSearch(search: InsertSearchAnalytic): Promise<SearchAnalytic>;
  getPopularSearches(limit?: number): Promise<{term: string, count: number}[]>;
  
  // Error logging
  logError(error: InsertErrorLog): Promise<ErrorLog>;
  getErrors(errorType?: string, startDate?: Date, endDate?: Date): Promise<ErrorLog[]>;
  
  // Messaging operations
  // Conversations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationWithDetails(id: number): Promise<ConversationWithParticipants | undefined>;
  getUserConversations(userId: number): Promise<ConversationWithParticipants[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation | undefined>;
  
  // Participants
  addParticipantToConversation(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  getConversationParticipants(conversationId: number): Promise<(ConversationParticipant & { user: User })[]>;
  updateParticipantLastRead(conversationId: number, userId: number): Promise<ConversationParticipant | undefined>;
  removeParticipantFromConversation(conversationId: number, userId: number): Promise<boolean>;
  
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getConversationMessages(conversationId: number, limit?: number, offset?: number): Promise<MessageWithSender[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<boolean>;
  getUnreadMessageCount(conversationId: number, userId: number): Promise<number>;
  
  // Find or create conversation between users
  findOrCreateConversationBetweenUsers(userIds: number[]): Promise<Conversation>;
  
  // Session-related conversations
  getSessionConversation(sessionId: number): Promise<ConversationWithParticipants | undefined>;
  createSessionConversation(sessionId: number, participantIds: number[]): Promise<Conversation>;
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
  // Analytics collections
  private userActivities: Map<number, UserActivity>;
  private analyticsMetrics: Map<number, AnalyticsMetric>;
  private pageViews: Map<number, PageView>;
  private searchAnalytics: Map<number, SearchAnalytic>;
  private errorLogs: Map<number, ErrorLog>;
  private idCounters: { [key: string]: number };

  // Messaging collections
  private conversations: Map<number, Conversation>;
  private conversationParticipants: Map<string, ConversationParticipant>; // key: `${conversationId}-${userId}`
  private messages: Map<number, Message>;

  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.tutorCourses = new Map();
    this.availabilities = new Map();
    this.sessions = new Map();
    this.reviews = new Map();
    this.notifications = new Map();
    this.payments = new Map();
    
    // Initialize analytics collections
    this.userActivities = new Map();
    this.analyticsMetrics = new Map();
    this.pageViews = new Map();
    this.searchAnalytics = new Map();
    this.errorLogs = new Map();
    
    // Initialize messaging collections
    this.conversations = new Map();
    this.conversationParticipants = new Map();
    this.messages = new Map();
    
    this.idCounters = {
      users: 1,
      courses: 1,
      tutorCourses: 1,
      availabilities: 1,
      sessions: 1,
      reviews: 1,
      notifications: 1,
      payments: 1,
      userActivities: 1,
      analyticsMetrics: 1,
      pageViews: 1,
      searchAnalytics: 1,
      errorLogs: 1,
      conversations: 1,
      messages: 1,
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
      
      // For tutors, GPA is always shown
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
    
    // For tutors, GPA is always shown so no need to check showGPA
    
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

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserCount(): Promise<number> {
    return this.users.size;
  }

  async getSessionCount(): Promise<number> {
    return this.sessions.size;
  }

  async getActiveUserCount(days: number): Promise<number> {
    const now = new Date();
    const cutoffDate = new Date(now.setDate(now.getDate() - days));

    // Get unique active users from user activities within the specified time frame
    const activeUserIds = new Set<number>();
    Array.from(this.userActivities.values()).forEach(activity => {
      if (activity.userId !== null && activity.createdAt >= cutoffDate) {
        activeUserIds.add(activity.userId);
      }
    });

    return activeUserIds.size;
  }

  async getConversionRate(): Promise<number> {
    // Number of learners who have booked at least one session
    const learnersWithSessions = new Set<number>();
    Array.from(this.sessions.values()).forEach(session => {
      learnersWithSessions.add(session.learnerId);
    });

    // Total number of learners
    const totalLearners = Array.from(this.users.values()).filter(
      user => user.role === 'learner'
    ).length;

    if (totalLearners === 0) return 0;
    return (learnersWithSessions.size / totalLearners) * 100;
  }

  async getTopSearches(limit: number): Promise<{term: string, count: number}[]> {
    // Group searches by term and count occurrences
    const searchCounts = new Map<string, number>();
    Array.from(this.searchAnalytics.values()).forEach(search => {
      const count = searchCounts.get(search.searchTerm) || 0;
      searchCounts.set(search.searchTerm, count + 1);
    });

    // Convert to array and sort by count
    return Array.from(searchCounts.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getUserGrowthData(months: number): Promise<{date: string, count: number, change: number}[]> {
    const now = new Date();
    const result: {date: string, count: number, change: number}[] = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const currentDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = i > 0 
        ? new Date(now.getFullYear(), now.getMonth() - i + 1, 1) 
        : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      // Count users created in this month
      const usersInMonth = Array.from(this.users.values()).filter(
        user => user.createdAt >= currentDate && user.createdAt < nextDate
      ).length;
      
      // Format date as month name and year
      const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Calculate change percentage from previous month
      const change = result.length > 0 
        ? ((usersInMonth / result[result.length - 1].count) - 1) * 100 
        : 0;
      
      result.push({
        date: dateStr,
        count: usersInMonth,
        change: Math.round(change)
      });
    }
    
    return result;
  }

  // Analytics methods - User Activity tracking
  
  // Enhanced and optimized activity logging for faster tracking and analysis
  async logActivity(activity: { 
    userId: number | null;
    action: string;
    metadata?: any;
    targetId?: number | null;
    targetType?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<UserActivity> {
    const id = this.idCounters.userActivities++;
    const now = new Date();
    
    // Create a standardized activity record with defaults for missing fields
    const userActivity: UserActivity = {
      id,
      createdAt: now,
      userId: activity.userId,
      action: activity.action,
      targetId: activity.targetId || null,
      targetType: activity.targetType || null,
      metadata: activity.metadata || {},
      ipAddress: activity.ipAddress || null,
      userAgent: activity.userAgent || null
    };
    
    // Fast storage without additional validation
    this.userActivities.set(id, userActivity);
    return userActivity;
  }
  
  async logUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const id = this.idCounters.userActivities++;
    const now = new Date();
    const userActivity: UserActivity = {
      ...activity,
      id,
      createdAt: now
    };
    this.userActivities.set(id, userActivity);
    return userActivity;
  }

  async getUserActivities(userId?: number, action?: string, startDate?: Date, endDate?: Date): Promise<UserActivity[]> {
    let activities = Array.from(this.userActivities.values());
    
    if (userId !== undefined) {
      activities = activities.filter(activity => activity.userId === userId);
    }
    
    if (action) {
      activities = activities.filter(activity => activity.action === action);
    }
    
    if (startDate) {
      activities = activities.filter(activity => activity.createdAt >= startDate);
    }
    
    if (endDate) {
      activities = activities.filter(activity => activity.createdAt <= endDate);
    }
    
    // Sort by creation date, most recent first
    return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Analytics metrics
  async saveAnalyticsMetric(metric: InsertAnalyticsMetric): Promise<AnalyticsMetric> {
    const id = this.idCounters.analyticsMetrics++;
    const analyticsMetric: AnalyticsMetric = {
      ...metric,
      id
    };
    this.analyticsMetrics.set(id, analyticsMetric);
    return analyticsMetric;
  }

  async getAnalyticsMetrics(metricType: string, startDate?: Date, endDate?: Date): Promise<AnalyticsMetric[]> {
    let metrics = Array.from(this.analyticsMetrics.values())
      .filter(metric => metric.metricType === metricType);
    
    if (startDate) {
      metrics = metrics.filter(metric => new Date(metric.date) >= startDate);
    }
    
    if (endDate) {
      metrics = metrics.filter(metric => new Date(metric.date) <= endDate);
    }
    
    // Sort by date, most recent first
    return metrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Page views
  async logPageView(pageView: InsertPageView): Promise<PageView> {
    const id = this.idCounters.pageViews++;
    const now = new Date();
    const view: PageView = {
      ...pageView,
      id,
      createdAt: now
    };
    this.pageViews.set(id, view);
    return view;
  }

  async getPageViews(path?: string, startDate?: Date, endDate?: Date): Promise<PageView[]> {
    let views = Array.from(this.pageViews.values());
    
    if (path) {
      views = views.filter(view => view.path === path);
    }
    
    if (startDate) {
      views = views.filter(view => view.createdAt >= startDate);
    }
    
    if (endDate) {
      views = views.filter(view => view.createdAt <= endDate);
    }
    
    // Sort by creation date, most recent first
    return views.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getMostViewedPages(limit: number = 10): Promise<{path: string, count: number}[]> {
    const views = Array.from(this.pageViews.values());
    const pageCounts: Record<string, number> = {};
    
    // Count page views for each path
    views.forEach(view => {
      if (!pageCounts[view.path]) {
        pageCounts[view.path] = 0;
      }
      pageCounts[view.path]++;
    });
    
    // Convert to array and sort by count (descending)
    const result = Object.entries(pageCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count);
    
    // Return top N results
    return result.slice(0, limit);
  }

  // Search analytics
  async logSearch(search: InsertSearchAnalytic): Promise<SearchAnalytic> {
    const id = this.idCounters.searchAnalytics++;
    const now = new Date();
    const searchAnalytic: SearchAnalytic = {
      ...search,
      id,
      createdAt: now
    };
    this.searchAnalytics.set(id, searchAnalytic);
    return searchAnalytic;
  }

  async getPopularSearches(limit: number = 10): Promise<{term: string, count: number}[]> {
    const searches = Array.from(this.searchAnalytics.values());
    const searchCounts: Record<string, number> = {};
    
    // Count searches for each term
    searches.forEach(search => {
      if (!searchCounts[search.searchTerm]) {
        searchCounts[search.searchTerm] = 0;
      }
      searchCounts[search.searchTerm]++;
    });
    
    // Convert to array and sort by count (descending)
    const result = Object.entries(searchCounts)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count);
    
    // Return top N results
    return result.slice(0, limit);
  }

  // Error logging
  async logError(error: InsertErrorLog): Promise<ErrorLog> {
    const id = this.idCounters.errorLogs++;
    const now = new Date();
    const errorLog: ErrorLog = {
      ...error,
      id,
      createdAt: now
    };
    this.errorLogs.set(id, errorLog);
    return errorLog;
  }

  async getErrors(errorType?: string, startDate?: Date, endDate?: Date): Promise<ErrorLog[]> {
    let errors = Array.from(this.errorLogs.values());
    
    if (errorType) {
      errors = errors.filter(error => error.errorType === errorType);
    }
    
    if (startDate) {
      errors = errors.filter(error => error.createdAt >= startDate);
    }
    
    if (endDate) {
      errors = errors.filter(error => error.createdAt <= endDate);
    }
    
    // Sort by creation date, most recent first
    return errors.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /* MESSAGING SYSTEM METHODS */

  // Conversations
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationWithDetails(id: number): Promise<ConversationWithParticipants | undefined> {
    const conversation = await this.getConversation(id);
    if (!conversation) return undefined;

    const participants = await this.getConversationParticipants(id);
    const messages = await this.getConversationMessages(id, 1); // Get just the last message
    const lastMessage = messages.length > 0 ? messages[0] : undefined;
    
    return {
      ...conversation,
      participants,
      lastMessage
    };
  }

  async getUserConversations(userId: number): Promise<ConversationWithParticipants[]> {
    // Find all conversations where the user is a participant
    const userParticipations = Array.from(this.conversationParticipants.values())
      .filter(p => p.userId === userId && p.isActive);
    
    const conversationsWithDetails: ConversationWithParticipants[] = [];
    
    for (const participation of userParticipations) {
      const conversation = await this.getConversationWithDetails(participation.conversationId);
      if (conversation) {
        // Add unread count
        const unreadCount = await this.getUnreadMessageCount(conversation.id, userId);
        conversationsWithDetails.push({
          ...conversation,
          unreadCount
        });
      }
    }
    
    // Sort by lastMessageAt (most recent first)
    return conversationsWithDetails.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    });
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.idCounters.conversations++;
    const now = new Date();
    
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null
    };
    
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updatedConversation = { 
      ...conversation,
      ...data,
      updatedAt: new Date()
    };
    
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  
  // Participants
  async addParticipantToConversation(participant: InsertConversationParticipant): Promise<ConversationParticipant> {
    const now = new Date();
    const conversationParticipant: ConversationParticipant = {
      ...participant,
      joinedAt: now,
      lastReadAt: now
    };
    
    const key = `${participant.conversationId}-${participant.userId}`;
    this.conversationParticipants.set(key, conversationParticipant);
    return conversationParticipant;
  }

  async getConversationParticipants(conversationId: number): Promise<(ConversationParticipant & { user: User })[]> {
    const participants = Array.from(this.conversationParticipants.values())
      .filter(p => p.conversationId === conversationId && p.isActive);
    
    const participantsWithUsers = await Promise.all(
      participants.map(async p => {
        const user = await this.getUser(p.userId);
        if (!user) throw new Error(`User with id ${p.userId} not found`);
        return { ...p, user };
      })
    );
    
    return participantsWithUsers;
  }

  async updateParticipantLastRead(conversationId: number, userId: number): Promise<ConversationParticipant | undefined> {
    const key = `${conversationId}-${userId}`;
    const participant = this.conversationParticipants.get(key);
    if (!participant) return undefined;
    
    const updatedParticipant = {
      ...participant,
      lastReadAt: new Date()
    };
    
    this.conversationParticipants.set(key, updatedParticipant);
    return updatedParticipant;
  }

  async removeParticipantFromConversation(conversationId: number, userId: number): Promise<boolean> {
    const key = `${conversationId}-${userId}`;
    const participant = this.conversationParticipants.get(key);
    if (!participant) return false;
    
    // Instead of removing, mark as inactive
    const updatedParticipant = {
      ...participant,
      isActive: false
    };
    
    this.conversationParticipants.set(key, updatedParticipant);
    return true;
  }
  
  // Messages
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getConversationMessages(conversationId: number, limit = 50, offset = 0): Promise<MessageWithSender[]> {
    const allMessages = Array.from(this.messages.values())
      .filter(m => m.conversationId === conversationId && !m.isDeleted);
    
    // Sort by createdAt (most recent first for easier pagination)
    allMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply pagination
    const paginatedMessages = allMessages.slice(offset, offset + limit);
    
    // Add sender details
    const messagesWithSender = await Promise.all(
      paginatedMessages.map(async m => {
        const sender = await this.getUser(m.senderId);
        if (!sender) throw new Error(`User with id ${m.senderId} not found`);
        return { ...m, sender };
      })
    );
    
    return messagesWithSender;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.idCounters.messages++;
    const now = new Date();
    
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    };
    
    this.messages.set(id, message);
    
    // Update conversation's lastMessageAt
    await this.updateConversation(insertMessage.conversationId, {
      lastMessageAt: now
    });
    
    return message;
  }

  async deleteMessage(id: number): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    
    // Instead of deleting, mark as deleted
    const updatedMessage = {
      ...message,
      isDeleted: true,
      updatedAt: new Date()
    };
    
    this.messages.set(id, updatedMessage);
    return true;
  }

  async getUnreadMessageCount(conversationId: number, userId: number): Promise<number> {
    const key = `${conversationId}-${userId}`;
    const participant = this.conversationParticipants.get(key);
    if (!participant || !participant.lastReadAt) return 0;
    
    // Count messages that were created after the user last read the conversation
    return Array.from(this.messages.values()).filter(
      m => m.conversationId === conversationId && 
           !m.isDeleted && 
           m.senderId !== userId &&
           m.createdAt > participant.lastReadAt!
    ).length;
  }
  
  // Find or create conversation
  async findOrCreateConversationBetweenUsers(userIds: number[]): Promise<Conversation> {
    if (userIds.length < 2) {
      throw new Error('At least two users are required to create a conversation');
    }
    
    // First, check if a direct conversation between these users already exists
    // We're looking for a conversation where only these exact users are participants
    const allConversations = Array.from(this.conversations.values());
    
    for (const conversation of allConversations) {
      // Skip conversations with a sessionId (those are for specific sessions)
      if (conversation.sessionId) continue;
      
      const participants = await this.getConversationParticipants(conversation.id);
      
      // Only consider active participants
      const activeParticipants = participants.filter(p => p.isActive);
      
      // Check if this conversation includes exactly these users
      if (activeParticipants.length === userIds.length) {
        // Check if all userIds are in the activeParticipants
        const allUsersIncluded = userIds.every(userId => 
          activeParticipants.some(p => p.userId === userId)
        );
        
        if (allUsersIncluded) {
          return conversation;
        }
      }
    }
    
    // If no existing conversation is found, create a new one
    const conversation = await this.createConversation({});
    
    // Add all users as participants
    for (const userId of userIds) {
      await this.addParticipantToConversation({
        conversationId: conversation.id,
        userId,
        isActive: true,
        role: 'member'
      });
    }
    
    return conversation;
  }
  
  // Session-related conversations
  async getSessionConversation(sessionId: number): Promise<ConversationWithParticipants | undefined> {
    const conversation = Array.from(this.conversations.values())
      .find(c => c.sessionId === sessionId);
    
    if (!conversation) return undefined;
    
    return this.getConversationWithDetails(conversation.id);
  }

  async createSessionConversation(sessionId: number, participantIds: number[]): Promise<Conversation> {
    // First check if a conversation for this session already exists
    const existingConversation = await this.getSessionConversation(sessionId);
    if (existingConversation) return existingConversation;
    
    // Get session details for the title
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session with id ${sessionId} not found`);
    
    const conversation = await this.createConversation({
      title: `Session: ${session.course.code}`,
      sessionId
    });
    
    // Add all participants
    for (const userId of participantIds) {
      await this.addParticipantToConversation({
        conversationId: conversation.id,
        userId,
        isActive: true,
        role: 'member'
      });
    }
    
    return conversation;
  }
}

// For now, use in-memory storage until we fix the database implementation
export const storage = new MemStorage();
