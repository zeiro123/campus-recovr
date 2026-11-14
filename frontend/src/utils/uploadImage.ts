// Shared image upload: posts the picked file to POST /api/upload (multipart)
// and returns the absolute URL the backend serves it at (/uploads/<file>).
import { getUserLocalStorage } from "../auth/auth";

const serverUrl = import.meta.env.VITE_SERVER_URL?.replace(/\/+$/, "");
const fallbackUrl = "http://localhost:5000/api";
const apiBase = serverUrl ? `${serverUrl}/api` : fallbackUrl;

export const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB — mirrored server-side

export const formatBytes = (n: number) =>
  n >= 1024 * 1024
    ? `${Math.round(n / (1024 * 1024))} MB`
    : `${Math.round(n / 1024)} KB`;

export async function uploadImageFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const token = getUserLocalStorage();
  const res = await fetch(`${apiBase}/upload`, {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.url) {
    throw new Error(json?.message || "Image upload failed. Please try again.");
  }
  return json.data.url as string;
}
