import { Injectable } from '@angular/core';
import { AudioCacheService } from './audioCache.service';

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  private playlist: string[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;

  constructor(private audioCacheService: AudioCacheService) {}

  addToPlaylist(url: string): void {
    this.playlist.push(url);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private playNext(): void {
    if (this.currentIndex < this.playlist.length) {
      const currentUrl = this.playlist[this.currentIndex];
      this.isPlaying = true;

      const audio = this.audioCacheService.getAudio(currentUrl);
      if (audio) {
        audio.currentTime = 0; // Перематываем на начало
        audio.play();
        audio.onended = () => {
          this.currentIndex++;
          this.playNext();
        };
      } else {
        console.error(`Audio file not found in cache: ${currentUrl}`);
        this.currentIndex++;
        this.playNext();
      }
    } else {
      this.reset();
    }
  }

  private reset(): void {
    this.isPlaying = false;
    this.currentIndex = 0;
    this.playlist = [];
  }

  stop(): void {
    if (this.isPlaying && this.currentIndex < this.playlist.length) {
      const currentUrl = this.playlist[this.currentIndex];
      const audio = this.audioCacheService.getAudio(currentUrl);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
    this.reset();
  }

  cleanQuery() {
    this.stop();
  }
}
