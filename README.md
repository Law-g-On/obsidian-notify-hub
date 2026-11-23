# Obsidian Notify Hub (Static PWA Portal)

Zero-server, privacy-first static Progressive Web App (PWA) portal for Obsidian notifications and team/family workspace chat monitoring.

- **Personal Notification Inbox (`/notify/`)**: Pure client-side PWA using standard Web Push (`RFC 8291 aes128gcm` + `RFC 8292 VAPID`). Encryption keys are generated locally inside your own browser; zero user data ever touches GitHub Pages.
- **Shared Table Monitor (`/table/`)**: Client-side messenger shell that connects directly to your self-hosted gateway via encrypted beacon discovery and `WebSocket`.
