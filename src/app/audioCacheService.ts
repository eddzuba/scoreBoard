import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioCacheService {
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {

    const audioUrls = [
      'audio/whistle.ogg',
      'audio/win.ogg',
      'audio/controlball.ogg'
    ];

    // Добавляем файлы от 0.ogg до 31.ogg
    for (let i = 0; i <= 31; i++) {
      audioUrls.push(`audio/${i}.ogg`);
    }
    this.preloadAudioFiles(audioUrls);
  }

  preloadAudioFiles(urls: string[]): void {
    urls.forEach((url) => {
      if (!this.audioCache.has(url)) {
        const audio = new Audio(url);
        audio.load(); // Загружаем файл
        this.audioCache.set(url, audio);
      }
    });
  }

  getAudio(url: string): HTMLAudioElement | undefined {
    return this.audioCache.get(url);
  }
  playAudio(url: string): void {
    const audio = this.audioCache.get(url);
    if (audio) {
      audio.play();
    } else {
      console.error(`Audio file not found in cache: ${url}`);
    }
  }
}
