import { Router } from "express";
import { requireAuth, requireRole } from "../lib/auth.js";
import { subscriptionController } from "../controllers/SubscriptionController.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { Role } from "@prisma/client";

/**
 * Subscription Routes
 * Protected routes for subscription management
 */

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Create checkout link for subscription
router.post(
  "/create-checkout",
  requireRole([Role.ADMIN, Role.STORE]),
  asyncHandler(subscriptionController.createCheckout.bind(subscriptionController))
);

// Get subscription status
router.get(
  "/status/:storeId",
  requireRole([Role.ADMIN, Role.STORE]),
  asyncHandler(subscriptionController.getStatus.bind(subscriptionController))
);

// Cancel subscription
router.post(
  "/cancel",
  requireRole([Role.ADMIN, Role.STORE]),
  asyncHandler(subscriptionController.cancel.bind(subscriptionController))
);

// Get available plans (public)
router.get("/plans", asyncHandler(subscriptionController.getPlans.bind(subscriptionController)));

export default router;
