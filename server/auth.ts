import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { db } from "./db";
import { users } from "@shared/schema";
import { storage } from "./storage";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "tuta-link-jwt-secret";
const JWT_EXPIRATION = '7d';

// For email verification
const EMAIL_FROM = "noreply@tutalink.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5000";
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Password hashing
const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// JWT Token functions
export function generateToken(userId: number, role: string): string {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex');
}

// Email verification
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  // In a production app, we would use a proper SMTP service like SendGrid or Mailgun
  const transporter = nodemailer.createTransport({
    host: "smtp.example.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || "",
      pass: process.env.EMAIL_PASSWORD || "",
    },
  });

  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: "Verify your TutaLink account",
    text: `Please verify your email address by clicking on this link: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Welcome to TutaLink!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 15px 0;">Verify Email</a>
        <p>If the button doesn't work, you can also click on this link: <a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>Thank you,<br>The TutaLink Team</p>
      </div>
    `,
  });
}

// Auth setup
export function setupAuth(app: Express): void {
  // Session setup
  const PgStore = connectPgSimple(session);
  const sessionOptions: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "tuta-link-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? 'strict' : 'lax', // CSRF protection
    },
    store: new PgStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
      pruneSessionInterval: 60, // Prune expired sessions every minute
    }),
  };

  // Initialize Passport and sessions
  app.use(session(sessionOptions));
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport Local Strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false, { message: "Invalid username or password" });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  // JWT Strategy
  passport.use(new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await storage.getUser(payload.id);
        if (!user) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  ));

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${FRONTEND_URL}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this googleId
          const [existingUser] = await db.select().from(users).where(eq(users.googleId, profile.id));
          
          if (existingUser) {
            return done(null, existingUser);
          }
          
          // If not, create a new user
          const email = profile.emails && profile.emails[0].value;
          if (!email) {
            return done(null, false, { message: "Email is required" });
          }
          
          // Check if email already exists
          const [userWithEmail] = await db.select().from(users).where(eq(users.email, email));
          
          if (userWithEmail) {
            // Link Google account to existing user
            const [updatedUser] = await db
              .update(users)
              .set({ googleId: profile.id })
              .where(eq(users.id, userWithEmail.id))
              .returning();
              
            return done(null, updatedUser);
          }
          
          // Create new user
          const randomPassword = randomBytes(16).toString("hex");
          // Use type assertion to handle additional OAuth fields
          const newUser = await storage.createUser({
            username: `google_${profile.id}`,
            password: await hashPassword(randomPassword),
            fullName: profile.displayName || "Google User",
            email,
            department: "Not Specified",
            yearOfStudy: 1,
            role: "learner",
            isVerified: true,
          } as any); // Use type assertion to avoid TypeScript errors
          
          return done(null, newUser);
        } catch (error) {
          return done(error, false);
        }
      }
    ));
  }

  // Facebook Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${FRONTEND_URL}/api/auth/facebook/callback`,
        profileFields: ['id', 'emails', 'name'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this facebookId
          const [existingUser] = await db.select().from(users).where(eq(users.facebookId, profile.id));
          
          if (existingUser) {
            return done(null, existingUser);
          }
          
          // If not, create a new user
          const email = profile.emails && profile.emails[0].value;
          if (!email) {
            return done(null, false, { message: "Email is required" });
          }
          
          // Check if email already exists
          const [userWithEmail] = await db.select().from(users).where(eq(users.email, email));
          
          if (userWithEmail) {
            // Link Facebook account to existing user
            const [updatedUser] = await db
              .update(users)
              .set({ facebookId: profile.id })
              .where(eq(users.id, userWithEmail.id))
              .returning();
              
            return done(null, updatedUser);
          }
          
          // Create new user
          const randomPassword = randomBytes(16).toString("hex");
          // Use type assertion to handle additional OAuth fields
          const newUser = await storage.createUser({
            username: `fb_${profile.id}`,
            password: await hashPassword(randomPassword),
            fullName: profile.displayName || "Facebook User",
            email,
            department: "Not Specified",
            yearOfStudy: 1,
            role: "learner",
          } as any); // Use type assertion to avoid TypeScript errors
          
          // After creating the user, update with facebookId and set as verified
          if (newUser) {
            await db.update(users)
              .set({ 
                facebookId: profile.id,
                isVerified: true 
              })
              .where(eq(users.id, newUser.id));
          }
          
          return done(null, newUser);
        } catch (error) {
          return done(error, false);
        }
      }
    ));
  }

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Express middleware to check if user is authenticated
  app.use((req: Request, res: Response, next: NextFunction) => {
    // If there's a JWT in the authorization header, try to authenticate with it
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { id: number, role: string };
        
        // If already authenticated via session, continue
        if (req.isAuthenticated()) {
          return next();
        }
        
        // Otherwise, find the user and log them in
        storage.getUser(payload.id)
          .then(user => {
            if (user) {
              req.login(user, (err) => {
                if (err) {
                  return next(err);
                }
                next();
              });
            } else {
              next();
            }
          })
          .catch(err => next(err));
      } catch (error) {
        // Invalid token, but we'll still continue to next middleware
        next();
      }
    } else {
      next();
    }
  });
}

// Helper middleware for API endpoints that require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  next();
}

// Helper middleware for role-based authorization
export function requireRole(role: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    
    const userRole = (req.user as any).role;
    const roles = Array.isArray(role) ? role : [role];
    
    if (!roles.includes(userRole)) {
      res.status(403).json({ message: "Access denied" });
      return;
    }
    
    next();
  };
}

// Helper middleware to check if user is verified
export function requireVerified(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  
  const user = req.user as any;
  if (!user.isVerified) {
    res.status(403).json({ message: "Email verification required" });
    return;
  }
  
  next();
}