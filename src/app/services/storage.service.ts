import { Injectable, signal } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';
import { GalleryItem, PlatformType } from '../models/media.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  readonly ROOT_FOLDER = 'All Social Downloader';
  isInitialized = signal<boolean>(false);
  initializationMessage = signal<string>('');

  readonly FOLDERS_TO_CREATE = [
    'All Social Downloader',
    'All Social Downloader/Images',
    'All Social Downloader/Images/Instagram',
    'All Social Downloader/Images/Facebook',
    'All Social Downloader/Images/Pinterest',
    'All Social Downloader/Images/Twitter',
    'All Social Downloader/Images/Other',
    'All Social Downloader/Videos',
    'All Social Downloader/Videos/Instagram',
    'All Social Downloader/Videos/Facebook',
    'All Social Downloader/Videos/TikTok',
    'All Social Downloader/Videos/Twitter',
    'All Social Downloader/Videos/Other',
    'All Social Downloader/GIFs',
    'All Social Downloader/FrameSnap',
    'All Social Downloader/History'
  ];

  constructor() {
    this.checkAndInitFolders();
  }

  async checkAndInitFolders(): Promise<boolean> {
    try {
      const { value: alreadyInitialized } = await Preferences.get({ key: 'asd_folders_initialized' });
      let createdAny = false;

      for (const folder of this.FOLDERS_TO_CREATE) {
        try {
          await Filesystem.stat({
            path: folder,
            directory: Directory.Documents
          });
        } catch {
          // Folder does not exist, create it safely
          await Filesystem.mkdir({
            path: folder,
            directory: Directory.Documents,
            recursive: true
          });
          createdAny = true;
        }
      }

      await Preferences.set({ key: 'asd_folders_initialized', value: 'true' });
      this.isInitialized.set(true);

      const msg = 'All Social Downloader folder created successfully!';
      this.initializationMessage.set(msg);

      if (!alreadyInitialized || createdAny) {
        await Toast.show({
          text: msg,
          duration: 'long',
          position: 'bottom'
        }).catch(() => {});
      }

      return true;
    } catch (err: any) {
      console.warn('Storage initialization fallback (browser/mock):', err);
      this.isInitialized.set(true);
      return false;
    }
  }

  getTargetSubdirectory(platform: PlatformType, type: 'image' | 'video' | 'gif' | 'frame'): string {
    if (type === 'frame') {
      return `${this.ROOT_FOLDER}/FrameSnap`;
    }
    if (type === 'gif') {
      return `${this.ROOT_FOLDER}/GIFs`;
    }
    if (type === 'image') {
      const sub = ['Instagram', 'Facebook', 'Pinterest', 'Twitter'].includes(platform) ? platform : 'Other';
      return `${this.ROOT_FOLDER}/Images/${sub}`;
    }
    if (type === 'video') {
      const sub = ['Instagram', 'Facebook', 'TikTok', 'Twitter'].includes(platform) ? platform : 'Other';
      return `${this.ROOT_FOLDER}/Videos/${sub}`;
    }
    return `${this.ROOT_FOLDER}/History`;
  }

  generateUniqueFilename(platform: PlatformType, type: 'image' | 'video' | 'gif' | 'frame', ext: string): string {
    const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(100 + Math.random() * 900);
    const prefix = type === 'frame' ? 'FrameSnap' : platform.replace(/[^a-zA-Z0-9]/g, '');
    const typeLabel = type === 'frame' ? 'Frame' : type.charAt(0).toUpperCase() + type.slice(1);
    return `${prefix}_${typeLabel}_${timestamp}_${random}${cleanExt}`;
  }

  async saveFile(
    folderPath: string,
    filename: string,
    dataBase64: string
  ): Promise<{ success: boolean; fullPath: string; uri: string }> {
    try {
      await this.checkAndInitFolders();
      const relativePath = `${folderPath}/${filename}`;

      const res = await Filesystem.writeFile({
        path: relativePath,
        data: dataBase64,
        directory: Directory.Documents,
        recursive: true
      });

      return {
        success: true,
        fullPath: relativePath,
        uri: res.uri
      };
    } catch (err) {
      console.error('Failed to save file:', err);
      // Fallback: browser download
      this.downloadBlobInBrowser(dataBase64, filename);
      return {
        success: true,
        fullPath: filename,
        uri: filename
      };
    }
  }

  private downloadBlobInBrowser(base64Data: string, filename: string) {
    try {
      const a = document.createElement('a');
      a.href = base64Data.startsWith('data:') ? base64Data : `data:application/octet-stream;base64,${base64Data}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}
  }

  async scanGalleryItems(): Promise<GalleryItem[]> {
    const items: GalleryItem[] = [];

    const directoriesToScan = [
      { path: `${this.ROOT_FOLDER}/Images`, type: 'image' as const },
      { path: `${this.ROOT_FOLDER}/Videos`, type: 'video' as const },
      { path: `${this.ROOT_FOLDER}/GIFs`, type: 'gif' as const },
      { path: `${this.ROOT_FOLDER}/FrameSnap`, type: 'image' as const }
    ];

    for (const root of directoriesToScan) {
      await this.scanDirectoryRecursive(root.path, root.type, items);
    }

    // Sort descending by date (newest first)
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items;
  }

  private async scanDirectoryRecursive(
    path: string,
    defaultType: 'image' | 'video' | 'gif',
    results: GalleryItem[]
  ) {
    try {
      const dir = await Filesystem.readdir({
        path,
        directory: Directory.Documents
      });

      for (const entry of dir.files) {
        const fullPath = `${path}/${entry.name}`;
        if (entry.type === 'directory') {
          await this.scanDirectoryRecursive(fullPath, defaultType, results);
        } else {
          // File found
          const ext = entry.name.split('.').pop()?.toLowerCase() || '';
          let type: 'image' | 'video' | 'gif' = defaultType;
          if (ext === 'gif') type = 'gif';
          else if (['mp4', 'mov', 'mkv', 'webm'].includes(ext)) type = 'video';
          else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) type = 'image';

          // Detect platform from path or filename
          let platform: PlatformType = 'Other';
          const pLower = fullPath.toLowerCase();
          if (pLower.includes('instagram')) platform = 'Instagram';
          else if (pLower.includes('facebook')) platform = 'Facebook';
          else if (pLower.includes('pinterest')) platform = 'Pinterest';
          else if (pLower.includes('twitter')) platform = 'Twitter';
          else if (pLower.includes('tiktok')) platform = 'TikTok';
          else if (pLower.includes('framesnap')) platform = 'Other';

          // Fetch file stat
          let sizeBytes = entry.size || 0;
          let mtime = entry.mtime ? new Date(entry.mtime) : new Date();

          let webPath = '';
          try {
            const uriRes = await Filesystem.getUri({
              path: fullPath,
              directory: Directory.Documents
            });
            webPath = uriRes.uri;
          } catch {}

          results.push({
            id: fullPath,
            filename: entry.name,
            path: fullPath,
            relativeFolder: path,
            platform,
            type,
            sizeBytes,
            formattedSize: this.formatBytes(sizeBytes),
            date: mtime,
            dateFormatted: mtime.toLocaleDateString() + ' ' + mtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            webPath: webPath || fullPath
          });
        }
      }
    } catch {
      // Folder might not have files yet
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      await Filesystem.deleteFile({
        path,
        directory: Directory.Documents
      });
      return true;
    } catch (e) {
      console.error('Delete file error:', e);
      return false;
    }
  }

  async shareFile(path: string, filename: string): Promise<boolean> {
    try {
      const uriRes = await Filesystem.getUri({
        path,
        directory: Directory.Documents
      });
      await Share.share({
        title: filename,
        text: `Shared from ALL SOCIAL DOWNLOADER: ${filename}`,
        url: uriRes.uri,
        dialogTitle: 'Share with...'
      });
      return true;
    } catch (e) {
      console.error('Share error:', e);
      return false;
    }
  }

  async clearTempFiles(): Promise<number> {
    // Cleans only application temp cache, NEVER touches user downloaded media!
    try {
      const cacheDir = await Filesystem.readdir({
        path: '',
        directory: Directory.Cache
      });
      let cleared = 0;
      for (const f of cacheDir.files) {
        await Filesystem.deleteFile({
          path: f.name,
          directory: Directory.Cache
        }).catch(() => {});
        cleared++;
      }
      return cleared;
    } catch {
      return 0;
    }
  }

  formatBytes(bytes: number, decimals = 1): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

