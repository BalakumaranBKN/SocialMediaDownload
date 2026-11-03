import { Injectable, signal } from '@angular/core';
import { Toast } from '@capacitor/toast';
import { DownloadItem, MediaType, PlatformType } from '../models/media.model';
import { StorageService } from './storage.service';
import { MediaService } from './media.service';

@Injectable({
  providedIn: 'root'
})
export class DownloadManagerService {
  downloads = signal<DownloadItem[]>([]);
  activeDownloadsCount = signal<number>(0);

  private abortControllers = new Map<string, AbortController>();

  constructor(
    private storageService: StorageService,
    private mediaService: MediaService
  ) {}

  addDownload(
    title: string,
    platform: PlatformType,
    type: MediaType,
    downloadUrl: string,
    qualityLabel?: string,
    isMuted = false
  ): string {
    // Duplicate detection
    const existing = this.downloads().find(
      d => d.downloadUrl === downloadUrl && (d.status === 'downloading' || d.status === 'queued')
    );
    if (existing) {
      Toast.show({ text: `Already in queue: ${title}` }).catch(() => {});
      return existing.id;
    }

    const id = 'dl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newItem: DownloadItem = {
      id,
      title: title || `${platform} ${type}`,
      platform,
      type,
      downloadUrl,
      qualityLabel,
      progress: 0,
      status: 'queued',
      createdAt: Date.now()
    };

    this.downloads.update(list => [newItem, ...list]);
    this.startDownload(id, isMuted);
    return id;
  }

  async startDownload(id: string, isMuted = false) {
    const item = this.downloads().find(d => d.id === id);
    if (!item) return;

    item.status = 'downloading';
    item.progress = 5;
    this.activeDownloadsCount.update(c => c + 1);
    this.updateItem(item);

    const controller = new AbortController();
    this.abortControllers.set(id, controller);

    const startTime = Date.now();

    try {
      // Determine extension
      let ext = '.bin';
      if (item.type === 'gif') ext = '.gif';
      else if (item.type === 'video') ext = '.mp4';
      else ext = '.jpg';

      const filename = this.storageService.generateUniqueFilename(item.platform, item.type === 'gif' ? 'gif' : item.type === 'video' ? 'video' : 'image', ext);
      const targetFolder = this.storageService.getTargetSubdirectory(item.platform, item.type === 'gif' ? 'gif' : item.type === 'video' ? 'video' : 'image');

      let blob: Blob;

      if (isMuted) {
        // Mute stream download via backend
        item.progress = 15;
        this.updateItem(item);
        blob = await this.fetchWithProgress(
          `${this.mediaService.getBackendUrl()}/api/media/mute`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: item.downloadUrl })
          },
          controller.signal,
          (percent, speed, received, total) => {
            item.progress = 15 + Math.round(percent * 0.75);
            item.speed = speed;
            item.receivedBytes = received;
            item.totalBytes = total;
            this.updateItem(item);
          }
        );
      } else {
        // Direct or backend streaming download
        blob = await this.fetchWithProgress(
          item.downloadUrl,
          { method: 'GET' },
          controller.signal,
          (percent, speed, received, total) => {
            item.progress = Math.round(percent * 0.9);
            item.speed = speed;
            item.receivedBytes = received;
            item.totalBytes = total;
            this.updateItem(item);
          }
        ).catch(async () => {
          // If direct download blocked by CORS, fallback to backend download proxy
          return await this.fetchWithProgress(
            `${this.mediaService.getBackendUrl()}/api/media/download`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: item.downloadUrl, filename })
            },
            controller.signal,
            (percent, speed, received, total) => {
              item.progress = Math.round(percent * 0.9);
              item.speed = speed;
              item.receivedBytes = received;
              item.totalBytes = total;
              this.updateItem(item);
            }
          );
        });
      }

      item.progress = 92;
      this.updateItem(item);

      // Convert blob to base64 for saving
      const base64Data = await this.blobToBase64(blob);

      const saveRes = await this.storageService.saveFile(targetFolder, filename, base64Data);

      item.progress = 100;
      item.status = 'completed';
      item.savedLocation = saveRes.fullPath;
      item.totalBytes = blob.size;
      this.updateItem(item);

      await Toast.show({
        text: `Downloaded: ${filename}`,
        duration: 'short'
      }).catch(() => {});

    } catch (err: any) {
      if (err.name === 'AbortError') {
        item.status = 'cancelled';
        item.error = 'Download cancelled';
      } else {
        item.status = 'failed';
        item.error = err?.message || 'Download failed. Please retry.';
        await Toast.show({
          text: `Download failed: ${item.title}`,
          duration: 'long'
        }).catch(() => {});
      }
      this.updateItem(item);
    } finally {
      this.abortControllers.delete(id);
      this.activeDownloadsCount.update(c => Math.max(0, c - 1));
    }
  }

  cancelDownload(id: string) {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
    }
  }

  retryDownload(id: string) {
    this.startDownload(id);
  }

  private updateItem(item: DownloadItem) {
    this.downloads.update(list => list.map(d => d.id === item.id ? { ...item } : d));
  }

  private async fetchWithProgress(
    url: string,
    options: RequestInit,
    signal: AbortSignal,
    onProgress: (percent: number, speed: string, received: number, total: number) => void
  ): Promise<Blob> {
    const response = await fetch(url, { ...options, signal });
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    let receivedBytes = 0;
    const startTime = Date.now();

    const reader = response.body?.getReader();
    if (!reader) {
      return await response.blob();
    }

    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        receivedBytes += value.length;

        const elapsedSec = (Date.now() - startTime) / 1000;
        const bytesPerSec = elapsedSec > 0 ? receivedBytes / elapsedSec : 0;
        const speedFormatted = this.formatSpeed(bytesPerSec);

        const percent = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 50;
        onProgress(percent, speedFormatted, receivedBytes, totalBytes);
      }
    }

    return new Blob(chunks as BlobPart[]);
  }

  private formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec <= 0) return '0 KB/s';
    if (bytesPerSec >= 1024 * 1024) {
      return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
    }
    return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data:*;base64, prefix if present
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

