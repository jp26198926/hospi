import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export async function uploadBuffer(buffer: Buffer, opts: { folder?: string; resourceType?: "image" | "raw" | "auto" }) {
  return new Promise<{ publicId: string; secureUrl: string; resourceType: string; bytes: number }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: opts.folder ?? "hospi", resource_type: opts.resourceType ?? "auto" },
      (err, result) => {
        if (err || !result) reject(err ?? new Error("Upload failed"));
        else resolve({ publicId: result.public_id, secureUrl: result.secure_url, resourceType: result.resource_type, bytes: result.bytes });
      }
    );
    stream.end(buffer);
  });
}
