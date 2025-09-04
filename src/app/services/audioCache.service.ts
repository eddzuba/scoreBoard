import { Injectable } from '@angular/core';
import { CONTROLBALL, PAUSE, WHISTLE, WIN , CAMERA} from "../scoreboard/constants";

@Injectable({
  providedIn: 'root'
})
export class AudioCacheService {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private curVoicePath = 'default'

  constructor() {
    this.loadFiles('default');
  }

  public loadFiles(path: string) {
    this.curVoicePath = path;
    const audioUrls = [
      'audio/' + this.curVoicePath + '/' + WHISTLE,
      'audio/' + this.curVoicePath + '/' + WIN,
      'audio/' + this.curVoicePath + '/' + PAUSE,
      'audio/' + this.curVoicePath + '/' + CONTROLBALL,
      'audio/' + this.curVoicePath + '/' + CAMERA,

    ];

    // Добавляем файлы от 0.ogg до 31.ogg
    for (let i = 0; i <= 31; i++) {
      audioUrls.push('audio/' + this.curVoicePath + `/${i}.ogg`);
    }
    this.preloadAudioFiles(audioUrls);
  }

  preloadAudioFiles(urls: string[]) {
    urls.forEach((url) => {
      if (!this.audioCache.has(url)) {
        const audio = new Audio(url);
        audio.load(); // Загружаем файл
        audio.preload = "auto";
        this.audioCache.set(url, audio);
      }
    });
  }

  getAudio(url: string): HTMLAudioElement | undefined {
    return this.audioCache.get('audio/' + this.curVoicePath + '/' + url);
  }

}
