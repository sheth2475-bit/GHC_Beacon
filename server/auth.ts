import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Express, Request } from "express";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(buf, Buffer.from(hashed, "hex"));
}

declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      email: string;
      passwordHash: string;
      companyId: number | null;
      role: string;
      createdAt: Date;
    }
  }
}

export function setupAuth(app: Express) {
  const PgStore = connectPg(session);

  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) return done(null, false, { message: "Invalid email or password" });
        const valid = await comparePasswords(password, user.passwordHash);
        if (!valid) return done(null, false, { message: "Invalid email or password" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || undefined);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({ name, email, passwordHash, role: "admin", companyId: null });

      req.login(user, (err) => {
        if (err) return next(err);
        const { passwordHash: _, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      req.login(user, (err) => {
        if (err) return next(err);
        const { passwordHash: _, ...safeUser } = user;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { passwordHash: _, ...safeUser } = req.user!;
    res.json(safeUser);
  });
}

export function requireAuth(req: Request, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  next();
}

export function requireAdmin(req: Request, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  if (req.user!.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}
