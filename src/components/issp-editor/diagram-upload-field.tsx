"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImageIcon, UploadCloud } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { cn } from "@/lib/utils";
import { DIAGRAM_ACCEPT, getDiagramUploadError, readFileAsDataUrl } from "@/lib/diagram-upload";

interface DiagramUploadFieldProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  alt: string;
}

export function DiagramUploadField({
  value,
  onChange,
  title,
  emptyTitle,
  emptyDescription,
  alt,
}: DiagramUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    const uploadError = getDiagramUploadError(file);
    if (uploadError) {
      setUploadError(uploadError);
      input.value = "";
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange(dataUrl);
      input.value = "";
    } catch {
      setUploadError("Failed to read file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UploadCloud className="h-3.5 w-3.5" />
          {uploading ? "Uploading..." : value ? "Replace" : "Upload"}
        </button>
      </div>

      {value ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Uploaded diagram</span>
            <ConfirmDeleteButton
              ariaLabel="Remove diagram"
              confirmText="Delete diagram?"
              onDelete={() => onChange(null)}
            />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={alt} className="w-full max-h-[520px] object-contain bg-white p-3" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
            uploading
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            {uploading ? "Uploading..." : emptyTitle}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">{emptyDescription}</p>
        </button>
      )}

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept={DIAGRAM_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
