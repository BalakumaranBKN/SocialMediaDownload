import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MediaService } from '../../services/media.service';
import { StorageService } from '../../services/storage.service';
import { DownloadManagerService } from '../../services/download-manager.service';
import { MediaInspectResponse, PlatformType } from '../../models/media.model';
import { MultiImageComponent } from '../multi-image/multi-image.component';
import { VideoDownloaderComponent } from '../video-downloader/video-downloader.component';
import { GifDownloaderComponent } from '../gif-downloader/gif-downloader.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MultiImageComponent,
    VideoDownloaderComponent,
    GifDownloaderComponent
  ],
  template: `
    <div class="home-container fade-in">
      <!-- Hero Header -->
      <div class="hero-section">
        <div class="title-badge">
          <mat-icon>cloud_download</mat-icon>
          <span>ALL SOCIAL DOWNLOADER</span>
        </div>
        <h1>Download Social Media Videos, Photos & GIFs</h1>
        <p>Supports Instagram, Facebook, Pinterest, Twitter / X, TikTok, Direct URLs & WhatsApp Status.</p>
      </div>

      <!-- Supported Platforms Grid Banner -->
      <div class="platforms-bar">
        <div 
          *ngFor="let p of supportedPlatforms" 
          class="p-chip"
          [class.active]="detectedPlatform() === p.name">
          <mat-icon>{{ p.icon }}</mat-icon>
          <span>{{ p.name }}</span>
        </div>
      </div>

      <!-- Main Input Card -->
      <div class="input-card">
        <div class="input-header">
          <span class="label">Paste your social media URL</span>
          <span class="detected-badge" *ngIf="detectedPlatform() !== 'Other'">
            Detected: <strong>{{ detectedPlatform() }}</strong>
          </span>
        </div>

        <div class="url-input-wrapper">
          <mat-icon class="link-icon">link</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="urlInput" 
            (ngModelChange)="onUrlChanged($event)"
            placeholder="Paste URL here (Instagram, TikTok, FB, X, etc.)..." 
            class="main-url-input" />
          <button class="clear-btn" *ngIf="urlInput" (click)="clearInput()" title="Clear">
            <mat-icon>cancel</mat-icon>
          </button>
        </div>

        <!-- Buttons Row -->
        <div class="button-row">
          <button class="btn-secondary" (click)="pasteUrl()">
            <mat-icon>content_paste</mat-icon>
            PASTE
          </button>
          <button 
            class="btn-primary fetch-btn" 
            [disabled]="!urlInput || isLoading()"
            (click)="fetchMedia()">
            <mat-icon *ngIf="!isLoading()">arrow_downward</mat-icon>
            <mat-icon *ngIf="isLoading()" class="spin">sync</mat-icon>
            {{ isLoading() ? 'FETCHING MEDIA...' : 'FETCH MEDIA' }}
          </button>
        </div>
      </div>

      <!-- Active Downloads Progress Section -->
      <div class="active-downloads-card" *ngIf="downloadManager.downloads().length > 0">
        <div class="downloads-header">
          <div class="title-with-icon">
            <mat-icon>downloading</mat-icon>
            <span>DOWNLOAD QUEUE ({{ downloadManager.downloads().length }})</span>
          </div>
        </div>

        <div class="downloads-list">
          <div *ngFor="let dl of downloadManager.downloads().slice(0, 3)" class="dl-item">
            <div class="dl-row">
              <span class="dl-title">{{ dl.title }}</span>
              <span class="dl-status" [ngClass]="dl.status">{{ dl.status }} ({{ dl.progress }}%)</span>
            </div>
            <mat-progress-bar 
              mode="determinate" 
              [value]="dl.progress" 
              [color]="dl.status === 'failed' ? 'warn' : 'primary'">
            </mat-progress-bar>
            <div class="dl-meta-row" *ngIf="dl.status === 'downloading'">
              <span>Speed: {{ dl.speed || 'Calculating...' }}</span>
              <button class="cancel-btn" (click)="downloadManager.cancelDownload(dl.id)">Cancel</button>
            </div>
            <div class="dl-meta-row" *ngIf="dl.status === 'failed'">
              <span class="error-text">{{ dl.error }}</span>
              <button class="retry-btn" (click)="downloadManager.retryDownload(dl.id)">Retry</button>
            </div>
            <div class="dl-meta-row" *ngIf="dl.status === 'completed'">
              <span class="success-text">Saved to: {{ dl.savedLocation }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State Card -->
      <div class="error-card fade-in" *ngIf="errorMessage()">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <div class="error-content">
          <h4>Retrieval Limitation</h4>
          <p>{{ errorMessage() }}</p>
        </div>
        <button class="dismiss-btn" (click)="errorMessage.set('')"><mat-icon>close</mat-icon></button>
      </div>

      <!-- Media Preview Container -->
      <div class="preview-container" *ngIf="mediaResult()">
        <!-- 1. Multiple Images -->
        <app-multi-image 
          *ngIf="mediaResult()?.type === 'multi_image' && mediaResult()?.images"
          [images]="mediaResult()!.images!"
          [platform]="mediaResult()!.platform"
          [title]="mediaResult()!.title || 'Social Images'">
        </app-multi-image>

        <!-- 2. Video -->
        <app-video-downloader
          *ngIf="mediaResult()?.type === 'video'"
          [title]="mediaResult()!.title || 'Social Video'"
          [platform]="mediaResult()!.platform"
          [thumbnail]="mediaResult()!.thumbnail || ''"
          [duration]="mediaResult()!.duration || 0"
          [primaryUrl]="mediaResult()!.primary_download_url || mediaResult()!.quality_options?.[0]?.url || ''"
          [audioUrl]="mediaResult()!.audio_url"
          [qualityOptions]="mediaResult()!.quality_options || []">
        </app-video-downloader>

        <!-- 3. GIF -->
        <app-gif-downloader
          *ngIf="mediaResult()?.type === 'gif'"
          [previewUrl]="mediaResult()!.thumbnail || mediaResult()!.primary_download_url || ''"
          [downloadUrl]="mediaResult()!.primary_download_url || ''"
          [dimensions]="mediaResult()!.dimensions || ''"
          [filesize]="mediaResult()!.filesize || 0"
          [frameCount]="mediaResult()!.frame_count || 1"
          [title]="mediaResult()!.title || 'Social GIF'">
        </app-gif-downloader>

        <!-- 4. Single Image -->
        <div class="single-image-card fade-in" *ngIf="mediaResult()?.type === 'image'">
          <div class="single-img-wrapper">
            <img [src]="mediaResult()!.thumbnail || mediaResult()!.primary_download_url" alt="Image Preview" />
            <span class="platform-badge">{{ mediaResult()!.platform }}</span>
          </div>
          <div class="single-img-footer">
            <h4>{{ mediaResult()!.title || 'Direct Image' }}</h4>
            <button class="btn-primary full-width" (click)="downloadSingleImage()">
              <mat-icon>download</mat-icon> DOWNLOAD IMAGE
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .hero-section {
      text-align: center;
      padding: 8px 4px;

      .title-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
        color: var(--primary-color);
        font-size: 0.75rem;
        font-weight: 800;
        padding: 4px 12px;
        border-radius: 20px;
        margin-bottom: 8px;
        border: 1px solid rgba(99, 102, 241, 0.3);

        mat-icon {
          font-size: 16px;
          height: 16px;
          width: 16px;
        }
      }

      h1 {
        font-size: 1.4rem;
        font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.5px;
        margin-bottom: 6px;
      }

      p {
        font-size: 0.8rem;
        color: var(--text-muted);
        line-height: 1.4;
      }
    }

    .platforms-bar {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 4px 0;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }

      .p-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: 6px 12px;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-muted);
        white-space: nowrap;
        transition: all 0.2s;

        mat-icon {
          font-size: 16px;
          height: 16px;
          width: 16px;
        }

        &.active {
          border-color: var(--primary-color);
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary-color);
        }
      }
    }

    .input-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 4px 20px var(--shadow-color);

      .input-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .detected-badge {
          font-size: 0.75rem;
          color: var(--primary-color);
          background: rgba(99, 102, 241, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }
      }

      .url-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;

        .link-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          font-size: 20px;
        }

        .main-url-input {
          width: 100%;
          padding: 14px 40px 14px 42px;
          border-radius: var(--border-radius-md);
          border: 1px solid var(--border-color);
          background: var(--surface-alt);
          color: var(--text-main);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;

          &:focus {
            border-color: var(--primary-color);
          }
        }

        .clear-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;

          mat-icon {
            font-size: 20px;
          }
        }
      }

      .button-row {
        display: flex;
        gap: 10px;

        .fetch-btn {
          flex: 1;
        }
      }
    }

    .active-downloads-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: 14px;

      .downloads-header {
        .title-with-icon {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--primary-color);
        }
      }

      .downloads-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 10px;

        .dl-item {
          background: var(--surface-alt);
          padding: 10px;
          border-radius: var(--border-radius-sm);
          display: flex;
          flex-direction: column;
          gap: 6px;

          .dl-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            font-weight: 600;

            .dl-title {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 60%;
            }

            .dl-status {
              font-size: 0.75rem;

              &.downloading { color: var(--primary-color); }
              &.completed { color: var(--success-color); }
              &.failed { color: var(--danger-color); }
            }
          }

          .dl-meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.7rem;
            color: var(--text-muted);

            .cancel-btn, .retry-btn {
              background: none;
              border: none;
              font-weight: 700;
              cursor: pointer;
            }

            .cancel-btn { color: var(--danger-color); }
            .retry-btn { color: var(--primary-color); }
            .success-text { color: var(--success-color); }
            .error-text { color: var(--danger-color); }
          }
        }
      }
    }

    .error-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--border-radius-md);
      padding: 14px;

      .error-icon {
        color: var(--danger-color);
        font-size: 24px;
      }

      .error-content {
        flex: 1;

        h4 {
          color: var(--danger-color);
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 2px;
        }

        p {
          font-size: 0.8rem;
          color: var(--text-main);
          line-height: 1.4;
        }
      }

      .dismiss-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
      }
    }

    .single-image-card {
      margin-top: 16px;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;

      .single-img-wrapper {
        position: relative;
        border-radius: var(--border-radius-md);
        overflow: hidden;
        background: #000;
        max-height: 320px;
        display: flex;
        justify-content: center;

        img {
          max-width: 100%;
          max-height: 320px;
          object-fit: contain;
        }

        .platform-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
        }
      }

      .single-img-footer {
        display: flex;
        flex-direction: column;
        gap: 10px;

        h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
        }
      }
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    .full-width {
      width: 100%;
    }
  `]
})
export class HomeComponent implements OnInit {
  urlInput = '';
  detectedPlatform = signal<PlatformType>('Other');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  mediaResult = signal<MediaInspectResponse | null>(null);

  readonly supportedPlatforms = [
    { name: 'Instagram', icon: 'photo_camera' },
    { name: 'Facebook', icon: 'facebook' },
    { name: 'Pinterest', icon: 'push_pin' },
    { name: 'Twitter', icon: 'tag' },
    { name: 'TikTok', icon: 'music_video' },
    { name: 'Direct Video', icon: 'movie' },
    { name: 'Direct Image', icon: 'image' },
    { name: 'Direct GIF', icon: 'gif' }
  ];

  constructor(
    private mediaService: MediaService,
    public downloadManager: DownloadManagerService,
    private storageService: StorageService
  ) {}

  ngOnInit() {
    this.storageService.checkAndInitFolders();
  }

  onUrlChanged(newUrl: string) {
    this.detectedPlatform.set(this.mediaService.detectPlatformLocally(newUrl));
  }

  clearInput() {
    this.urlInput = '';
    this.detectedPlatform.set('Other');
    this.errorMessage.set('');
    this.mediaResult.set(null);
  }

  async pasteUrl() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        this.urlInput = text.trim();
        this.onUrlChanged(this.urlInput);
      }
    } catch {
      // Fallback
    }
  }

  fetchMedia() {
    if (!this.urlInput) return;
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.mediaResult.set(null);

    this.mediaService.inspectMedia(this.urlInput).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (!res.success && res.error) {
          this.errorMessage.set(res.error);
        } else {
          this.mediaResult.set(res);
          if (res.platform) {
            this.detectedPlatform.set(res.platform);
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.message || 'Failed to inspect media. Server may be offline.');
      }
    });
  }

  downloadSingleImage() {
    const res = this.mediaResult();
    if (!res) return;
    const url = res.primary_download_url || res.thumbnail || '';
    this.downloadManager.addDownload(res.title || 'Image', res.platform, 'image', url);
  }
}

