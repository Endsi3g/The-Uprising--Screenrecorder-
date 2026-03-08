# OpenScreen Mobile

React Native (Expo) companion app for [OpenScreen / The Uprising Screenrecorder](https://github.com/Endsi3g/The-Uprising--Screenrecorder-).

## Features

| Tab | Description |
|---|---|
| ⏺ **Remote** | Start / Stop the desktop recording from your phone |
| 🖥 **Preview** | Live thumbnail of the current recording (refreshes every 2.5 s) |
| 💡 **Ideas** | Create and sync video ideas with the desktop |
| 📡 **Connect** | Enter the desktop server URL (shown in the 📱 HUD button) |

## Quick Start

### 1 · Start the desktop app

Open **OpenScreen** on your PC/Mac. In the HUD bar, click the **📱 Mobile** button.  
A QR code and IP address (`http://192.168.x.x:3001`) will appear.

### 2 · Run the mobile app

```bash
cd mobile
npx expo start
```

Scan the Expo QR code with the Expo Go app on your phone.

### 3 · Connect

Open the **Connect** tab and enter the URL from step 1 (e.g. `http://192.168.1.42:3001`), then tap **Connect**.

> Both devices must be on the same Wi-Fi network.

## Development

```bash
npm run android   # Android emulator / device
npm run ios       # iOS simulator (macOS only)
npm run web       # Web browser preview
```

## Architecture

```
mobile/
├── App.tsx              # Tab navigation
├── lib/
│   ├── api.ts           # REST API client
│   └── store.ts         # Zustand global state
└── screens/
    ├── RemoteScreen.tsx
    ├── PreviewScreen.tsx
    ├── IdeasScreen.tsx
    └── ConnectScreen.tsx
```

The mobile app communicates with the Express server embedded in the Electron main process (port **3001**).
