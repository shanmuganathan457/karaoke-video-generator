# KaraokeAI Mobile App

A real React Native mobile app built with **Expo SDK 56** and **TypeScript**.

## Project Structure

```
mobile-app/
├── app/
│   ├── _layout.tsx       ← Root Stack navigator
│   ├── index.tsx         ← Screen 1: Upload (Camera Roll / Files / Camera)
│   ├── processing.tsx    ← Screen 2: AI Processing with live progress polling
│   ├── preview.tsx       ← Screen 3: Video player with subtitle overlay
│   └── export.tsx        ← Screen 4: Export & Share
├── services/
│   └── api.ts            ← API client to talk to Python backend
└── package.json
```

## Setup

### 1. Install Expo Go on your phone
- Android: [Play Store - Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
- iOS: [App Store - Expo Go](https://apps.apple.com/app/expo-go/id982107779)

### 2. Start the Python backend server

In the project root, run:
```powershell
pip install fastapi uvicorn python-multipart
python -m karaoke_generator.server
```

### 3. Configure your local IP

Find your PC's local IP address:
```powershell
ipconfig
```
Look for `IPv4 Address` (e.g. `192.168.1.100`)

Update `services/api.ts`:
```ts
export const API_BASE_URL = 'http://192.168.1.100:8000';
```

### 4. Start the Expo dev server

```powershell
npm start
```

Scan the QR code with Expo Go — the app will open on your phone!

## How it works

1. **Upload** — Pick a video from Camera Roll, Files, or record live
2. **Processing** — Video uploaded to Python backend, Whisper AI transcribes it, subtitles generated
3. **Preview** — Watch the output karaoke video with animated subtitle overlay  
4. **Export** — Save to Camera Roll or share via TikTok / Instagram / YouTube

## Requirements

- Node.js 18+
- Python 3.10+ with FFmpeg installed
- Expo Go app on iOS or Android
- Phone and PC on same WiFi network
