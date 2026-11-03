import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FrameSnapService } from '../../services/framesnap.service';
import { FrameSnapItem } from '../../models/media.model';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-framesnap',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  template: `
    <div class="framesnap-container fade-in">
      <!-- Feature Header Banner -->
      <div class="feature-banner">
        <div class="banner-icon">
          <mat-icon>camera</mat-icon>
        </div>
        <div class="banner-text">
          <h2>FrameSnap</h2>
          <p>Extract HD photo frames from phone videos 100% offline.</p>
        </div>
      </div>

      <!-- Video Picker Card -->
      <div class="picker-card" *ngIf="!framesnapService.currentVideoMeta()">
        <input 
          #fileInput 
          type="file" 
          accept="video/*" 
          (change)="onVideoPicked($event)" 
          style="display: none;" />

        <div class="drop-zone" (click)="fileInput.click()">
          <mat-icon class="upload-icon">video_library</mat-icon>
          <h3>Browse Phone Videos</h3>
          <p>Select any local video from device gallery or storage</p>
          <button class="btn-primary">
            <mat-icon>add_photo_alternate</mat-icon>
            SELECT VIDEO
          </button>
        </div>
      </div>

      <!-- Video Selected & Configuration Card -->
      <div class="video-config-card" *ngIf="framesnapService.currentVideoMeta()">
        <div class="video-preview-header">
          <video [src]="framesnapService.currentVideoMeta()?.url" controls playsinline class="meta-player"></video>
          <div class="video-details">
            <h4>{{ framesnapService.currentVideoMeta()?.name }}</h4>
            <div class="meta-tags">
              <span>{{ formatDuration(framesnapService.currentVideoMeta()?.duration || 0) }}</span>
              <span>{{ framesnapService.currentVideoMeta()?.width }}x{{ framesnapService.currentVideoMeta()?.height }}</span>
              <span>{{ storageService.formatBytes(framesnapService.currentVideoMeta()?.size || 0) }}</span>
            </div>
            <button class="change-btn" (click)="resetVideo()">Change Video</button>
          </div>
        </div>

        <!-- Extraction Controls -->
        <div class="controls-panel">
          <div class="control-group">
            <label>Extraction Interval:</label>
            <div class="interval-chips">
              <button 
                *ngFor="let s of [1, 2, 3, 4]" 
                class="interval-chip"
                [class.active]="selectedInterval() === s && !isCustomInterval()"
                (click)="setInterval(s)">
                Every {{ s }}s
              </button>
              <button 
                class="interval-chip"
                [class.active]="isCustomInterval()"
                (click)="setCustomIntervalMode()">
                Custom
              </button>
            </div>
            <div class="custom-input-box" *ngIf="isCustomInterval()">
              <input 
                type="number" 
                step="0.5" 
                min="0.5" 
                max="60" 
                [(ngModel)]="customIntervalValue"
                placeholder="Interval (seconds)" />
              <span>seconds</span>
            </div>
          </div>

          <div class="control-group">
            <label>Output Image Format:</label>
            <div class="format-chips">
              <button 
                class="format-chip"
                [class.active]="selectedFormat() === 'jpg'"
                (click)="selectedFormat.set('jpg')">
                JPG (Optimized)
              </button>
              <button 
                class="format-chip"
                [class.active]="selectedFormat() === 'png'"
                (click)="selectedFormat.set('png')">
                PNG (Lossless)
              </button>
            </div>
          </div>

          <!-- Extract Button -->
          <button 
            class="btn-primary extract-btn"
            [disabled]="framesnapService.isExtracting()"
            (click)="startExtraction()">
            <mat-icon>{{ framesnapService.isExtracting() ? 'hourglass_top' : 'auto_awesome' }}</mat-icon>
            {{ framesnapService.isExtracting() ? 'EXTRACTING FRAMES...' : 'EXTRACT FRAMES' }}
          </button>
        </div>
      </div>

      <!-- Extraction Progress Bar -->
      <div class="progress-container" *ngIf="framesnapService.isExtracting()">
        <div class="progress-labels">
          <span>Extracting Video Frames...</span>
          <span>{{ framesnapService.extractionProgress() }}%</span>
        </div>
        <mat-progress-bar mode="determinate" [value]="framesnapService.extractionProgress()"></mat-progress-bar>
        <button class="cancel-link" (click)="framesnapService.cancelExtraction()">Cancel Extraction</button>
      </div>

      <!-- Extracted Frames Grid -->
      <div class="frames-result-card" *ngIf="framesnapService.extractedFrames().length > 0">
        <div class="frames-header">
          <div class="frames-title">
            <mat-icon>burst_mode</mat-icon>
            <span>EXTRACTED: {{ framesnapService.extractedFrames().length }} FRAMES</span>
          </div>
          <div class="header-actions">
            <button (click)="selectAll()">SELECT ALL</button>
            <button (click)="deselectAll()">DESELECT ALL</button>
          </div>
        </div>

        <div class="frames-grid">
          <div 
            *ngFor="let frame of framesnapService.extractedFrames()" 
            class="frame-item"
            [class.selected]="frame.selected"
            (click)="toggleSelect(frame)">
            <img [src]="frame.dataUrl" [alt]="frame.id" />
            <div class="frame-time">{{ formatDuration(frame.timeSec) }}</div>
            <div class="select-badge" [class.checked]="frame.selected">
              <mat-icon *ngIf="frame.selected">check</mat-icon>
            </div>
            <div class="zoom-btn" (click)="openPreview(frame, $event)">
              <mat-icon>zoom_in</mat-icon>
            </div>
          </div>
        </div>

        <!-- Save Action Bottom Bar -->
        <div class="save-bar">
          <div class="count-label">
            Selected: <strong>{{ selectedCount() }}</strong> / {{ framesnapService.extractedFrames().length }}
          </div>
          <button 
            class="btn-primary" 
            [disabled]="selectedCount() === 0"
            (click)="saveSelected()">
            <mat-icon>save_alt</mat-icon>
            SAVE SELECTED FRAMES ({{ selectedCount() }})
          </button>
        </div>
      </div>

      <!-- Full-Screen Frame Preview Modal -->
      <div class="modal-overlay" *ngIf="previewFrame()" (click)="closePreview()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <button class="close-btn" (click)="closePreview()"><mat-icon>close</mat-icon></button>
          <img [src]="previewFrame()?.dataUrl" alt="Frame Preview" />
          <div class="modal-footer">
            <span>Time: {{ formatDuration(previewFrame()?.timeSec || 0) }} | Resolution: {{ previewFrame()?.dimensions }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .framesnap-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .feature-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(236, 72, 153, 0.15));
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: 16px;

      .banner-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: linear-gradient(135deg, #6366f1, #ec4899);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;

        mat-icon {
          font-size: 26px;
        }
      }

      .banner-text {
        h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 2px;
        }
        p {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
      }
    }

    .picker-card {
      background: var(--surface-color);
      border: 2px dashed var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: 32px 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: var(--primary-color);
        background: var(--surface-alt);
      }

      .drop-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;

        .upload-icon {
          font-size: 48px;
          height: 48px;
          width: 48px;
          color: var(--primary-color);
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

        button {
          margin-top: 8px;
        }
      }
    }

    .video-config-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;

      .video-preview-header {
        display: flex;
        gap: 12px;
        align-items: center;

        .meta-player {
          width: 110px;
          height: 70px;
          border-radius: 8px;
          background: #000;
          object-fit: cover;
        }

        .video-details {
          flex: 1;

          h4 {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-main);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 200px;
          }

          .meta-tags {
            display: flex;
            gap: 6px;
            margin: 4px 0;

            span {
              background: var(--surface-alt);
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 0.7rem;
              color: var(--text-muted);
            }
          }

          .change-btn {
            background: none;
            border: none;
            color: var(--primary-color);
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            padding: 0;
          }
        }
      }

      .controls-panel {
        display: flex;
        flex-direction: column;
        gap: 14px;

        .control-group {
          label {
            display: block;
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--text-muted);
            margin-bottom: 6px;
            text-transform: uppercase;
          }

          .interval-chips, .format-chips {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;

            button {
              background: var(--surface-alt);
              border: 1px solid var(--border-color);
              color: var(--text-main);
              padding: 8px 12px;
              border-radius: var(--border-radius-md);
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;

              &.active {
                background: var(--primary-color);
                border-color: var(--primary-color);
                color: white;
              }
            }
          }

          .custom-input-box {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;

            input {
              width: 90px;
              padding: 6px 10px;
              border-radius: var(--border-radius-sm);
              border: 1px solid var(--border-color);
              background: var(--surface-alt);
              color: var(--text-main);
            }
            span {
              font-size: 0.85rem;
              color: var(--text-muted);
            }
          }
        }

        .extract-btn {
          width: 100%;
          padding: 14px;
        }
      }
    }

    .progress-container {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      padding: 14px;

      .progress-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        font-weight: 700;
        margin-bottom: 8px;
        color: var(--text-main);
      }

      .cancel-link {
        margin-top: 8px;
        background: none;
        border: none;
        color: var(--danger-color);
        font-size: 0.8rem;
        cursor: pointer;
      }
    }

    .frames-result-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: 16px;

      .frames-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .frames-title {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--primary-color);
          font-weight: 700;
          font-size: 0.9rem;
        }

        .header-actions {
          display: flex;
          gap: 6px;

          button {
            background: var(--surface-alt);
            border: 1px solid var(--border-color);
            color: var(--text-main);
            font-size: 0.7rem;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: var(--border-radius-sm);
            cursor: pointer;
          }
        }
      }

      .frames-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
        gap: 8px;
        max-height: 400px;
        overflow-y: auto;
        padding: 4px;

        .frame-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--border-radius-md);
          overflow: hidden;
          background: var(--surface-alt);
          border: 2px solid transparent;
          cursor: pointer;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          &.selected {
            border-color: var(--primary-color);
          }

          .frame-time {
            position: absolute;
            bottom: 4px;
            left: 4px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            font-size: 0.65rem;
            padding: 1px 4px;
            border-radius: 4px;
          }

          .select-badge {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.4);
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;

            &.checked {
              background: var(--primary-color);
              border-color: var(--primary-color);
            }

            mat-icon {
              font-size: 13px;
              height: 13px;
              width: 13px;
            }
          }

          .zoom-btn {
            position: absolute;
            bottom: 4px;
            right: 4px;
            background: rgba(0, 0, 0, 0.6);
            color: white;
            border-radius: 4px;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;

            mat-icon {
              font-size: 14px;
              height: 14px;
              width: 14px;
            }
          }
        }
      }

      .save-bar {
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        gap: 10px;

        .count-label {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        button {
          width: 100%;
        }
      }
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: 2500;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;

      .modal-box {
        position: relative;
        max-width: 90vw;
        max-height: 80vh;

        img {
          max-width: 100%;
          max-height: 70vh;
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
          width: 30px;
          height: 30px;
          cursor: pointer;
        }

        .modal-footer {
          margin-top: 10px;
          color: white;
          font-size: 0.85rem;
          text-align: center;
        }
      }
    }
  `]
})
export class FrameSnapComponent {
  selectedInterval = signal<number>(1);
  isCustomInterval = signal<boolean>(false);
  customIntervalValue = 0.5;
  selectedFormat = signal<'jpg' | 'png'>('jpg');
  pickedFile: File | null = null;
  previewFrame = signal<FrameSnapItem | null>(null);

  constructor(
    public framesnapService: FrameSnapService,
    public storageService: StorageService
  ) {}

  onVideoPicked(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.pickedFile = input.files[0];
      // Load video metadata
      const video = document.createElement('video');
      const url = URL.createObjectURL(this.pickedFile);
      video.src = url;
      video.onloadedmetadata = () => {
        this.framesnapService.currentVideoMeta.set({
          name: this.pickedFile!.name,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: this.pickedFile!.size,
          url
        });
      };
    }
  }

  resetVideo() {
    this.pickedFile = null;
    this.framesnapService.currentVideoMeta.set(null);
    this.framesnapService.extractedFrames.set([]);
  }

  setInterval(seconds: number) {
    this.isCustomInterval.set(false);
    this.selectedInterval.set(seconds);
  }

  setCustomIntervalMode() {
    this.isCustomInterval.set(true);
  }

  startExtraction() {
    if (!this.pickedFile) return;
    const interval = this.isCustomInterval() ? (this.customIntervalValue || 1) : this.selectedInterval();
    this.framesnapService.extractFrames(this.pickedFile, interval, this.selectedFormat());
  }

  selectAll() {
    this.framesnapService.extractedFrames.update(list => list.map(f => ({ ...f, selected: true })));
  }

  deselectAll() {
    this.framesnapService.extractedFrames.update(list => list.map(f => ({ ...f, selected: false })));
  }

  toggleSelect(frame: FrameSnapItem) {
    this.framesnapService.extractedFrames.update(list =>
      list.map(f => f.id === frame.id ? { ...f, selected: !f.selected } : f)
    );
  }

  selectedCount(): number {
    return this.framesnapService.extractedFrames().filter(f => f.selected).length;
  }

  openPreview(frame: FrameSnapItem, event: MouseEvent) {
    event.stopPropagation();
    this.previewFrame.set(frame);
  }

  closePreview() {
    this.previewFrame.set(null);
  }

  async saveSelected() {
    await this.framesnapService.saveSelectedFrames(this.selectedFormat());
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}.${ms}`;
  }
}

