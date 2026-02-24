import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Parse CLOUDINARY_URL if provided (format: cloudinary://api_key:api_secret@cloud_name)
function parseCloudinaryUrl() {
  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    return {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
    };
  }

  try {
    const match = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
    if (match) {
      return {
        CLOUDINARY_CLOUD_NAME: match[3],
        CLOUDINARY_API_KEY: match[1],
        CLOUDINARY_API_SECRET: match[2],
      };
    }
  } catch (error) {
    console.error("Error parsing CLOUDINARY_URL:", error);
  }

  return {
    CLOUDINARY_CLOUD_NAME: "",
    CLOUDINARY_API_KEY: "",
    CLOUDINARY_API_SECRET: "",
  };
}

const cloudinaryConfig = parseCloudinaryUrl();

const envSchema = z.object({
  PORT: z.string().optional().default("3001"),
  NODE_ENV: z.string().optional().default("development"),
  ADMIN_API_KEY: z.string().optional().default("dev-admin-key"),
  JWT_SECRET: z.string().optional().default("dev-secret-change"),
  SITE_URL: z.string().optional().default("http://localhost:3000"),
  API_BASE_URL: z.string().optional().default("http://localhost:3001"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(cloudinaryConfig.CLOUDINARY_CLOUD_NAME),
  CLOUDINARY_API_KEY: z.string().optional().default(cloudinaryConfig.CLOUDINARY_API_KEY),
  CLOUDINARY_API_SECRET: z.string().optional().default(cloudinaryConfig.CLOUDINARY_API_SECRET),
  MESHY_API_KEY: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);
