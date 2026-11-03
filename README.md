# ALL SOCIAL DOWNLOADER

A high-performance, modern Android mobile application built with **Angular**, **TypeScript**, **Angular Material**, **Capacitor**, **Python FastAPI**, and **FFmpeg**. 

Designed with a **100% Database-Free Architecture**, saving media directly to Android phone storage and scanning phone directories dynamically for gallery browsing and history tracking.

---

## 🌟 Key Highlights

1. **All Social Media Downloader**:
   - **Instagram**: Photos, reels, stories, and carousels / multi-image posts.
   - **Facebook**: Public HD/SD videos and reels.
   - **Pinterest**: Original ultra-high resolution pins and video pins.
   - **Twitter (X)**: Multi-photo tweets, videos, and threads.
   - **TikTok**: Clean video retrieval (without watermark) and original music/audio.
   - **Direct URLs**: Direct images (JPG, PNG, WebP), direct videos (MP4, MKV, MOV, WebM), and direct animated GIFs.
   - **WhatsApp Status**: Local status import from device storage.

2. **Multiple Image Downloader (Carousels)**:
   - Metadata inspection of carousel posts.
   - Interactive grid display with individual item selection.
   - **Select All** / **Deselect All** one-tap buttons.
   - Selected count badge and download preview modal.
   - Download selected images or download all images with live progress.

3. **Advanced Video Downloader**:
   - Built-in video player preview with poster and duration badge.
   - Available resolutions detection: **Original**, **1080p**, **720p**, **480p** (only resolutions actually available on the source are displayed).
   - Three dedicated download options:
     1. **Original Video**: Original video stream with original audio.
     2. **Muted Video**: Audio track stripped using FFmpeg (`-an -c:v copy`).
     3. **Video with Original Music**: Audio stream isolated and preserved.

4. **GIF Downloader**:
   - Animated GIF preview player.
   - Dimensions, frame count, and file size metadata.
   - Downloads original GIF preserving full animation into `All Social Downloader/GIFs/`.

5. **FrameSnap – Video to Image Extractor (100% Offline)**:
   - Dedicated local video frame extractor that works completely offline.
   - Native device video picker.
   - Interval options: **Every 1s**, **Every 2s**, **Every 3s**, **Every 4s**, or **Custom Interval** (e.g. 0.5s).
   - Image format options: **JPG** (optimized) or **PNG** (lossless).
   - Extracts frames at original video resolution using client hardware-accelerated Canvas/Video pipelines.
   - Saves frames directly to `All Social Downloader/FrameSnap/`.

6. **Automatic Phone Folder Creation (First Run Initialization)**:
   Automatically initializes the following directory structure inside device phone storage:
   ```
   Internal Storage/
   └── All Social Downloader/
       ├── Images/
       │   ├── Instagram/
       │   ├── Facebook/
       │   ├── Pinterest/
       │   ├── Twitter/
       │   └── Other/
       ├── Videos/
       │   ├── Instagram/
       │   ├── Facebook/
       │   ├── TikTok/
       │   ├── Twitter/
       │   └── Other/
       ├── GIFs/
       ├── FrameSnap/
       └── History/
   ```
   - Checks if folders already exist without creating duplicates.
   - Preserves user downloads across app restarts and updates.
   - Displays toast on first initialization: `"All Social Downloader folder created successfully!"`.

7. **Database-Free Offline Gallery & History**:
   - **NO SQLite, NO MySQL, NO MongoDB, NO Firebase, NO Cloud DB**.
   - Dynamically scans the phone's `All Social Downloader` folder tree via Capacitor Filesystem and Android MediaStore.
   - Bottom 5-Tab Navigation:
     1. **Home**
     2. **Images** (Grid view, full-screen preview, share, delete, date sort)
     3. **Videos** (Thumbnails, built-in player, share, delete)
     4. **GIFs** (Animated preview, full-screen preview, share, delete)
     5. **History** (Detailed scan list: file name, size, type, download date, platform, exact phone path)

8. **Built-in Modern Video Player**:
   - Offline playback of all downloaded videos.
   - Play / Pause, seek bar, current time and duration.
   - Rewind 10 seconds (`-10s`) & Forward 10 seconds (`+10s`).
   - Playback speed switcher: `0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`.
   - Fullscreen mode, volume control, mute toggle, and video sharing.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Angular 19/20, TypeScript, Angular Material, SCSS, HTML5 |
| **Mobile Runtime** | Capacitor 7, Android Studio / Gradle 8.11.1, Kotlin / Java |
| **Backend** | Python 3.12, FastAPI, Uvicorn, yt-dlp, Pillow, HTTPX |
| **Media Processing** | FFmpeg 9.0.2, Hardware-Accelerated HTML5 Canvas Video Extractor |
| **Android Storage** | Android Scoped Storage, MediaStore, Storage Access Framework, Capacitor Filesystem |
| **Preferences** | Capacitor Preferences (Dark/Light mode, default download mode, auto-save) |
| **Database** | **None (Zero Database)** |

---

## 🚀 Running the Project

### 1. Python FastAPI Backend
```bash
# Navigate to backend directory and start server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation is available at:
`http://localhost:8000/docs`

Key Endpoints:
- `GET  /api/health` - Service health & FFmpeg detection.
- `POST /api/media/inspect` - SSRF-protected URL inspection and metadata extraction.
- `POST /api/media/download` - Streamed download proxy (zero server persistence).
- `POST /api/media/mute` - Strips audio track via FFmpeg.

### 2. Angular Mobile Web App
```bash
# Install dependencies
npm install

# Run dev server
npm start

# Build production bundle
npm run build
```

### 3. Capacitor Android Build
```bash
# Sync web build to native Android assets
npx cap sync android

# Build debug APK
cd android
gradlew assembleDebug
```
Generated APK location:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔒 Security & Privacy

- **SSRF Protection**: Rejects all private IP ranges (`10.0.0.0/8`, `127.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`), internal domains, and disallowed schemes.
- **Access Control Compliance**: Does not bypass authentication, private accounts, or DRM. Clear limitation notices are displayed when media is restricted.
- **Zero Cloud Storage**: User downloaded media remains exclusively on the Android phone.

