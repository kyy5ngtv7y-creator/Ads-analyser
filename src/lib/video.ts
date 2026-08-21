"use client";

// Client-seitige Keyframe-Extraktion aus Video-Dateien (<video> + <canvas>).
// Kein serverseitiges ffmpeg nötig — funktioniert auch auf Vercel.

export interface ExtractedFrame {
  data: string; // Base64 ohne data:-Präfix
  mediaType: "image/jpeg";
  label: string;
}

export async function extractVideoFrames(
  file: File,
  maxFrames = 5
): Promise<{ frames: ExtractedFrame[]; durationSec: number }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video konnte nicht gelesen werden."));
    });

    const duration = video.duration;
    // Hook-kritische Zeitpunkte zuerst, dann gleichmässig verteilt
    const times = [0.1, 1, 3, duration * 0.5, Math.max(0.1, duration - 0.5)]
      .filter((t) => t < duration)
      .filter((t, i, arr) => arr.findIndex((x) => Math.abs(x - t) < 0.4) === i)
      .slice(0, maxFrames);

    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas nicht verfügbar.");

    const frames: ExtractedFrame[] = [];
    for (const t of times) {
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("Seek fehlgeschlagen."));
        video.currentTime = t;
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      frames.push({
        data: dataUrl.split(",")[1],
        mediaType: "image/jpeg",
        label: `Sekunde ${t.toFixed(1)}`,
      });
    }
    return { frames, durationSec: Math.round(duration * 10) / 10 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function fileToBase64Image(
  file: File
): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }> {
  const allowed = ["image/jpeg", "image/png", "image/webp"] as const;
  const mediaType = allowed.find((t) => t === file.type);
  if (!mediaType) {
    // In JPEG konvertieren (z.B. bei HEIC schlägt das Laden fehl — dann Fehler)
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) throw new Error("Bildformat nicht unterstützt — bitte JPG, PNG oder WebP verwenden.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1], mediaType: "image/jpeg" };
  }
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return { data: btoa(binary), mediaType };
}
