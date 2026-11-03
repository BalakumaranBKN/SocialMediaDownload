import { Injectable, signal } from '@angular/core';
import { FrameSnapItem } from '../models/media.model';
import { StorageService } from './storage.service';
import { Toast } from '@capacitor/toast';

@Injectable({
  providedIn: 'root'
})
export class FrameSnapService {
  extractedFrames = signal<FrameSnapItem[]>([]);
  isExtracting = signal<boolean>(false);
  extractionProgress = signal<number>(0);
  currentVideoMeta = signal<{
    name: string;
    duration: number;
    width: number;
    height: number;
    size: number;
    url: string;
  } | null>(null);

  private shouldCancel = false;

  constructor(private storageService: StorageService) {}

  cancelExtraction() {
    this.shouldCancel = true;
  }

  async extractFrames(
    file: File,
    intervalSec: number,
    format: 'jpg' | 'png' = 'jpg'
  ): Promise<FrameSnapItem[]> {
    this.isExtracting.set(true);
    this.extractionProgress.set(0);
    this.extractedFrames.set([]);
    this.shouldCancel = false;

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;

      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;

      video.onloadedmetadata = async () => {
        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;

        this.currentVideoMeta.set({
          name: file.name,
          duration,
          width,
          height,
          size: file.size,
          url: videoUrl
        });

        if (!duration || duration <= 0) {
          this.isExtracting.set(false);
          URL.revokeObjectURL(videoUrl);
          reject(new Error('Invalid video duration.'));
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          this.isExtracting.set(false);
          URL.revokeObjectURL(videoUrl);
          reject(new Error('Canvas context could not be created.'));
          return;
        }

        const items: FrameSnapItem[] = [];
        const timestamps: number[] = [];

        // Build list of seek times
        for (let t = 0; t < duration; t += intervalSec) {
          timestamps.push(t);
        }
        if (timestamps.length === 0) {
          timestamps.push(0);
        }

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'png' ? undefined : 0.95;

        try {
          for (let i = 0; i < timestamps.length; i++) {
            if (this.shouldCancel) break;

            const targetTime = timestamps[i];
            await this.seekVideo(video, targetTime);

            // Draw at original resolution
            ctx.drawImage(video, 0, 0, width, height);

            const blob = await new Promise<Blob>((res) => {
              canvas.toBlob((b) => res(b || new Blob()), mimeType, quality);
            });

            const dataUrl = canvas.toDataURL(mimeType, quality);

            const frameItem: FrameSnapItem = {
              id: `frame_${i}_${Date.now()}`,
              index: i + 1,
              timeSec: targetTime,
              dataUrl,
              blob,
              sizeBytes: blob.size,
              dimensions: `${width}x${height}`,
              selected: true // Default selected
            };

            items.push(frameItem);
            this.extractedFrames.set([...items]);

            const progress = Math.round(((i + 1) / timestamps.length) * 100);
            this.extractionProgress.set(progress);
          }

          this.isExtracting.set(false);
          URL.revokeObjectURL(videoUrl);
          resolve(items);
        } catch (err) {
          this.isExtracting.set(false);
          URL.revokeObjectURL(videoUrl);
          reject(err);
        }
      };

      video.onerror = (e) => {
        this.isExtracting.set(false);
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Failed to load video file for extraction.'));
      };
    });
  }

  private seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = Math.min(time, video.duration - 0.05);
    });
  }

  async saveSelectedFrames(format: 'jpg' | 'png' = 'jpg'): Promise<number> {
    const selected = this.extractedFrames().filter(f => f.selected);
    if (selected.length === 0) return 0;

    let savedCount = 0;
    const targetFolder = `${this.storageService.ROOT_FOLDER}/FrameSnap`;
    const ext = format === 'png' ? '.png' : '.jpg';

    for (const frame of selected) {
      const filename = this.storageService.generateUniqueFilename('Other', 'frame', ext);
      const base64 = frame.dataUrl.includes(',') ? frame.dataUrl.split(',')[1] : frame.dataUrl;
      await this.storageService.saveFile(targetFolder, filename, base64);
      savedCount++;
    }

    await Toast.show({
      text: `Saved ${savedCount} frame(s) to FrameSnap folder!`,
      duration: 'short'
    }).catch(() => {});

    return savedCount;
  }
}

