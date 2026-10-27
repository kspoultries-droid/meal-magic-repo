export const APK_DOWNLOAD_URL = "https://github.com/kspoultries-droid/meal-magic-repo/releases/latest/download/EasyLife.apk";
export const APK_RELEASE_API = "https://api.github.com/repos/kspoultries-droid/meal-magic-repo/releases/latest";

export interface ApkRelease { build: number; version: string }

/** Only workflow-issued numeric Android version codes, never release dates or tags. */
export function parseApkRelease(value: unknown): ApkRelease | null {
  if (!value || typeof value !== "object") return null;
  const release = value as { body?: unknown; draft?: boolean; prerelease?: boolean; assets?: { name?: string; state?: string }[] };
  if (release.draft || release.prerelease || typeof release.body !== "string") return null;
  if (!Array.isArray(release.assets) || !release.assets.some(asset => asset.name === "EasyLife.apk" && asset.state === "uploaded")) return null;
  const match = release.body.match(/EasyLife-Android-Build:\s*(\d+)\s*;\s*Version:\s*([\d.]+)/);
  if (!match) return null;
  const build = Number(match[1]);
  return Number.isSafeInteger(build) && build > 0 ? { build, version: match[2] } : null;
}

export function hasApkUpdate(installedBuild: number, release: ApkRelease | null): boolean {
  return Number.isSafeInteger(installedBuild) && installedBuild > 0 && !!release && release.build > installedBuild;
}