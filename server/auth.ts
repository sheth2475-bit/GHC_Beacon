import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Express, Request } from "express";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

function parseUserAgent(ua: string = "") {
  let browser = "Unknown";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";

  let os = "Unknown";
  if (ua.includes("Windows NT")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  let deviceType = "Desktop";
  if (ua.includes("Mobile") || ua.includes("iPhone")) deviceType = "Mobile";
  else if (ua.includes("iPad") || ua.includes("Tablet")) deviceType = "Tablet";

  return { browser, os, deviceType };
}

async function captureLoginLog(req: Request, user: Express.User | null, email: string, status: "success" | "failed") {
  try {
    const ua = (req.headers["user-agent"] as string) || "";
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
    const { browser, os, deviceType } = parseUserAgent(ua);

    let planName: string | null = null;
    if (user?.companyId) {
      try {
        const sub = await storage.getSubscription(user.companyId);
        planName = sub?.planName || "Trial";
      } catch {}
    }

    await storage.createLoginLog({
      userId: user?.id || null,
      companyId: user?.companyId || null,
      email,
      userName: user?.name || null,
      userRole: user?.role || null,
      planName,
      status,
      ipAddress: ip,
      userAgent: ua.slice(0, 500),
      browser,
      os,
      deviceType,
    });
  } catch {}
}

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

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
      },
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
    const email = req.body?.email || "";
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        captureLoginLog(req, null, email, "failed").catch(() => {});
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        captureLoginLog(req, user, email, "success").catch(() => {});
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

  app.post("/api/auth/change-password", async (req: Request, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const valid = await comparePasswords(currentPassword, user.passwordHash);
      if (!valid) return res.status(400).json({ message: "Current password is incorrect" });
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUser(user.id, { passwordHash });
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      next(err);
    }
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

export function requireEditAccess(req: Request, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  if (!["admin", "team_member"].includes(req.user!.role)) return res.status(403).json({ message: "Edit access required" });
  next();
}
