import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HomeComponent } from './components/home/home.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { FrameSnapComponent } from './components/framesnap/framesnap.component';
import { SettingsComponent } from './components/settings/settings.component';
import { ThemeService } from './services/theme.service';
import { StorageService } from './services/storage.service';
import { DownloadManagerService } from './services/download-manager.service';

export type ActiveTab = 'Home' | 'Images' | 'Videos' | 'GIFs' | 'History' | 'FrameSnap' | 'Settings';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    HomeComponent,
    GalleryComponent,
    FrameSnapComponent,
    SettingsComponent
  ],
  template: `
    <div class="app-container">
      <!-- Top Navigation Bar -->
      <header class="top-nav">
        <div class="brand" (click)="setTab('Home')">
          <div class="brand-icon">
            <mat-icon>file_download</mat-icon>
          </div>
          <span class="brand-name">ALL SOCIAL DOWNLOADER</span>
        </div>

        <div class="nav-actions">
          <button 
            class="action-icon-btn" 
            [class.active]="activeTab() === 'FrameSnap'"
            (click)="setTab('FrameSnap')" 
            title="FrameSnap">
            <mat-icon>camera</mat-icon>
          </button>
          <button 
            class="action-icon-btn" 
            [class.active]="activeTab() === 'Settings'"
            (click)="setTab('Settings')" 
            title="Settings">
            <mat-icon>settings</mat-icon>
          </button>
          <button 
            class="action-icon-btn theme-toggle" 
            (click)="themeService.toggleTheme()" 
            title="Toggle Theme">
            <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>
        </div>
      </header>

      <!-- Main Content Switcher -->
      <main class="main-content">
        <!-- 1. Home Tab -->
        <app-home *ngIf="activeTab() === 'Home'"></app-home>

        <!-- 2. Images Tab -->
        <app-gallery *ngIf="activeTab() === 'Images'" activeTab="Images"></app-gallery>

        <!-- 3. Videos Tab -->
        <app-gallery *ngIf="activeTab() === 'Videos'" activeTab="Videos"></app-gallery>

        <!-- 4. GIFs Tab -->
        <app-gallery *ngIf="activeTab() === 'GIFs'" activeTab="GIFs"></app-gallery>

        <!-- 5. History Tab -->
        <app-gallery *ngIf="activeTab() === 'History'" activeTab="History"></app-gallery>

        <!-- 6. FrameSnap (Offline Video to Image Extractor) -->
        <app-framesnap *ngIf="activeTab() === 'FrameSnap'"></app-framesnap>

        <!-- 7. Settings Screen -->
        <app-settings *ngIf="activeTab() === 'Settings'"></app-settings>
      </main>

      <!-- Bottom 5-Tab Navigation Bar -->
      <nav class="bottom-nav">
        <div 
          class="nav-item" 
          [class.active]="activeTab() === 'Home'" 
          (click)="setTab('Home')">
          <mat-icon>home</mat-icon>
          <span>Home</span>
        </div>

        <div 
          class="nav-item" 
          [class.active]="activeTab() === 'Images'" 
          (click)="setTab('Images')">
          <mat-icon>photo_library</mat-icon>
          <span>Images</span>
        </div>

        <div 
          class="nav-item" 
          [class.active]="activeTab() === 'Videos'" 
          (click)="setTab('Videos')">
          <mat-icon>videocam</mat-icon>
          <span>Videos</span>
        </div>

        <div 
          class="nav-item" 
          [class.active]="activeTab() === 'GIFs'" 
          (click)="setTab('GIFs')">
          <mat-icon>gif</mat-icon>
          <span>GIFs</span>
        </div>

        <div 
          class="nav-item" 
          [class.active]="activeTab() === 'History'" 
          (click)="setTab('History')">
          <mat-icon>history</mat-icon>
          <span>History</span>
        </div>
      </nav>
    </div>
  `,
  styles: [`
    .main-content {
      flex: 1;
      width: 100%;
    }

    .action-icon-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: var(--surface-alt);
        color: var(--text-main);
      }

      &.active {
        color: var(--primary-color);
        background: rgba(99, 102, 241, 0.15);
      }

      mat-icon {
        font-size: 20px;
        height: 20px;
        width: 20px;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  activeTab = signal<ActiveTab>('Home');

  constructor(
    public themeService: ThemeService,
    private storageService: StorageService,
    public downloadManager: DownloadManagerService
  ) {}

  ngOnInit() {
    this.storageService.checkAndInitFolders();
  }

  setTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

