/** Max reel length in seconds — keeps feed light on low-end phones and slow internet. */
export const MAX_REEL_SECONDS = 45;

/** Reads a local video file's duration without uploading it. */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { const d = v.duration; URL.revokeObjectURL(url); resolve(d); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    v.src = url;
  });
}

export function isReelTooLong(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds > MAX_REEL_SECONDS + 0.5;
}
