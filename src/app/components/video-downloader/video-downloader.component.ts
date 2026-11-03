import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PlatformType, VideoQualityOption } from '../../models/media.model';
import { DownloadManagerService } from '../../services/download-manager.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-video-downloader',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="video-downloader-card fade-in">
      <!-- Video Preview & Thumbnail Player -->
      <div class="preview-container">
        <video 
          #videoPlayer 
          [src]="selectedQuality()?.url || primaryUrl" 
          [poster]="thumbnail"
          controls 
          playsinline 
          class="video-element">
        </video>
        <div class="duration-badge" *ngIf="duration && duration > 0">
          <mat-icon>schedule</mat-icon>
          <span>{{ formatDuration(duration) }}</span>
        </div>
      </div>

      <!-- Title & Platform Info -->
      <div class="video-meta">
        <h3 class="video-title">{{ title || 'Social Media Video' }}</h3>
        <div class="meta-row">
          <span class="platform-chip">{{ platform }}</span>
          <span class="size-chip" *ngIf="selectedQuality()?.filesize">
            {{ storageService.formatBytes(selectedQuality()!.filesize!) }}
          </span>
        </div>
      </div>

      <!-- Quality Selection (Only available resolutions) -->
      <div class="quality-section" *ngIf="qualityOptions && qualityOptions.length > 0">
        <label class="section-label">Available Resolutions:</label>
        <div class="quality-chips">
          <button 
            *ngFor="let opt of qualityOptions"
            class="chip-btn"
            [class.active]="selectedQuality()?.resolution === opt.resolution"
            (click)="selectQuality(opt)">
            <span class="res-text">{{ opt.label || opt.resolution }}</span>
            <span class="size-sub" *ngIf="opt.filesize">({{ storageService.formatBytes(opt.filesize) }})</span>
          </button>
        </div>
      </div>

      <!-- 3 Main Download Mode Buttons -->
      <div class="download-modes">
        <label class="section-label">Download Options:</label>

        <!-- 1. Original Video -->
        <button class="mode-btn primary-mode" (click)="downloadOriginal()">
          <div class="mode-icon"><mat-icon>movie</mat-icon></div>
          <div class="mode-info">
            <span class="mode-title">1. ORIGINAL VIDEO</span>
            <span class="mode-desc">Download with original video and audio quality</span>
          </div>
          <mat-icon class="arrow">arrow_forward</mat-icon>
        </button>

        <!-- 2. Muted Video -->
        <button class="mode-btn muted-mode" (click)="downloadMuted()">
          <div class="mode-icon"><mat-icon>volume_off</mat-icon></div>
          <div class="mode-info">
            <span class="mode-title">2. MUTED VIDEO</span>
            <span class="mode-desc">Download video without audio (FFmpeg stripped)</span>
          </div>
          <mat-icon class="arrow">arrow_forward</mat-icon>
        </button>

        <!-- 3. Video With Original Music / Audio -->
        <button class="mode-btn audio-mode" (click)="downloadWithMusic()">
          <div class="mode-icon"><mat-icon>music_note</mat-icon></div>
          <div class="mode-info">
            <span class="mode-title">3. VIDEO WITH ORIGINAL MUSIC</span>
            <span class="mode-desc">Preserve original sound / audio track</span>
          </div>
          <mat-icon class="arrow">arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .video-downloader-card {
      margin-top: 16px;
      background: var(--surface-color);
      border-radius: var(--border-radius-lg);
      border: 1px solid var(--border-color);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .preview-container {
      position: relative;
      width: 100%;
      border-radius: var(--border-radius-md);
      overflow: hidden;
      background: #000;
      aspect-ratio: 16 / 9;
      max-height: 280px;

      .video-element {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .duration-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.75);
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 4px;
        backdrop-filter: blur(4px);

        mat-icon {
          font-size: 14px;
          height: 14px;
          width: 14px;
        }
      }
    }

    .video-meta {
      .video-title {
        font-size: 1.05rem;
        font-weight: 700;
        margin-bottom: 8px;
        color: var(--text-main);
        line-height: 1.3;
      }

      .meta-row {
        display: flex;
        gap: 8px;
        align-items: center;

        .platform-chip {
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary-color);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .size-chip {
          background: var(--surface-alt);
          color: var(--text-muted);
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 6px;
        }
      }
    }

    .section-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .quality-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .chip-btn {
        background: var(--surface-alt);
        border: 1px solid var(--border-color);
        color: var(--text-main);
        padding: 8px 14px;
        border-radius: var(--border-radius-md);
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;

        .size-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        &.active {
          background: var(--primary-color);
          border-color: var(--primary-color);
          color: white;

          .size-sub {
            color: rgba(255, 255, 255, 0.85);
          }
        }
      }
    }

    .download-modes {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .mode-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: var(--border-radius-md);
        border: 1px solid var(--border-color);
        background: var(--surface-alt);
        color: var(--text-main);
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;

        &:hover {
          background: var(--surface-hover);
          transform: translateX(2px);
        }

        &:active {
          transform: scale(0.98);
        }

        .mode-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);

          mat-icon {
            font-size: 22px;
          }
        }

        .mode-info {
          flex: 1;

          .mode-title {
            display: block;
            font-size: 0.9rem;
            font-weight: 700;
          }

          .mode-desc {
            display: block;
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 2px;
          }
        }

        .arrow {
          color: var(--text-muted);
          font-size: 20px;
        }

        &.primary-mode {
          border-color: rgba(99, 102, 241, 0.4);
          .mode-icon {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
          }
        }

        &.muted-mode {
          border-color: rgba(239, 68, 68, 0.3);
          .mode-icon {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
          }
        }

        &.audio-mode {
          border-color: rgba(16, 185, 129, 0.3);
          .mode-icon {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
          }
        }
      }
    }
  `]
})
export class VideoDownloaderComponent implements OnInit {
  @Input() title = 'Social Video';
  @Input() platform: PlatformType = 'Other';
  @Input() thumbnail = '';
  @Input() duration = 0;
  @Input() primaryUrl = '';
  @Input() audioUrl?: string;
  @Input() qualityOptions: VideoQualityOption[] = [];

  selectedQuality = signal<VideoQualityOption | null>(null);

  constructor(
    public storageService: StorageService,
    private downloadManager: DownloadManagerService
  ) {}

  ngOnInit() {
    if (this.qualityOptions && this.qualityOptions.length > 0) {
      this.selectedQuality.set(this.qualityOptions[0]);
    }
  }

  selectQuality(option: VideoQualityOption) {
    this.selectedQuality.set(option);
  }

  downloadOriginal() {
    const targetUrl = this.selectedQuality()?.url || this.primaryUrl;
    const label = this.selectedQuality()?.label || 'Original';
    this.downloadManager.addDownload(this.title, this.platform, 'video', targetUrl, label, false);
  }

  downloadMuted() {
    const targetUrl = this.selectedQuality()?.url || this.primaryUrl;
    this.downloadManager.addDownload(`${this.title} (Muted)`, this.platform, 'video', targetUrl, 'Muted', true);
  }

  downloadWithMusic() {
    // Preserves original audio/music
    const targetUrl = this.audioUrl || this.selectedQuality()?.url || this.primaryUrl;
    this.downloadManager.addDownload(`${this.title} (Audio)`, this.platform, 'video', targetUrl, 'Original Audio', false);
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

