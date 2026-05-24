export const DIAGRAM_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export const DIAGRAM_ACCEPT = DIAGRAM_IMAGE_TYPES.join(",");
export const DIAGRAM_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function getDiagramUploadError(file: File): string | null {
  if (!DIAGRAM_IMAGE_TYPES.includes(file.type as (typeof DIAGRAM_IMAGE_TYPES)[number])) {
    return "Use a PNG, JPG, WebP, or SVG image.";
  }

  if (file.size > DIAGRAM_MAX_FILE_SIZE_BYTES) {
    return "Use an image smaller than 10 MB.";
  }

  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export function createDiagramId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `diagram-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
