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

  // ─── Login Analytics ───────────────────────────────────────────────────────

  app.get("/api/owner/login-logs", requireOwner, async (req, res) => {
    try {
      const logs = await storage.getLoginLogs(1000);
      const allCompanies = await storage.getAllCompanies();
      const companyMap: Record<number, string> = {};
      for (const c of allCompanies) companyMap[c.id] = c.companyName;
      const enriched = logs.map(l => ({
        ...l,
        companyName: l.companyId ? companyMap[l.companyId] || "Unknown" : "—",
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/owner/login-stats", requireOwner, async (req, res) => {
    try {
      const logs = await storage.getLoginLogs(5000);
      const now = new Date();
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const successLogs = logs.filter(l => l.status === "success");
      const failedLogs = logs.filter(l => l.status === "failed");

      const todayLogs = successLogs.filter(l => new Date(l.loginAt) >= today);
      const weekLogs = successLogs.filter(l => new Date(l.loginAt) >= weekAgo);
      const monthLogs = successLogs.filter(l => new Date(l.loginAt) >= monthAgo);

      const uniqueToday = new Set(todayLogs.map(l => l.email)).size;
      const uniqueWeek = new Set(weekLogs.map(l => l.email)).size;

      // Daily trend for last 14 days
      const dailyTrend: { date: string; success: number; failed: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        dailyTrend.push({
          date: dayStart.toISOString().slice(0, 10),
          success: successLogs.filter(l => new Date(l.loginAt) >= dayStart && new Date(l.loginAt) < dayEnd).length,
          failed: failedLogs.filter(l => new Date(l.loginAt) >= dayStart && new Date(l.loginAt) < dayEnd).length,
        });
      }

      // By company (last 30 days)
      const allCompanies = await storage.getAllCompanies();
      const companyMap: Record<number, string> = {};
      for (const c of allCompanies) companyMap[c.id] = c.companyName;
      const byCompany: Record<string, number> = {};
      for (const l of monthLogs) {
        const name = l.companyId ? companyMap[l.companyId] || "Unknown" : "No Company";
        byCompany[name] = (byCompany[name] || 0) + 1;
      }

      // By browser/os/device
      const byBrowser: Record<string, number> = {};
      const byOs: Record<string, number> = {};
      const byDevice: Record<string, number> = {};
      for (const l of monthLogs) {
        byBrowser[l.browser || "Unknown"] = (byBrowser[l.browser || "Unknown"] || 0) + 1;
        byOs[l.os || "Unknown"] = (byOs[l.os || "Unknown"] || 0) + 1;
        byDevice[l.deviceType || "Desktop"] = (byDevice[l.deviceType || "Desktop"] || 0) + 1;
      }

      res.json({
        totalToday: todayLogs.length,
        totalWeek: weekLogs.length,
        totalMonth: monthLogs.length,
        uniqueToday,
        uniqueWeek,
        failedTotal: failedLogs.length,
        failedToday: failedLogs.filter(l => new Date(l.loginAt) >= today).length,
        successTotal: successLogs.length,
        dailyTrend,
        byCompany: Object.entries(byCompany).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        byBrowser: Object.entries(byBrowser).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        byOs: Object.entries(byOs).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        byDevice: Object.entries(byDevice).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Feature Usage Analytics ───────────────────────────────────────────────

  app.get("/api/owner/feature-usage", requireOwner, async (req, res) => {
    try {
      const allLogs = await storage.getAllActivityLogs(10000);
      const allCompanies = await storage.getAllCompanies();
      const allUsers = await storage.getAllUsers();
      const companyMap: Record<number, string> = {};
      const userMap: Record<number, { name: string; companyId: number | null }> = {};
      for (const c of allCompanies) companyMap[c.id] = c.companyName;
      for (const u of allUsers) userMap[u.id] = { name: u.name, companyId: u.companyId };

      const now = new Date();
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Module usage counts
      const moduleStats: Record<string, { total: number; today: number; week: number }> = {};
      for (const log of allLogs) {
        const mod = log.moduleName || "other";
        if (!moduleStats[mod]) moduleStats[mod] = { total: 0, today: 0, week: 0 };
        moduleStats[mod].total++;
        const ts = new Date(log.createdAt);
        if (ts >= today) moduleStats[mod].today++;
        if (ts >= weekAgo) moduleStats[mod].week++;
      }

      // Action type breakdown
      const actionStats: Record<string, number> = {};
      for (const log of allLogs) {
        const t = log.activityType || "other";
        actionStats[t] = (actionStats[t] || 0) + 1;
      }

      // Daily feature activity (last 14 days)
      const dailyActivity: { date: string; count: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        dailyActivity.push({
          date: dayStart.toISOString().slice(0, 10),
          count: allLogs.filter(l => new Date(l.createdAt) >= dayStart && new Date(l.createdAt) < dayEnd).length,
        });
      }

      // Top active users
      const userActivity: Record<number, { name: string; companyName: string; count: number }> = {};
      for (const log of allLogs.filter(l => new Date(l.createdAt) >= monthAgo)) {
        if (!log.userId) continue;
        const u = userMap[log.userId];
        if (!u) continue;
        if (!userActivity[log.userId]) {
          userActivity[log.userId] = {
            name: u.name,
            companyName: u.companyId ? companyMap[u.companyId] || "" : "",
            count: 0,
          };
        }
        userActivity[log.userId].count++;
      }
      const topUsers = Object.values(userActivity).sort((a, b) => b.count - a.count).slice(0, 10);

      res.json({
        moduleStats: Object.entries(moduleStats)
          .map(([module, stats]) => ({ module, ...stats }))
          .sort((a, b) => b.total - a.total),
        actionStats: Object.entries(actionStats)
          .map(([action, count]) => ({ action, count }))
          .sort((a, b) => b.count - a.count),
        dailyActivity,
        topUsers,
        totalActions: allLogs.length,
        actionsToday: allLogs.filter(l => new Date(l.createdAt) >= today).length,
        actionsWeek: allLogs.filter(l => new Date(l.createdAt) >= weekAgo).length,
        actionsMonth: allLogs.filter(l => new Date(l.createdAt) >= monthAgo).length,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Company Usage ─────────────────────────────────────────────────────────

  app.get("/api/owner/company-usage", requireOwner, async (req, res) => {
    try {
      const [allCompanies, allUsers, allSubs, allLogs, allLoginLogs] = await Promise.all([
        storage.getAllCompanies(),
        storage.getAllUsers(),
        storage.getAllSubscriptions(),
        storage.getAllActivityLogs(10000),
        storage.getLoginLogs(5000),
      ]);

      const now = new Date();
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const subMap = new Map(allSubs.map(s => [s.companyId, s]));
      const usersByCompany = new Map<number, typeof allUsers>();
      for (const u of allUsers) {
        if (u.companyId) {
          if (!usersByCompany.has(u.companyId)) usersByCompany.set(u.companyId, []);
          usersByCompany.get(u.companyId)!.push(u);
        }
      }

      const result = allCompanies.map(c => {
        const sub = subMap.get(c.id);
        const users = usersByCompany.get(c.id) || [];
        const companyLogs = allLogs.filter(l => l.companyId === c.id);
        const companyLoginLogs = allLoginLogs.filter(l => l.companyId === c.id && l.status === "success");
        const aiLogs = companyLogs.filter(l => l.activityType === "ai_request");

        // Module breakdown
        const modules: Record<string, number> = {};
        for (const log of companyLogs) {
          const m = log.moduleName || "other";
          modules[m] = (modules[m] || 0) + 1;
        }
        const topModules = Object.entries(modules).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m);

        const lastActivity = companyLogs.length > 0
          ? new Date(companyLogs[0].createdAt).toISOString()
          : null;
        const lastLogin = companyLoginLogs.length > 0
          ? new Date(companyLoginLogs[0].loginAt).toISOString()
          : null;

        const activeUsersToday = new Set(
          companyLogs.filter(l => new Date(l.createdAt) >= today && l.userId).map(l => l.userId)
        ).size;
        const activeUsersWeek = new Set(
          companyLogs.filter(l => new Date(l.createdAt) >= weekAgo && l.userId).map(l => l.userId)
        ).size;

        return {
          id: c.id,
          name: c.companyName,
          industry: c.industry,
          country: c.country,
          totalUsers: users.length,
          activeUsersToday,
          activeUsersWeek,
          totalLogins: companyLoginLogs.length,
          loginsToday: companyLoginLogs.filter(l => new Date(l.loginAt) >= today).length,
          loginsWeek: companyLoginLogs.filter(l => new Date(l.loginAt) >= weekAgo).length,
          totalActions: companyLogs.length,
          aiUsageTotal: aiLogs.length,
          aiUsageToday: aiLogs.filter(l => new Date(l.createdAt) >= today).length,
          topModules,
          lastActivity,
          lastLogin,
          planName: sub?.planName || "Trial",
          status: sub?.status || "Active",
          createdAt: c.createdAt,
        };
      }).sort((a, b) => b.totalActions - a.totalActions);

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── User Profile Drill-Down ───────────────────────────────────────────────

  app.get("/api/owner/users/:id/profile", requireOwner, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => u.id === userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const allCompanies = await storage.getAllCompanies();
      const company = allCompanies.find(c => c.id === user.companyId);
      const sub = user.companyId ? await storage.getSubscription(user.companyId) : null;

      // Activity
      const allLogs = await storage.getAllActivityLogs(10000);
      const userLogs = allLogs.filter(l => l.userId === userId);

      const now = new Date();
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Login history
      const loginLogs = await storage.getLoginLogs(1000);
      const userLogins = loginLogs.filter(l => l.userId === userId || l.email === user.email);
      const successLogins = userLogins.filter(l => l.status === "success");
      const failedLogins = userLogins.filter(l => l.status === "failed");

      // Module usage
      const moduleUsage: Record<string, number> = {};
      for (const l of userLogs) {
        const m = l.moduleName || "other";
        moduleUsage[m] = (moduleUsage[m] || 0) + 1;
      }

      // Action breakdown
      const actionBreakdown: Record<string, number> = {};
      for (const l of userLogs) {
        const a = l.activityType || "other";
        actionBreakdown[a] = (actionBreakdown[a] || 0) + 1;
      }

      // Recent activity
      const recentActivity = userLogs.slice(0, 50).map(l => ({
        ...l,
        companyName: company?.companyName || "",
      }));

      // Recent logins
      const recentLogins = userLogins.slice(0, 20);

      // Unique IPs
      const ipHistory = Array.from(new Set(userLogins.map(l => l.ipAddress).filter(Boolean)));

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          companyId: user.companyId,
        },
        company: company ? {
          id: company.id,
          name: company.companyName,
          industry: company.industry,
          country: company.country,
          planName: sub?.planName || "Trial",
          status: sub?.status || "Active",
        } : null,
        stats: {
          totalActions: userLogs.length,
          actionsToday: userLogs.filter(l => new Date(l.createdAt) >= today).length,
          actionsWeek: userLogs.filter(l => new Date(l.createdAt) >= weekAgo).length,
          actionsMonth: userLogs.filter(l => new Date(l.createdAt) >= monthAgo).length,
          totalLogins: successLogins.length,
          failedLogins: failedLogins.length,
          lastLogin: successLogins[0]?.loginAt || null,
          lastActivity: userLogs[0]?.createdAt || null,
          aiUsage: userLogs.filter(l => l.activityType === "ai_request").length,
          ipHistory,
          preferredBrowser: recentLogins[0]?.browser || "Unknown",
          preferredDevice: recentLogins[0]?.deviceType || "Unknown",
          preferredOs: recentLogins[0]?.os || "Unknown",
        },
        moduleUsage: Object.entries(moduleUsage).map(([module, count]) => ({ module, count })).sort((a, b) => b.count - a.count),
        actionBreakdown: Object.entries(actionBreakdown).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count),
        recentActivity,
        recentLogins,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Users list for owner ──────────────────────────────────────────────────

  app.get("/api/owner/users", requireOwner, async (req, res) => {
    try {
      const [allUsers, allCompanies, allSubs, allLogs, loginLogs] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllCompanies(),
        storage.getAllSubscriptions(),
        storage.getAllActivityLogs(10000),
        storage.getLoginLogs(5000),
      ]);

      const companyMap = new Map(allCompanies.map(c => [c.id, c]));
      const subMap = new Map(allSubs.map(s => [s.companyId, s]));
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const today = new Date(now); today.setHours(0, 0, 0, 0);

      const users = allUsers.map(u => {
        const userLogs = allLogs.filter(l => l.userId === u.id);
        const userLogins = loginLogs.filter(l => l.userId === u.id || l.email === u.email);
        const successLogins = userLogins.filter(l => l.status === "success");
        const company = u.companyId ? companyMap.get(u.companyId) : null;
        const sub = u.companyId ? subMap.get(u.companyId) : null;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          companyId: u.companyId,
          companyName: company?.companyName || "—",
          planName: sub?.planName || "Trial",
          createdAt: u.createdAt,
          totalLogins: successLogins.length,
          lastLogin: successLogins[0]?.loginAt || null,
          totalActions: userLogs.length,
          actionsWeek: userLogs.filter(l => new Date(l.createdAt) >= weekAgo).length,
          actionsToday: userLogs.filter(l => new Date(l.createdAt) >= today).length,
          lastActivity: userLogs[0]?.createdAt || null,
          aiUsage: userLogs.filter(l => l.activityType === "ai_request").length,
          preferredBrowser: successLogins[0]?.browser || "—",
          preferredOs: successLogins[0]?.os || "—",
        };
      }).sort((a, b) => b.totalActions - a.totalActions);

      res.json(users);
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
