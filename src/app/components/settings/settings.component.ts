import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ThemeService } from '../../services/theme.service';
import { StorageService } from '../../services/storage.service';
import { MediaService } from '../../services/media.service';
import { Preferences } from '@capacitor/preferences';
import { Toast } from '@capacitor/toast';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="settings-container fade-in">
      <div class="settings-header">
        <h2>Settings & Preferences</h2>
        <p>Configure theme, download paths, and application options.</p>
      </div>

      <!-- Appearance -->
      <div class="settings-section">
        <div class="section-title">
          <mat-icon>palette</mat-icon>
          <span>Appearance</span>
        </div>
        <div class="setting-row">
          <div class="row-info">
            <span class="row-title">Dark Theme</span>
            <span class="row-desc">High contrast dark mode designed for OLED screens</span>
          </div>
          <mat-slide-toggle 
            [checked]="themeService.isDarkMode()" 
            (change)="themeService.toggleTheme()">
          </mat-slide-toggle>
        </div>
      </div>

      <!-- Storage & Folders -->
      <div class="settings-section">
        <div class="section-title">
          <mat-icon>folder</mat-icon>
          <span>Storage & Folders</span>
        </div>
        <div class="setting-row">
          <div class="row-info">
            <span class="row-title">Default Download Location</span>
            <span class="row-desc">Internal Storage/All Social Downloader/</span>
          </div>
          <button class="btn-text" (click)="recheckFolders()">Verify Folders</button>
        </div>

        <div class="setting-row">
          <div class="row-info">
            <span class="row-title">Auto-Save To Gallery</span>
            <span class="row-desc">Automatically make downloads visible in Android MediaStore</span>
          </div>
          <mat-slide-toggle [(ngModel)]="autoSave" (change)="saveSetting('auto_save', autoSave)"></mat-slide-toggle>
        </div>

        <div class="setting-row">
          <div class="row-info">
            <span class="row-title">Clear Temporary Cache</span>
            <span class="row-desc">Safe cleanup of temp network files (never deletes downloads)</span>
          </div>
          <button class="btn-secondary small" (click)="clearCache()">Clear Cache</button>
        </div>
      </div>

      <!-- Video Download Options -->
      <div class="settings-section">
        <div class="section-title">
          <mat-icon>tune</mat-icon>
          <span>Default Video Mode</span>
        </div>
        <div class="mode-options">
          <button 
            *ngFor="let mode of ['Original Video', 'Muted Video', 'Original Music']"
            class="mode-chip"
            [class.active]="defaultVideoMode === mode"
            (click)="setVideoMode(mode)">
            {{ mode }}
          </button>
        </div>
      </div>

      <!-- Backend Connection -->
      <div class="settings-section">
        <div class="section-title">
          <mat-icon>dns</mat-icon>
          <span>FastAPI Backend URL</span>
        </div>
        <div class="backend-input-row">
          <input 
            type="text" 
            [(ngModel)]="backendInput" 
            placeholder="http://localhost:8000" 
            class="url-input" />
          <button class="btn-primary small" (click)="updateBackendUrl()">Save</button>
        </div>
        <div class="backend-status">
          <span class="status-indicator" [class.healthy]="mediaService.backendHealthy()"></span>
          <span>{{ mediaService.backendHealthy() ? 'Backend connected & online' : 'Local / Offline Mode' }}</span>
        </div>
      </div>

      <!-- App Info -->
      <div class="settings-section">
        <div class="section-title">
          <mat-icon>info</mat-icon>
          <span>Application Information</span>
        </div>
        <div class="info-table">
          <div class="info-row">
            <span>App Name</span>
            <strong>ALL SOCIAL DOWNLOADER</strong>
          </div>
          <div class="info-row">
            <span>Version</span>
            <strong>1.0.0 (Release Build)</strong>
          </div>
          <div class="info-row">
            <span>Architecture</span>
            <strong>Database-Free (MediaStore Scoped Storage)</strong>
          </div>
          <div class="info-row">
            <span>FrameSnap Engine</span>
            <strong>Hardware-Accelerated Offline HTML5/Canvas</strong>
          </div>
        </div>
      </div>

      <!-- Privacy & Compliance -->
      <div class="settings-section">
        <div class="section-title">
          <mat-icon>security</mat-icon>
          <span>Privacy Policy & Compliance</span>
        </div>
        <p class="privacy-text">
          ALL SOCIAL DOWNLOADER respects content creator rights and platform terms. 
          The application does not bypass authentication, private account restrictions, 
          or DRM protections. Only publicly permitted media URLs are inspected. 
          No personal credentials, cookies, or user tracking data are ever collected, transmitted, or stored.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .settings-header {
      h2 {
        font-size: 1.3rem;
        font-weight: 800;
        color: var(--text-main);
      }
      p {
        font-size: 0.85rem;
        color: var(--text-muted);
        margin-top: 4px;
      }
    }

    .settings-section {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--primary-color);
        font-weight: 700;
        font-size: 0.95rem;

        mat-icon {
          font-size: 20px;
          height: 20px;
          width: 20px;
        }
      }

      .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;

        .row-info {
          display: flex;
          flex-direction: column;

          .row-title {
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--text-main);
          }

          .row-desc {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 2px;
          }
        }
      }

      .btn-text {
        background: none;
        border: none;
        color: var(--primary-color);
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
      }

      .small {
        padding: 6px 12px;
        font-size: 0.8rem;
      }

      .mode-options {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        .mode-chip {
          background: var(--surface-alt);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          padding: 8px 14px;
          border-radius: var(--border-radius-md);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;

          &.active {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
          }
        }
      }

      .backend-input-row {
        display: flex;
        gap: 8px;

        .url-input {
          flex: 1;
          padding: 8px 12px;
          border-radius: var(--border-radius-sm);
          border: 1px solid var(--border-color);
          background: var(--surface-alt);
          color: var(--text-main);
          font-size: 0.85rem;
        }
      }

      .backend-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.78rem;
        color: var(--text-muted);

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--warning-color);

          &.healthy {
            background: var(--success-color);
          }
        }
      }

      .info-table {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;

          span { color: var(--text-muted); }
          strong { color: var(--text-main); }
        }
      }

      .privacy-text {
        font-size: 0.78rem;
        line-height: 1.5;
        color: var(--text-muted);
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  autoSave = true;
  defaultVideoMode = 'Original Video';
  backendInput = '';

  constructor(
    public themeService: ThemeService,
    private storageService: StorageService,
    public mediaService: MediaService
  ) {}

  async ngOnInit() {
    this.backendInput = this.mediaService.getBackendUrl();
    const { value: autoSaveVal } = await Preferences.get({ key: 'asd_auto_save' });
    if (autoSaveVal !== null) this.autoSave = autoSaveVal === 'true';

    const { value: modeVal } = await Preferences.get({ key: 'asd_video_mode' });
    if (modeVal) this.defaultVideoMode = modeVal;
  }

  async saveSetting(key: string, val: boolean) {
    await Preferences.set({ key: `asd_${key}`, value: val ? 'true' : 'false' });
  }

  async setVideoMode(mode: string) {
    this.defaultVideoMode = mode;
    await Preferences.set({ key: 'asd_video_mode', value: mode });
  }

  async updateBackendUrl() {
    if (this.backendInput) {
      await this.mediaService.setBackendUrl(this.backendInput.trim());
      Toast.show({ text: 'Backend URL updated!' }).catch(() => {});
    }
  }

  async recheckFolders() {
    await this.storageService.checkAndInitFolders();
    Toast.show({ text: 'All Social Downloader folders verified!' }).catch(() => {});
  }

  async clearCache() {
    const cleared = await this.storageService.clearTempFiles();
    Toast.show({ text: `Cleared ${cleared} temporary files.` }).catch(() => {});
  }
}

