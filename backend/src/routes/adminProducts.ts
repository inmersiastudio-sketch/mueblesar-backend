import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../lib/auth.js";
import { adminProductController } from "../controllers/AdminProductController.js";
import { asyncHandler } from "../middleware/errorHandler.js";

/**
 * Admin Products Routes
 * Clean routing layer - delegates to AdminProductController
 */

const router = Router();

// All routes require authentication and ADMIN/STORE role
router.use(requireAuth, requireRole([Role.ADMIN, Role.STORE]));

// CRUD Routes
router.post("/", asyncHandler(adminProductController.create.bind(adminProductController)));
router.post("/bulk", asyncHandler(adminProductController.bulk.bind(adminProductController)));
router.put("/:id", asyncHandler(adminProductController.update.bind(adminProductController)));
router.delete("/:id", asyncHandler(adminProductController.delete.bind(adminProductController)));
router.get("/:id/logs", asyncHandler(adminProductController.getLogs.bind(adminProductController)));
router.get("/", asyncHandler(adminProductController.list.bind(adminProductController)));

export default router;
