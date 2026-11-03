import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { MediaInspectResponse, PlatformType } from '../models/media.model';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  // Default to localhost, configurable in app settings
  private backendUrl = 'http://localhost:8000';
  backendHealthy = signal<boolean>(false);

  constructor(private http: HttpClient) {
    this.loadBackendUrl();
  }

  async loadBackendUrl() {
    try {
      const { value } = await Preferences.get({ key: 'asd_backend_url' });
      if (value) {
        this.backendUrl = value;
      }
      this.checkHealth().subscribe(healthy => this.backendHealthy.set(healthy));
    } catch {
      this.checkHealth().subscribe(healthy => this.backendHealthy.set(healthy));
    }
  }

  async setBackendUrl(url: string) {
    this.backendUrl = url;
    await Preferences.set({ key: 'asd_backend_url', value: url });
    this.checkHealth().subscribe(healthy => this.backendHealthy.set(healthy));
  }

  getBackendUrl(): string {
    return this.backendUrl;
  }

  checkHealth(): Observable<boolean> {
    return this.http.get<any>(`${this.backendUrl}/api/health`).pipe(
      map(res => res?.status === 'healthy'),
      catchError(() => of(false))
    );
  }

  detectPlatformLocally(url: string): PlatformType {
    if (!url) return 'Other';
    const lower = url.toLowerCase();
    if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'Instagram';
    if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com')) return 'Facebook';
    if (lower.includes('pinterest.com') || lower.includes('pin.it')) return 'Pinterest';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'Twitter';
    if (lower.includes('tiktok.com')) return 'TikTok';
    if (lower.match(/\.(jpg|jpeg|png|webp|bmp)($|\?)/i)) return 'Direct Image';
    if (lower.match(/\.(mp4|mov|mkv|webm)($|\?)/i)) return 'Direct Video';
    if (lower.match(/\.gif($|\?)/i)) return 'Direct GIF';
    return 'Other';
  }

  inspectMedia(url: string): Observable<MediaInspectResponse> {
    return this.http.post<MediaInspectResponse>(`${this.backendUrl}/api/media/inspect`, { url }).pipe(
      catchError(err => {
        const errorMsg = err?.error?.detail || err?.message || 'Media retrieval error. Check URL or network.';
        // Fallback local detection
        const detected = this.detectPlatformLocally(url);
        return of({
          success: false,
          platform: detected,
          type: 'image',
          error: errorMsg,
          detected_platform: detected
        } as MediaInspectResponse);
      })
    );
  }

  downloadMediaBlob(url: string, filename?: string): Observable<Blob> {
    return this.http.post(`${this.backendUrl}/api/media/download`, { url, filename }, {
      responseType: 'blob'
    });
  }

  muteVideoBlob(url: string): Observable<Blob> {
    return this.http.post(`${this.backendUrl}/api/media/mute`, { url }, {
      responseType: 'blob'
    });
  }
}

