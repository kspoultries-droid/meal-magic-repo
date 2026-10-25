# Project rules

- Firebase web push config (apiKey, appId, projectId, VAPID) is hardcoded as fallback in src/lib/webPush.ts — connector VITE vars did not sync to builds, and these values are public by design.
- Native Android app loads the published site via Capacitor server.url; APK is built by .github/workflows/android.yml so no local Android Studio is needed.
- Customer navigation uses isolated brand tokens and a shared navbar-height token; scoped marketplace themes must not reduce header contrast or obscure sticky navigation.
- Restaurant details render the photograph and restaurant information in separate full-width sections to keep photography untinted and text readable.
