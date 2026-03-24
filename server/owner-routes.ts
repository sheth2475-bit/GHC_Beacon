import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(buf, Buffer.from(hashed, "hex"));
}

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [6, 6, 6, 6];
  return segments.map(len => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")).join("-");
}

declare module "express-session" {
  interface SessionData {
    platformOwnerId?: number;
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.platformOwnerId) {
    return res.status(401).json({ message: "Platform owner authentication required" });
  }
  next();
}

export function registerOwnerRoutes(app: Express) {
  app.post("/api/owner/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const owner = await storage.getPlatformOwnerByEmail(email);
      if (!owner || !owner.isActive) return res.status(401).json({ message: "Invalid credentials" });
      const valid = await comparePasswords(password, owner.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });
      req.session.platformOwnerId = owner.id;
      const { passwordHash: _, ...safe } = owner;
      res.json(safe);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/owner/logout", (req, res) => {
    req.session.platformOwnerId = undefined;
    res.json({ message: "Logged out" });
  });

  app.get("/api/owner/me", async (req, res) => {
    if (!req.session?.platformOwnerId) return res.status(401).json({ message: "Not authenticated" });
    const owner = await storage.getPlatformOwner(req.session.platformOwnerId);
    if (!owner) return res.status(401).json({ message: "Not authenticated" });
    const { passwordHash: _, ...safe } = owner;
    res.json(safe);
  });

  app.get("/api/owner/dashboard", requireOwner, async (req, res) => {
    try {
      const [allCompanies, allUsers, allSubs, recentActivity] = await Promise.all([
        storage.getAllCompanies(),
        storage.getAllUsers(),
        storage.getAllSubscriptions(),
        storage.getAllActivityLogs(200),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const subByCompany = new Map(allSubs.map(s => [s.companyId, s]));
      const usersByCompany = new Map<number, number>();
      for (const u of allUsers) {
        if (u.companyId) usersByCompany.set(u.companyId, (usersByCompany.get(u.companyId) || 0) + 1);
      }
      const userById = new Map(allUsers.map(u => [u.id, u]));
      const companyById = new Map(allCompanies.map(c => [c.id, c]));

      const aiTodayLogs = recentActivity.filter(l => l.activityType === "ai_request" && new Date(l.createdAt) >= today);
      const aiRequestsToday = aiTodayLogs.length;

      const aiByCompanyMap = new Map<number, number>();
      for (const log of aiTodayLogs) {
        if (log.companyId) aiByCompanyMap.set(log.companyId, (aiByCompanyMap.get(log.companyId) || 0) + 1);
      }
      const activeCompanies = aiByCompanyMap.size;

      const recentCompanies = [...allCompanies].reverse().slice(0, 6).map(c => {
        const sub = subByCompany.get(c.id);
        const adminUser = userById.get(c.userId);
        return {
          id: c.id,
          name: c.companyName,
          email: adminUser?.email || "",
          industry: c.industry,
          companySize: c.companySize,
          country: c.country,
          userCount: usersByCompany.get(c.id) || 0,
          planName: sub?.planName || "Trial",
          status: sub?.status || "Active",
          createdAt: c.createdAt,
          aiToday: aiByCompanyMap.get(c.id) || 0,
        };
      });

      const enrichedActivity = recentActivity.slice(0, 20).map(log => ({
        ...log,
        userName: userById.get(log.userId)?.name || "Unknown",
        companyName: log.companyId ? companyById.get(log.companyId)?.companyName : null,
        action: log.activityType,
      }));

      const aiUsageByCompany = allCompanies.map(c => {
        const sub = subByCompany.get(c.id);
        return {
          companyName: c.companyName,
          count: aiByCompanyMap.get(c.id) || 0,
          dailyLimit: sub?.dailyAiLimit || 15,
        };
      }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

      const allUserDetails = allUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        companyName: u.companyId ? companyById.get(u.companyId)?.companyName || "" : "",
        companyId: u.companyId,
        createdAt: u.createdAt,
      }));

      res.json({
        totalCompanies: allCompanies.length,
        activeCompanies,
        totalUsers: allUsers.length,
        aiRequestsToday,
        recentCompanies,
        recentActivity: enrichedActivity,
        aiUsageByCompany,
        allUsers: allUserDetails,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/owner/companies", requireOwner, async (req, res) => {
    try {
      const allCompanies = await storage.getAllCompanies();
      const result = await Promise.all(allCompanies.map(async (c) => {
        const [sub, users, aiToday] = await Promise.all([
          storage.getSubscription(c.id),
          storage.getUsersByCompany(c.id),
          storage.getDailyAiCount(c.id),
        ]);
        const adminUser = users.find(u => u.role === "admin") || users[0];
        return {
          ...c,
          name: c.companyName,
          email: adminUser?.email || "",
          planName: sub?.planName || "Trial",
          status: sub?.status || "Active",
          maxUsers: sub?.maxUsers || 5,
          dailyAiLimit: sub?.dailyAiLimit || 15,
          userCount: users.length,
          aiToday,
          subscription: sub || null,
        };
      }));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/owner/companies/:id", requireOwner, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const [company, sub, users, keys] = await Promise.all([
        storage.getCompany(companyId),
        storage.getSubscription(companyId),
        storage.getUsersByCompany(companyId),
        storage.getActivationKeysByCompany(companyId),
      ]);
      if (!company) return res.status(404).json({ message: "Company not found" });
      res.json({ ...company, subscription: sub || null, users, activationKeys: keys });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/owner/companies/:id/subscription", requireOwner, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const ownerId = req.session.platformOwnerId!;
      const { planName, status, maxUsers, dailyAiLimit, notes, trialEndDate } = req.body;

      const planDefaults: Record<string, { maxUsers: number; dailyAiLimit: number }> = {
        "Trial": { maxUsers: 5, dailyAiLimit: 15 },
        "Starter": { maxUsers: 20, dailyAiLimit: 20 },
        "Growth": { maxUsers: 50, dailyAiLimit: 75 },
        "Enterprise": { maxUsers: 500, dailyAiLimit: 999 },
      };
      const defaults = planDefaults[planName] || {};

      const sub = await storage.upsertSubscription(companyId, {
        planName,
        status,
        maxUsers: maxUsers ?? defaults.maxUsers,
        dailyAiLimit: dailyAiLimit ?? defaults.dailyAiLimit,
        notes,
        activatedBy: ownerId,
        ...(trialEndDate ? { trialEndDate: new Date(trialEndDate) } : {}),
        ...(status === "Active" ? { startDate: new Date() } : {}),
      });

      await storage.createOwnerAuditLog({
        ownerId,
        action: `Updated subscription for company ${companyId}: plan=${planName}, status=${status}`,
        targetType: "company",
        targetId: companyId,
        details: JSON.stringify({ planName, status, maxUsers, dailyAiLimit }),
      });

      res.json(sub);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/owner/keys", requireOwner, async (req, res) => {
    try {
      const keys = await storage.getAllActivationKeys();
      res.json(keys);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/owner/keys", requireOwner, async (req, res) => {
    try {
      const ownerId = req.session.platformOwnerId!;
      const { companyId, planName, maxUsers, dailyAiLimit, expiresAt } = req.body;

      const planDefaults: Record<string, { maxUsers: number; dailyAiLimit: number }> = {
        "Trial": { maxUsers: 5, dailyAiLimit: 15 },
        "Starter": { maxUsers: 20, dailyAiLimit: 20 },
        "Growth": { maxUsers: 50, dailyAiLimit: 75 },
        "Enterprise": { maxUsers: 500, dailyAiLimit: 999 },
      };
      const defaults = planDefaults[planName] || { maxUsers: 20, dailyAiLimit: 20 };

      const key = await storage.createActivationKey({
        companyId: companyId || null,
        keyValue: generateKey(),
        planName: planName || "Starter",
        status: "Pending",
        maxUsers: maxUsers ?? defaults.maxUsers,
        dailyAiLimit: dailyAiLimit ?? defaults.dailyAiLimit,
        issuedBy: ownerId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        activatedAt: null,
        revokedAt: null,
      });

      await storage.createOwnerAuditLog({
        ownerId,
        action: `Generated activation key ${key.keyValue} for company ${companyId || "unassigned"} (${planName})`,
        targetType: "key",
        targetId: key.id,
        details: JSON.stringify({ planName, maxUsers, dailyAiLimit }),
      });

      res.json(key);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/owner/keys/:id", requireOwner, async (req, res) => {
    try {
      const keyId = parseInt(req.params.id);
      const ownerId = req.session.platformOwnerId!;
      const { status, expiresAt, planName, maxUsers, dailyAiLimit, companyId } = req.body;

      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (expiresAt !== undefined) updates.expiresAt = new Date(expiresAt);
      if (planName !== undefined) updates.planName = planName;
      if (maxUsers !== undefined) updates.maxUsers = maxUsers;
      if (dailyAiLimit !== undefined) updates.dailyAiLimit = dailyAiLimit;
      if (companyId !== undefined) updates.companyId = companyId;
      if (status === "Revoked") updates.revokedAt = new Date();

      const key = await storage.updateActivationKey(keyId, updates);

      await storage.createOwnerAuditLog({
        ownerId,
        action: `Updated activation key ${key.keyValue}: ${JSON.stringify(updates)}`,
        targetType: "key",
        targetId: keyId,
        details: JSON.stringify(updates),
      });

      res.json(key);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/owner/keys/:id", requireOwner, async (req, res) => {
    try {
      const keyId = parseInt(req.params.id);
      const ownerId = req.session.platformOwnerId!;
      const key = await storage.updateActivationKey(keyId, { status: "Revoked", revokedAt: new Date() });
      await storage.createOwnerAuditLog({
        ownerId,
        action: `Revoked activation key ${key.keyValue}`,
        targetType: "key",
        targetId: keyId,
        details: null,
      });
      res.json({ message: "Key revoked" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/owner/keys/:id/regenerate", requireOwner, async (req, res) => {
    try {
      const keyId = parseInt(req.params.id);
      const ownerId = req.session.platformOwnerId!;
      const newKeyValue = generateKey();
      const key = await storage.updateActivationKey(keyId, { keyValue: newKeyValue, status: "Pending", activatedAt: null, revokedAt: null });

      await storage.createOwnerAuditLog({
        ownerId,
        action: `Regenerated activation key ${keyId} → ${newKeyValue}`,
        targetType: "key",
        targetId: keyId,
        details: null,
      });

      res.json(key);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/owner/activity", requireOwner, async (req, res) => {
    try {
      const logs = await storage.getAllActivityLogs(300);
      const allUsers = await storage.getAllUsers();
      const allCompanies = await storage.getAllCompanies();
      const userMap: Record<number, string> = {};
      const companyMap: Record<number, string> = {};
      for (const u of allUsers) userMap[u.id] = u.name;
      for (const c of allCompanies) companyMap[c.id] = c.companyName;
      const enriched = logs.map(l => ({
        ...l,
        userName: l.userId ? userMap[l.userId] || "Unknown" : "System",
        companyName: l.companyId ? companyMap[l.companyId] || "Unknown" : "—",
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/owner/ai-usage", requireOwner, async (req, res) => {
    try {
      const [allCompanies, allSubs, allLogs] = await Promise.all([
        storage.getAllCompanies(),
        storage.getAllSubscriptions(),
        storage.getAllActivityLogs(5000),
      ]);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const aiLogs = allLogs.filter(l => l.activityType === "ai_request");

      const subByCompany = new Map(allSubs.map(s => [s.companyId, s]));

      const companies = allCompanies.map(c => {
        const sub = subByCompany.get(c.id);
        const companyLogs = aiLogs.filter(l => l.companyId === c.id);
        return {
          companyName: c.companyName,
          planName: sub?.planName || "Trial",
          dailyLimit: sub?.dailyAiLimit || 15,
          today: companyLogs.filter(l => new Date(l.createdAt) >= today).length,
          week: companyLogs.filter(l => new Date(l.createdAt) >= weekAgo).length,
          total: companyLogs.length,
          status: sub?.status || "Active",
        };
      }).sort((a, b) => b.today - a.today);

      const dailyTrend: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        dailyTrend.push({
          date: dayStart.toISOString().slice(0, 10),
          count: aiLogs.filter(l => new Date(l.createdAt) >= dayStart && new Date(l.createdAt) < dayEnd).length,
        });
      }

      res.json({ companies, dailyTrend });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/owner/audit", requireOwner, async (req, res) => {
    try {
      const logs = await storage.getOwnerAuditLogs(100);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/owner/companies/:id/activate", requireOwner, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const ownerId = req.session.platformOwnerId!;
      const { planName = "Starter" } = req.body;

      const planDefaults: Record<string, { maxUsers: number; dailyAiLimit: number }> = {
        "Starter": { maxUsers: 20, dailyAiLimit: 20 },
        "Growth": { maxUsers: 50, dailyAiLimit: 75 },
        "Enterprise": { maxUsers: 500, dailyAiLimit: 999 },
      };
      const defaults = planDefaults[planName] || planDefaults["Starter"];

      const sub = await storage.upsertSubscription(companyId, {
        planName,
        status: "Active",
        maxUsers: defaults.maxUsers,
        dailyAiLimit: defaults.dailyAiLimit,
        activatedBy: ownerId,
        startDate: new Date(),
      });

      await storage.createOwnerAuditLog({
        ownerId,
        action: `Directly activated company ${companyId} on ${planName} plan`,
        targetType: "company",
        targetId: companyId,
        details: JSON.stringify({ planName }),
      });

      res.json(sub);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/owner/companies/:id/suspend", requireOwner, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const ownerId = req.session.platformOwnerId!;
      const { reason } = req.body;

      const sub = await storage.upsertSubscription(companyId, { status: "Suspended", notes: reason || null });

      await storage.createOwnerAuditLog({
        ownerId,
        action: `Suspended company ${companyId}`,
        targetType: "company",
        targetId: companyId,
        details: reason || null,
      });

      res.json(sub);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}

export async function logActivity(
  userId: number | null,
  companyId: number | null,
  activityType: string,
  moduleName?: string,
  details?: string,
) {
  try {
    await storage.createActivityLog({
      userId,
      companyId,
      activityType,
      moduleName: moduleName || null,
      details: details || null,
    });
  } catch {
  }
}
