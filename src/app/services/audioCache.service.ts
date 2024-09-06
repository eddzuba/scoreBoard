import { Injectable } from '@angular/core';
import { CONTROLBALL, PAUSE, WHISTLE, WIN } from "../scoreboard/constants";

@Injectable({
  providedIn: 'root'
})
export class AudioCacheService {
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {

    const audioUrls = [
      WHISTLE,
      WIN,
      PAUSE,
      CONTROLBALL
    ];

    // Добавляем файлы от 0.ogg до 31.ogg
    for (let i = 0; i <= 31; i++) {
      audioUrls.push(`audio/${i}.ogg`);
    }
    this.preloadAudioFiles(audioUrls);
  }

  preloadAudioFiles(urls: string[]) {
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

}
