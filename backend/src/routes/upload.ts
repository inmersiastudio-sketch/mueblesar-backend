import { Router } from "express";
import multer from "multer";
import { requireRole } from "../lib/auth.js";
import { uploadImage, uploadGLB } from "../lib/cloudinary.js";
import { Role } from "@prisma/client";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Upload image
router.post("/image", requireRole([Role.ADMIN, Role.STORE]), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await uploadImage(req.file.buffer);
    return res.json({ url: result.url, publicId: result.publicId });
  } catch (error) {
    console.error("Image upload error:", error);
    return res.status(500).json({ error: "Failed to upload image" });
  }
});

// Upload GLB/USDZ model
router.post("/model", requireRole([Role.ADMIN, Role.STORE]), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await uploadGLB(req.file.buffer);
    return res.json({ url: result.url, publicId: result.publicId });
  } catch (error) {
    console.error("Model upload error:", error);
    return res.status(500).json({ error: "Failed to upload model" });
  }
});

export default router;
