export type PlatformType =
  | 'Instagram'
  | 'Facebook'
  | 'Pinterest'
  | 'Twitter'
  | 'TikTok'
  | 'Direct Image'
  | 'Direct Video'
  | 'Direct GIF'
  | 'Other';

export type MediaType = 'image' | 'multi_image' | 'video' | 'gif';

export interface VideoQualityOption {
  resolution: string; // 'Original' | '1080p' | '720p' | '480p' | '360p'
  label: string;
  height?: number;
  width?: number;
  url: string;
  filesize?: number;
  has_audio?: boolean;
  format_id?: string;
}

export interface MediaImageItem {
  index: number;
  url: string;
  thumbnail: string;
  width?: number;
  height?: number;
  title?: string;
  selected?: boolean;
}

export interface MediaInspectResponse {
  success: boolean;
  platform: PlatformType;
  type: MediaType;
  title?: string;
  duration?: number;
  thumbnail?: string;
  count?: number;
  images?: MediaImageItem[];
  quality_options?: VideoQualityOption[];
  audio_url?: string;
  primary_download_url?: string;
  detected_platform?: PlatformType;
  error?: string;
  dimensions?: string;
  frame_count?: number;
  filesize?: number;
}

export interface DownloadItem {
  id: string;
  title: string;
  platform: PlatformType;
  type: MediaType;
  downloadUrl: string;
  qualityLabel?: string;
  progress: number;
  speed?: string;
  totalBytes?: number;
  receivedBytes?: number;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  savedLocation?: string;
  createdAt: number;
  error?: string;
}

export interface GalleryItem {
  id: string;
  filename: string;
  path: string;
  relativeFolder: string;
  platform: PlatformType;
  type: 'image' | 'video' | 'gif';
  sizeBytes: number;
  formattedSize: string;
  date: Date;
  dateFormatted: string;
  thumbnail?: string;
  dataUrl?: string;
  webPath?: string;
  selected?: boolean;
}

export interface FrameSnapItem {
  id: string;
  index: number;
  timeSec: number;
  dataUrl: string;
  blob: Blob;
  sizeBytes: number;
  dimensions: string;
  selected: boolean;
}

