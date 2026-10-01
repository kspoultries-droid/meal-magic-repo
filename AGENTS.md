# Project rules

- Firebase web push config (apiKey, appId, projectId, VAPID) is hardcoded as fallback in src/lib/webPush.ts — connector VITE vars did not sync to builds, and these values are public by design.
