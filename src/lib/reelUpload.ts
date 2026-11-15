export class ReelUploadError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ReelUploadError";
  }
}

export function parseReelUploadError(status: number, body: string): ReelUploadError {
  let message = body || `Upload failed (${status})`;
  try {
    const response = JSON.parse(body);
    const code = Number(response.statusCode);
    if (Number.isFinite(code) && code >= 400) status = code;
    message = response.message || response.error || message;
  } catch { /* Some gateways return plain text. */ }
  return new ReelUploadError(status, message);
}

export function canRetryReelUpload(error: unknown): boolean {
  return error instanceof ReelUploadError &&
    (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500);
}

export function reelUploadPath(userId: string, fileName: string): string {
  return `reels/${userId}/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
}

interface UploadOptions {
  url: string;
  token: string;
  apiKey: string;
  file: File;
  onProgress: (progress: number) => void;
  onRetry: () => void;
}

export async function uploadReelFile(options: UploadOptions): Promise<void> {
  const send = () => new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", options.url);
    xhr.timeout = 180_000;
    xhr.setRequestHeader("Authorization", `Bearer ${options.token}`);
    xhr.setRequestHeader("apikey", options.apiKey);
    xhr.setRequestHeader("cache-control", "3600");
    xhr.setRequestHeader("Content-Type", options.file.type || "video/mp4");
    // New unique objects are INSERTs; upsert would additionally require UPDATE/SELECT.
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onProgress(Math.min(99, Math.round(e.loaded / e.total * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(parseReelUploadError(xhr.status, xhr.responseText));
    };
    xhr.onerror = () => reject(new ReelUploadError(0, "Network connection interrupted"));
    xhr.ontimeout = () => reject(new ReelUploadError(408, "Upload timed out"));
    xhr.onabort = () => reject(new ReelUploadError(499, "Upload cancelled"));
    xhr.send(options.file);
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    options.onProgress(0);
    try {
      await send();
      options.onProgress(100);
      return;
    } catch (error) {
      if (!canRetryReelUpload(error) || attempt === 2) throw error;
      options.onRetry();
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
}