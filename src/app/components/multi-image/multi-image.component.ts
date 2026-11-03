import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MediaImageItem, PlatformType } from '../../models/media.model';
import { DownloadManagerService } from '../../services/download-manager.service';

@Component({
  selector: 'app-multi-image',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="multi-image-container fade-in">
      <div class="header-bar">
        <div class="title-info">
          <mat-icon class="icon">photo_library</mat-icon>
          <span class="count-text">MEDIA FOUND: {{ images.length }} IMAGES</span>
        </div>
        <div class="selection-actions">
          <button class="btn-action" (click)="selectAll()">SELECT ALL</button>
          <button class="btn-action" (click)="deselectAll()">DESELECT ALL</button>
        </div>
      </div>

      <!-- Responsive Grid -->
      <div class="image-grid">
        <div 
          *ngFor="let img of images" 
          class="grid-item"
          [class.is-selected]="img.selected"
          (click)="toggleSelect(img)">
          <img [src]="img.thumbnail || img.url" [alt]="img.title || 'Image'" loading="lazy" />
          
          <div class="select-badge" [class.selected]="img.selected">
            <mat-icon *ngIf="img.selected">check</mat-icon>
          </div>

          <div class="preview-btn" (click)="openPreview(img, $event)" title="Full preview">
            <mat-icon>fullscreen</mat-icon>
          </div>
        </div>
      </div>

      <!-- Download Action Bar -->
      <div class="download-bar">
        <div class="selected-count">
          Selected: <strong>{{ selectedCount() }}</strong> / {{ images.length }}
        </div>
        <div class="action-buttons">
          <button 
            class="btn-primary" 
            [disabled]="selectedCount() === 0"
            (click)="downloadSelected()">
            <mat-icon>download</mat-icon>
            DOWNLOAD SELECTED ({{ selectedCount() }})
          </button>
          <button 
            class="btn-secondary"
            (click)="downloadAll()">
            DOWNLOAD ALL ({{ images.length }})
          </button>
        </div>
      </div>

      <!-- Full-screen Preview Modal -->
      <div class="modal-overlay" *ngIf="previewImage()" (click)="closePreview()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <button class="close-btn" (click)="closePreview()">
            <mat-icon>close</mat-icon>
          </button>
          <img [src]="previewImage()?.url" alt="Full Preview" />
          <div class="modal-bottom">
            <span>Image {{ previewImage()?.index }} of {{ images.length }}</span>
            <button class="btn-primary small" (click)="downloadSingle(previewImage()!)">
              <mat-icon>download</mat-icon> Download
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .multi-image-container {
      margin-top: 16px;
      background: var(--surface-color);
      border-radius: var(--border-radius-lg);
      border: 1px solid var(--border-color);
      padding: 16px;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 14px;

      .title-info {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--primary-color);
        font-weight: 700;
        font-size: 0.95rem;

        .icon {
          font-size: 22px;
          height: 22px;
          width: 22px;
        }
      }

      .selection-actions {
        display: flex;
        gap: 8px;

        .btn-action {
          background: var(--surface-alt);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: var(--border-radius-sm);
          cursor: pointer;

          &:hover {
            background: var(--surface-hover);
          }
        }
      }
    }

    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 10px;
      max-height: 400px;
      overflow-y: auto;
      padding: 4px;

      .grid-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: var(--border-radius-md);
        overflow: hidden;
        border: 2px solid transparent;
        cursor: pointer;
        background: var(--surface-alt);

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }

        &.is-selected {
          border-color: var(--primary-color);
        }

        .select-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.4);
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;

          &.selected {
            background: var(--primary-color);
            border-color: var(--primary-color);
          }

          mat-icon {
            font-size: 14px;
            height: 14px;
            width: 14px;
          }
        }

        .preview-btn {
          position: absolute;
          bottom: 6px;
          right: 6px;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;

          &:hover {
            opacity: 1;
          }

          mat-icon {
            font-size: 16px;
            height: 16px;
            width: 16px;
          }
        }
      }
    }

    .download-bar {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 10px;

      .selected-count {
        font-size: 0.85rem;
        color: var(--text-muted);
      }

      .action-buttons {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;

        button {
          flex: 1;
          min-width: 140px;
        }
      }
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.88);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;

      .modal-content {
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
          top: -38px;
          right: 0;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          cursor: pointer;
        }

        .modal-bottom {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          color: white;

          .small {
            padding: 8px 14px;
            font-size: 0.85rem;
          }
        }
      }
    }
  `]
})
export class MultiImageComponent implements OnInit {
  @Input() images: MediaImageItem[] = [];
  @Input() platform: PlatformType = 'Other';
  @Input() title = 'Social Post';

  selectedCount = signal<number>(0);
  previewImage = signal<MediaImageItem | null>(null);

  constructor(private downloadManager: DownloadManagerService) {}

  ngOnInit() {
    this.selectAll();
  }

  selectAll() {
    this.images.forEach(img => img.selected = true);
    this.updateCount();
  }

  deselectAll() {
    this.images.forEach(img => img.selected = false);
    this.updateCount();
  }

  toggleSelect(img: MediaImageItem) {
    img.selected = !img.selected;
    this.updateCount();
  }

  private updateCount() {
    this.selectedCount.set(this.images.filter(i => i.selected).length);
  }

  openPreview(img: MediaImageItem, event: MouseEvent) {
    event.stopPropagation();
    this.previewImage.set(img);
  }

  closePreview() {
    this.previewImage.set(null);
  }

  downloadSelected() {
    const selected = this.images.filter(i => i.selected);
    selected.forEach(img => {
      this.downloadSingle(img);
    });
  }

  downloadAll() {
    this.images.forEach(img => {
      this.downloadSingle(img);
    });
  }

  downloadSingle(img: MediaImageItem) {
    const itemTitle = `${this.platform} Image ${img.index}`;
    this.downloadManager.addDownload(itemTitle, this.platform, 'image', img.url);
  }
}

