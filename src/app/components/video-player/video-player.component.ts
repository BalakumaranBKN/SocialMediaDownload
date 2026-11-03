import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="video-player-overlay fade-in" [class.fullscreen]="isFullscreen()">
      <div class="player-container">
        <!-- Top Toolbar -->
        <div class="player-topbar">
          <button class="icon-btn" (click)="closePlayer()">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="video-info-header">
            <h4>{{ title }}</h4>
            <span *ngIf="formattedSize">{{ formattedSize }}</span>
          </div>
          <div class="top-actions">
            <button class="icon-btn" (click)="shareVideo()" title="Share">
              <mat-icon>share</mat-icon>
            </button>
          </div>
        </div>

        <!-- Video Canvas/Element Area -->
        <div class="video-viewport" (click)="toggleControls()">
          <video 
            #videoRef
            [src]="videoSrc"
            playsinline
            (timeupdate)="onTimeUpdate()"
            (loadedmetadata)="onMetadataLoaded()"
            (ended)="onEnded()"
            class="main-video">
          </video>

          <!-- Big Center Play Button Overlay -->
          <div class="center-play-overlay" *ngIf="!isPlaying() && showControls()" (click)="togglePlay(); $event.stopPropagation()">
            <mat-icon class="big-icon">play_arrow</mat-icon>
          </div>
        </div>

        <!-- Floating Controls Panel -->
        <div class="controls-overlay" [class.visible]="showControls()">
          <!-- Seek bar -->
          <div class="timeline-container">
            <span class="time-text">{{ formatTime(currentTime()) }}</span>
            <input 
              type="range" 
              min="0" 
              [max]="duration() || 100" 
              [value]="currentTime()" 
              (input)="onSeek($event)" 
              class="seek-bar" />
            <span class="time-text">{{ formatTime(duration()) }}</span>
          </div>

          <!-- Main Controls Row -->
          <div class="controls-row">
            <!-- Left: Play/Pause, Rewind, Fast Forward -->
            <div class="ctrl-group left">
              <button class="icon-btn" (click)="seekRelative(-10)" title="Rewind 10s">
                <mat-icon>replay_10</mat-icon>
              </button>
              <button class="icon-btn play-btn" (click)="togglePlay()">
                <mat-icon>{{ isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
              </button>
              <button class="icon-btn" (click)="seekRelative(10)" title="Forward 10s">
                <mat-icon>forward_10</mat-icon>
              </button>
            </div>

            <!-- Center: Playback Speed Dropdown -->
            <div class="ctrl-group center">
              <button class="speed-btn" (click)="cycleSpeed()">
                {{ playbackSpeed() }}x
              </button>
            </div>

            <!-- Right: Volume, Fullscreen -->
            <div class="ctrl-group right">
              <button class="icon-btn" (click)="toggleMute()">
                <mat-icon>{{ isMuted() ? 'volume_off' : 'volume_up' }}</mat-icon>
              </button>
              <button class="icon-btn" (click)="toggleFullscreen()">
                <mat-icon>{{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .video-player-overlay {
      position: fixed;
      inset: 0;
      background: #000;
      z-index: 3000;
      display: flex;
      flex-direction: column;

      &.fullscreen {
        z-index: 9999;
      }
    }

    .player-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .player-topbar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent);
      z-index: 10;
      color: white;

      .video-info-header {
        flex: 1;
        overflow: hidden;

        h4 {
          font-size: 0.95rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        span {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
        }
      }
    }

    .video-viewport {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;

      .main-video {
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .center-play-overlay {
        position: absolute;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: rgba(99, 102, 241, 0.85);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        backdrop-filter: blur(8px);

        .big-icon {
          font-size: 42px;
          height: 42px;
          width: 42px;
        }
      }
    }

    .controls-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px 20px 24px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.4) 70%, transparent 100%);
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 12px;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;

      &.visible {
        opacity: 1;
        pointer-events: auto;
      }

      .timeline-container {
        display: flex;
        align-items: center;
        gap: 12px;

        .time-text {
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          min-width: 45px;
        }

        .seek-bar {
          flex: 1;
          accent-color: var(--primary-color);
          height: 4px;
          cursor: pointer;
        }
      }

      .controls-row {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .ctrl-group {
          display: flex;
          align-items: center;
          gap: 12px;

          &.center {
            .speed-btn {
              background: rgba(255, 255, 255, 0.15);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: white;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 0.8rem;
              font-weight: 700;
              cursor: pointer;
            }
          }
        }
      }
    }

    .icon-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      transition: background 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      &.play-btn {
        background: var(--primary-color);
        width: 44px;
        height: 44px;
      }
    }
  `]
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @Input() videoSrc = '';
  @Input() title = 'Video Player';
  @Input() filePath = '';
  @Input() formattedSize = '';
  @Output() close = new EventEmitter<void>();

  @ViewChild('videoRef') videoRef!: ElementRef<HTMLVideoElement>;

  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  isMuted = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);
  playbackSpeed = signal<number>(1);
  showControls = signal<boolean>(true);

  private controlsTimer: any;
  private readonly speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  constructor(private storageService: StorageService) {}

  ngOnInit() {
    this.resetControlsTimer();
  }

  ngOnDestroy() {
    clearTimeout(this.controlsTimer);
  }

  togglePlay() {
    const video = this.videoRef.nativeElement;
    if (video.paused) {
      video.play();
      this.isPlaying.set(true);
    } else {
      video.pause();
      this.isPlaying.set(false);
    }
    this.resetControlsTimer();
  }

  onTimeUpdate() {
    const video = this.videoRef.nativeElement;
    this.currentTime.set(video.currentTime);
  }

  onMetadataLoaded() {
    const video = this.videoRef.nativeElement;
    this.duration.set(video.duration);
    this.togglePlay();
  }

  onEnded() {
    this.isPlaying.set(false);
    this.showControls.set(true);
  }

  onSeek(event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value);
    const video = this.videoRef.nativeElement;
    video.currentTime = val;
    this.currentTime.set(val);
    this.resetControlsTimer();
  }

  seekRelative(deltaSec: number) {
    const video = this.videoRef.nativeElement;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + deltaSec));
    this.currentTime.set(video.currentTime);
    this.resetControlsTimer();
  }

  toggleMute() {
    const video = this.videoRef.nativeElement;
    video.muted = !video.muted;
    this.isMuted.set(video.muted);
    this.resetControlsTimer();
  }

  cycleSpeed() {
    const current = this.playbackSpeed();
    const nextIdx = (this.speeds.indexOf(current) + 1) % this.speeds.length;
    const newSpeed = this.speeds[nextIdx];
    this.playbackSpeed.set(newSpeed);
    this.videoRef.nativeElement.playbackRate = newSpeed;
    this.resetControlsTimer();
  }

  toggleFullscreen() {
    this.isFullscreen.set(!this.isFullscreen());
    this.resetControlsTimer();
  }

  toggleControls() {
    this.showControls.set(!this.showControls());
    if (this.showControls()) {
      this.resetControlsTimer();
    }
  }

  private resetControlsTimer() {
    clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => {
      if (this.isPlaying()) {
        this.showControls.set(false);
      }
    }, 3500);
  }

  shareVideo() {
    if (this.filePath) {
      this.storageService.shareFile(this.filePath, this.title);
    }
  }

  closePlayer() {
    this.close.emit();
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

