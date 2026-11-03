import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StorageService } from '../../services/storage.service';
import { GalleryItem } from '../../models/media.model';
import { VideoPlayerComponent } from '../video-player/video-player.component';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, VideoPlayerComponent],
  template: `
    <div class="gallery-container fade-in">
      <!-- Gallery Tab Header Bar -->
      <div class="tab-header">
        <h2>{{ getTabTitle() }}</h2>
        <div class="header-actions">
          <button class="icon-action-btn" (click)="refreshGallery()" title="Refresh Gallery">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="filteredItems().length === 0 && !isLoading()">
        <mat-icon class="empty-icon">{{ getEmptyIcon() }}</mat-icon>
        <h3>No {{ activeTab }} Yet</h3>
        <p>Downloaded {{ activeTab.toLowerCase() }} will appear here automatically without any database.</p>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading()">
        <mat-icon class="spin-icon">sync</mat-icon>
        <span>Scanning phone storage folders...</span>
      </div>

      <!-- 1. Images View -->
      <div class="media-grid" *ngIf="activeTab === 'Images' && filteredItems().length > 0">
        <div 
          *ngFor="let item of filteredItems()" 
          class="media-card"
          (click)="openImagePreview(item)">
          <img [src]="item.webPath" [alt]="item.filename" loading="lazy" />
          <span class="platform-badge">{{ item.platform }}</span>
          <div class="card-footer">
            <span class="item-name">{{ item.filename }}</span>
            <div class="card-actions" (click)="$event.stopPropagation()">
              <button class="mini-btn" (click)="shareItem(item)" title="Share"><mat-icon>share</mat-icon></button>
              <button class="mini-btn delete" (click)="deleteItem(item)" title="Delete"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Videos View -->
      <div class="video-grid" *ngIf="activeTab === 'Videos' && filteredItems().length > 0">
        <div 
          *ngFor="let item of filteredItems()" 
          class="video-card"
          (click)="playVideo(item)">
          <div class="thumbnail-wrapper">
            <video [src]="item.webPath" preload="metadata" class="thumb-video"></video>
            <div class="play-overlay"><mat-icon>play_circle_filled</mat-icon></div>
            <span class="platform-badge">{{ item.platform }}</span>
          </div>
          <div class="video-info">
            <span class="item-name">{{ item.filename }}</span>
            <div class="video-sub">
              <span>{{ item.formattedSize }}</span>
              <span>{{ item.dateFormatted }}</span>
            </div>
            <div class="card-actions" (click)="$event.stopPropagation()">
              <button class="mini-btn" (click)="shareItem(item)"><mat-icon>share</mat-icon></button>
              <button class="mini-btn delete" (click)="deleteItem(item)"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. GIFs View -->
      <div class="media-grid" *ngIf="activeTab === 'GIFs' && filteredItems().length > 0">
        <div 
          *ngFor="let item of filteredItems()" 
          class="media-card"
          (click)="openImagePreview(item)">
          <img [src]="item.webPath" [alt]="item.filename" loading="lazy" />
          <span class="gif-tag">GIF</span>
          <div class="card-footer">
            <span class="item-name">{{ item.filename }}</span>
            <div class="card-actions" (click)="$event.stopPropagation()">
              <button class="mini-btn" (click)="shareItem(item)"><mat-icon>share</mat-icon></button>
              <button class="mini-btn delete" (click)="deleteItem(item)"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. History View (No Database - Scanned from folders) -->
      <div class="history-list" *ngIf="activeTab === 'History' && filteredItems().length > 0">
        <div class="history-intro">
          <mat-icon>folder_open</mat-icon>
          <span>Scanned dynamically from <code>All Social Downloader</code> phone folders</span>
        </div>

        <div *ngFor="let item of filteredItems()" class="history-card">
          <div class="history-icon" [ngClass]="item.type">
            <mat-icon>{{ item.type === 'video' ? 'movie' : item.type === 'gif' ? 'gif' : 'image' }}</mat-icon>
          </div>
          <div class="history-details">
            <span class="history-filename">{{ item.filename }}</span>
            <div class="history-sub">
              <span class="platform-tag">{{ item.platform }}</span>
              <span>{{ item.formattedSize }}</span>
              <span>{{ item.dateFormatted }}</span>
            </div>
            <span class="history-path">{{ item.path }}</span>
          </div>
          <div class="history-actions">
            <button class="action-circle" (click)="handleOpen(item)" title="Open"><mat-icon>open_in_new</mat-icon></button>
            <button class="action-circle" (click)="shareItem(item)" title="Share"><mat-icon>share</mat-icon></button>
            <button class="action-circle danger" (click)="deleteItem(item)" title="Delete"><mat-icon>delete</mat-icon></button>
          </div>
        </div>
      </div>

      <!-- Built-in Video Player Modal -->
      <app-video-player 
        *ngIf="activePlayingVideo()"
        [videoSrc]="activePlayingVideo()!.webPath || ''"
        [title]="activePlayingVideo()!.filename"
        [filePath]="activePlayingVideo()!.path"
        [formattedSize]="activePlayingVideo()!.formattedSize"
        (close)="activePlayingVideo.set(null)">
      </app-video-player>

      <!-- Image / GIF Preview Modal -->
      <div class="image-modal-overlay" *ngIf="activePreviewItem()" (click)="activePreviewItem.set(null)">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <button class="close-btn" (click)="activePreviewItem.set(null)"><mat-icon>close</mat-icon></button>
          <img [src]="activePreviewItem()?.webPath" alt="Preview" />
          <div class="modal-actions">
            <span>{{ activePreviewItem()?.filename }} ({{ activePreviewItem()?.formattedSize }})</span>
            <button class="btn-primary small" (click)="shareItem(activePreviewItem()!)">
              <mat-icon>share</mat-icon> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gallery-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tab-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 {
        font-size: 1.3rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .icon-action-btn {
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        color: var(--text-main);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;

        &:hover {
          background: var(--surface-hover);
        }
      }
    }

    .empty-state {
      padding: 48px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;

      .empty-icon {
        font-size: 56px;
        height: 56px;
        width: 56px;
        color: var(--text-muted);
        opacity: 0.6;
      }

      h3 {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text-main);
      }

      p {
        font-size: 0.85rem;
        color: var(--text-muted);
        max-width: 280px;
      }
    }

    .loading-state {
      padding: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: var(--text-muted);
      font-size: 0.9rem;

      .spin-icon {
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
      gap: 10px;
    }

    .media-card {
      position: relative;
      aspect-ratio: 1;
      border-radius: var(--border-radius-md);
      overflow: hidden;
      background: var(--surface-alt);
      border: 1px solid var(--border-color);
      cursor: pointer;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .platform-badge {
        position: absolute;
        top: 6px;
        left: 6px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        font-size: 0.65rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        backdrop-filter: blur(4px);
      }

      .gif-tag {
        position: absolute;
        top: 6px;
        right: 6px;
        background: #ec4899;
        color: white;
        font-size: 0.65rem;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .card-footer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 6px 8px;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 100%);
        display: flex;
        justify-content: space-between;
        align-items: center;

        .item-name {
          color: white;
          font-size: 0.7rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 65%;
        }

        .card-actions {
          display: flex;
          gap: 4px;
        }
      }
    }

    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .video-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      overflow: hidden;
      cursor: pointer;

      .thumbnail-wrapper {
        position: relative;
        aspect-ratio: 16 / 9;
        background: #000;

        .thumb-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .play-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);

          mat-icon {
            font-size: 36px;
            height: 36px;
            width: 36px;
            color: white;
          }
        }

        .platform-badge {
          position: absolute;
          top: 6px;
          left: 6px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
        }
      }

      .video-info {
        padding: 8px 10px;

        .item-name {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-main);
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .video-sub {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-muted);
          margin: 4px 0 6px;
        }

        .card-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
        }
      }
    }

    .mini-btn {
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: white;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      mat-icon {
        font-size: 15px;
        height: 15px;
        width: 15px;
      }

      &.delete {
        background: rgba(239, 68, 68, 0.4);
      }
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .history-intro {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: var(--border-radius-md);
        background: var(--surface-alt);
        font-size: 0.8rem;
        color: var(--text-muted);

        mat-icon {
          font-size: 20px;
          color: var(--primary-color);
        }

        code {
          color: var(--primary-color);
          font-weight: 700;
        }
      }

      .history-card {
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: 12px;

        .history-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;

          &.video { background: #6366f1; }
          &.gif { background: #ec4899; }
          &.image { background: #10b981; }
        }

        .history-details {
          flex: 1;
          overflow: hidden;

          .history-filename {
            display: block;
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--text-main);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .history-sub {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.72rem;
            color: var(--text-muted);
            margin: 2px 0;

            .platform-tag {
              background: var(--surface-alt);
              padding: 1px 6px;
              border-radius: 4px;
              font-weight: 600;
              color: var(--primary-color);
            }
          }

          .history-path {
            display: block;
            font-size: 0.68rem;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            opacity: 0.75;
          }
        }

        .history-actions {
          display: flex;
          gap: 6px;

          .action-circle {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--surface-alt);
            border: 1px solid var(--border-color);
            color: var(--text-main);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;

            mat-icon {
              font-size: 16px;
            }

            &.danger {
              color: var(--danger-color);
            }
          }
        }
      }
    }

    .image-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: 2800;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;

      .modal-box {
        position: relative;
        max-width: 90vw;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        align-items: center;

        img {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
          border-radius: var(--border-radius-md);
        }

        .close-btn {
          position: absolute;
          top: -36px;
          right: 0;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          cursor: pointer;
        }

        .modal-actions {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 14px;
          color: white;
          font-size: 0.85rem;

          .small {
            padding: 6px 12px;
            font-size: 0.8rem;
          }
        }
      }
    }
  `]
})
export class GalleryComponent implements OnInit {
  @Input() activeTab: 'Images' | 'Videos' | 'GIFs' | 'History' = 'Images';

  allItems = signal<GalleryItem[]>([]);
  isLoading = signal<boolean>(false);
  activePlayingVideo = signal<GalleryItem | null>(null);
  activePreviewItem = signal<GalleryItem | null>(null);

  constructor(private storageService: StorageService) {}

  ngOnInit() {
    this.refreshGallery();
  }

  getTabTitle(): string {
    switch (this.activeTab) {
      case 'Images': return 'Downloaded Images';
      case 'Videos': return 'Downloaded Videos';
      case 'GIFs': return 'Downloaded GIFs';
      case 'History': return 'Download History (Folder Scan)';
    }
  }

  getEmptyIcon(): string {
    switch (this.activeTab) {
      case 'Images': return 'photo_library';
      case 'Videos': return 'videocam';
      case 'GIFs': return 'gif';
      case 'History': return 'history';
    }
  }

  async refreshGallery() {
    this.isLoading.set(true);
    try {
      const items = await this.storageService.scanGalleryItems();
      this.allItems.set(items);
    } finally {
      this.isLoading.set(false);
    }
  }

  filteredItems(): GalleryItem[] {
    const list = this.allItems();
    if (this.activeTab === 'History') return list;
    if (this.activeTab === 'Images') return list.filter(i => i.type === 'image');
    if (this.activeTab === 'Videos') return list.filter(i => i.type === 'video');
    if (this.activeTab === 'GIFs') return list.filter(i => i.type === 'gif');
    return list;
  }

  openImagePreview(item: GalleryItem) {
    this.activePreviewItem.set(item);
  }

  playVideo(item: GalleryItem) {
    this.activePlayingVideo.set(item);
  }

  handleOpen(item: GalleryItem) {
    if (item.type === 'video') {
      this.playVideo(item);
    } else {
      this.openImagePreview(item);
    }
  }

  async shareItem(item: GalleryItem) {
    await this.storageService.shareFile(item.path, item.filename);
  }

  async deleteItem(item: GalleryItem) {
    const ok = await this.storageService.deleteFile(item.path);
    if (ok) {
      this.allItems.update(list => list.filter(i => i.id !== item.id));
    }
  }
}

