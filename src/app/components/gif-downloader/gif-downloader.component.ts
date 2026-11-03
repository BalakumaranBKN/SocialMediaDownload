import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DownloadManagerService } from '../../services/download-manager.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-gif-downloader',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="gif-card fade-in">
      <div class="gif-preview-container">
        <img [src]="previewUrl || downloadUrl" alt="Animated GIF Preview" class="gif-img" />
        <span class="animated-badge">
          <mat-icon>gif</mat-icon> ANIMATED GIF
        </span>
      </div>

      <div class="gif-meta">
        <div class="meta-item" *ngIf="dimensions">
          <span class="label">Dimensions:</span>
          <span class="value">{{ dimensions }}</span>
        </div>
        <div class="meta-item" *ngIf="filesize">
          <span class="label">File Size:</span>
          <span class="value">{{ storageService.formatBytes(filesize) }}</span>
        </div>
        <div class="meta-item" *ngIf="frameCount && frameCount > 1">
          <span class="label">Frames:</span>
          <span class="value">{{ frameCount }} frames</span>
        </div>
      </div>

      <button class="btn-primary full-width" (click)="downloadGif()">
        <mat-icon>download</mat-icon>
        DOWNLOAD ORIGINAL GIF
      </button>
    </div>
  `,
  styles: [`
    .gif-card {
      margin-top: 16px;
      background: var(--surface-color);
      border-radius: var(--border-radius-lg);
      border: 1px solid var(--border-color);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .gif-preview-container {
      position: relative;
      width: 100%;
      border-radius: var(--border-radius-md);
      overflow: hidden;
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      max-height: 320px;

      .gif-img {
        max-width: 100%;
        max-height: 320px;
        object-fit: contain;
      }

      .animated-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(236, 72, 153, 0.9);
        color: white;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 4px;
        letter-spacing: 0.5px;

        mat-icon {
          font-size: 18px;
          height: 18px;
          width: 18px;
        }
      }
    }

    .gif-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      background: var(--surface-alt);
      padding: 10px 14px;
      border-radius: var(--border-radius-md);

      .meta-item {
        display: flex;
        gap: 6px;
        font-size: 0.85rem;

        .label {
          color: var(--text-muted);
        }
        .value {
          font-weight: 700;
          color: var(--text-main);
        }
      }
    }

    .full-width {
      width: 100%;
      padding: 14px;
    }
  `]
})
export class GifDownloaderComponent {
  @Input() previewUrl = '';
  @Input() downloadUrl = '';
  @Input() dimensions = '';
  @Input() filesize = 0;
  @Input() frameCount = 0;
  @Input() title = 'Social GIF';

  constructor(
    public storageService: StorageService,
    private downloadManager: DownloadManagerService
  ) {}

  downloadGif() {
    this.downloadManager.addDownload(this.title, 'Direct GIF', 'gif', this.downloadUrl || this.previewUrl);
  }
}

