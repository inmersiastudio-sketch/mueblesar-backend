import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  AuthenticatedRequest,
  authenticateRequest,
  clearAuthCookie,
  hashPassword,
  publicUser,
  requireAuth,
  requireRole,
  setAuthCookie,
  signUser,
  verifyPassword,
} from "../lib/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { env } from "../config/env.js";

const router = Router();

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
  .regex(/[a-z]/, "Debe incluir al menos una minúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: passwordSchema,
  role: z.nativeEnum(Role).optional().default(Role.STORE),
  storeId: z.number().optional(),
});

const registerStoreSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(2, "Nombre de la mueblería requerido"),
  ownerName: z.string().min(2, "Nombre del responsable requerido"),
  whatsapp: z.string().regex(/^\+?\d{10,15}$/, "WhatsApp debe ser un número válido"),
  address: z.string().min(5, "Dirección requerida"),
  description: z.string().optional(),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 50, // More permissive in dev
  message: "Too many login attempts, try again later",
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 5 : 20, // More permissive in dev
  message: "Too many registration attempts, try again later",
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

router.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid credentials" });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Email o contraseña incorrectos" });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Email o contraseña incorrectos" });

  const token = signUser({ id: user.id, email: user.email, role: user.role, storeId: user.storeId, name: user.name });
  setAuthCookie(res, token);
  return res.json({ user: publicUser(user), token });
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true, cleared: true });
});

router.get("/me", requireAuth, (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  return res.json({ user: publicUser(user) });
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  const totalUsers = await prisma.user.count();
  let requester = null;
  if (totalUsers > 0) {
    requester = await authenticateRequest(req);
    if (!requester || requester.role !== Role.ADMIN) {
      return res.status(403).json({ error: "Only admins can create users" });
    }
  }

  if (parsed.data.role === Role.STORE && parsed.data.storeId === undefined) {
    return res.status(400).json({ error: "storeId required for store users" });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: parsed.data.role,
      storeId: parsed.data.storeId,
    },
  });

  return res.status(totalUsers === 0 ? 201 : 200).json({ user: publicUser(user) });
});

router.post("/register-store", registerLimiter, async (req, res) => {
  const parsed = registerStoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { email, password, name, ownerName, whatsapp, address, description } = parsed.data;

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "El email ya está registrado" });
  }

  // Generate unique slug from store name
  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = baseSlug;
  let counter = 1;
  while (await prisma.store.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create store + user in transaction
  const passwordHash = await hashPassword(password);
  const result = await prisma.$transaction(async (tx) => {
    const store = await tx.store.create({
      data: {
        name,
        slug,
        whatsapp,
        address,
        description,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        name: ownerName,
        passwordHash,
        role: Role.STORE,
        storeId: store.id,
      },
    });

    return { store, user };
  });

  const token = signUser({
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
    storeId: result.user.storeId,
    name: result.user.name,
  });
  setAuthCookie(res, token);

  return res.status(201).json({
    user: publicUser(result.user),
    store: {
      id: result.store.id,
      name: result.store.name,
      slug: result.store.slug,
    },
    token,
  });
});

router.post("/forgot-password", registerLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Email inválido" });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ ok: true, message: "Si el email existe, recibirás un enlace de recuperación" });
  }

  // Invalidate old tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  // Generate new token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  // Send email
  const siteUrl = process.env.SITE_URL || env.SITE_URL || "http://localhost:3000";
  const resetUrl = `${siteUrl}/resetear-contrasena?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl, user.name ?? undefined);

  return res.json({ ok: true, message: "Si el email existe, recibirás un enlace de recuperación" });
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
  }

  const { token, password } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    return res.status(400).json({ error: "Token inválido o expirado" });
  }

  // Update password
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
  ]);

  return res.json({ ok: true, message: "Contraseña actualizada exitosamente" });
});

// Example protected route for debugging
router.get("/whoami", requireRole([Role.ADMIN, Role.STORE]), (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  return res.json({ user: publicUser(user) });
});

export default router;
