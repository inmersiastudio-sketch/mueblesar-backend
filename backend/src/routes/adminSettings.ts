import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AuthenticatedRequest, requireAuth, requireRole } from "../lib/auth.js";

const router = Router();
router.use(requireAuth, requireRole([Role.ADMIN]));

// simple key/value store

router.get("/", async (req, res) => {
  try {
    const items = await prisma.appSetting.findMany();
    const result: Record<string, string> = {};
    items.forEach((i) => (result[i.key] = i.value));
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "cannot fetch settings", detail: (err as Error).message });
  }
});

const updateSchema = z.object({
  key: z.enum(["tolerance"]),
  value: z.string(),
}).superRefine((data, ctx) => {
  if (data.key === "tolerance") {
    const val = Number(data.value);
    if (isNaN(val) || val < 0 || val > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "tolerance must be a number between 0 and 1",
      });
    }
  }
});

router.post("/", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid payload", details: parsed.error.flatten() });
  }
  try {
    const { key, value } = parsed.data;
    const up = await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return res.json(up);
  } catch (err) {
    return res.status(500).json({ error: "cannot save setting", detail: (err as Error).message });
  }
});

export default router;
