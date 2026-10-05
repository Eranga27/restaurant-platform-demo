import "server-only";

import { randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin image uploads to the public `media` bucket. The file's own bytes
 * decide its type (never the name or the browser's claim), and it must be a
 * JPEG, PNG, WebP or AVIF of at most 3 MB. Only call after an admin check.
 */

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const TYPES = [
  {
    type: "image/jpeg",
    ext: "jpg",
    test: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    type: "image/png",
    ext: "png",
    test: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    type: "image/webp",
    ext: "webp",
    test: (b: Uint8Array) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  },
  {
    type: "image/avif",
    ext: "avif",
    test: (b: Uint8Array) =>
      ascii(b, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(b, 8, 12)),
  },
] as const;

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

/** The image type from its first bytes, or null if it isn't one we accept. */
export function sniffImage(bytes: Uint8Array): { type: string; ext: string } | null {
  const match = TYPES.find((t) => t.test(bytes));
  return match ? { type: match.type, ext: match.ext } : null;
}

export type UploadResult = { ok: true; path: string } | { ok: false; error: string };

export async function uploadImage(
  folder: "menu" | "branches",
  file: unknown,
): Promise<UploadResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Images must be 3 MB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: "Use a JPEG, PNG, WebP or AVIF image." };

  const path = `${folder}/${randomBytes(12).toString("hex")}.${kind.ext}`;
  const { error } = await createAdminClient()
    .storage.from("media")
    .upload(path, bytes, { contentType: kind.type, cacheControl: "31536000", upsert: false });
  if (error) {
    console.error("[admin] upload failed", error.message);
    return { ok: false, error: "The upload failed. Please try again." };
  }
  return { ok: true, path };
}

/** Removes an uploaded image. Absolute URLs (the demo's stock photos) are left alone. */
export async function deleteImage(path: string | null): Promise<void> {
  if (!path || /^https?:\/\//.test(path)) return;
  const { error } = await createAdminClient().storage.from("media").remove([path]);
  if (error) console.error("[admin] image delete failed", error.message);
}
