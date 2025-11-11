# MEMOPYK App – Online and Offline Usage Guide

## 🛰️ When You Need to Be Online
You need an active Internet connection for any action that communicates with the central Supabase database or backend services:

- **Saving new quotes** or major edits to the main database.  
- **Generating or downloading PDFs**, since rendering happens on the server.  
- **Sharing quotes with clients** through public links.  
- **Syncing offline edits** back to the server.  
- **Authentication or login** when starting a new session.

In short, you’ll typically work **online**, just like any standard web application.

---

## 📴 When You Can Be Offline
The MEMOPYK app is designed to keep working **temporarily without Internet**:

- You can **open quotes** that were already cached on your device.  
- You can **edit, duplicate, or even create** new quotes while offline.  
- Those changes are stored locally (browser or iPhone storage).  
- When you reconnect, all pending changes **automatically synchronize** with Supabase.

This allows you to keep working during meetings, travel, or weak connections, then sync later.

---

## ⚙️ How It Works (Simplified)
1. When you open or edit a quote, the app **stores a local copy** in its cache (IndexedDB).  
2. If the connection drops, edits are written to an **outbox** on your device.  
3. Once you’re back online, the outbox **replays all pending changes** safely.  
4. The server uses a *last-write-wins* system to merge updates correctly.  
5. A banner will inform you of the offline status (e.g. “Sauvegarde locale active”).

---

## ✅ In Summary
- Works best **online**, so all data stays synchronized.  
- Fully usable **offline** for short periods — everything is saved locally.  
- When connection returns, all updates are synced automatically.  

You can therefore use MEMOPYK anywhere — even in places with poor connectivity — without losing any work.
