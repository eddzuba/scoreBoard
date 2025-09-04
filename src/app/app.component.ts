import {Component, inject} from '@angular/core';
import {ScoreboardComponent} from "./scoreboard/scoreboard.component";
import {TelegramService} from "./services/telegram.service";
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [ScoreboardComponent, NgIf]
})
export class AppComponent {
  telegram = inject(TelegramService);
  title = 'scoreBoard';
  activeComponent: 'score' | 'video' = 'score'; // Устанавливаем начальный компонент
  isFullscreen = false;
  wakeLock: any = null;

  constructor() {
    this.telegram.ready();
  }

  toggleFullscreen(): void {
    if (!this.isFullscreen) {
      this.enterFullscreen();
    } else {
      this.exitFullscreen();
    }
  }

  async enterFullscreen(): Promise<void> {
    const elem = document.documentElement;

    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }

    this.isFullscreen = true;
    await this.requestWakeLock();
  }

  async exitFullscreen(): Promise<void> {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }

    this.isFullscreen = false;
    await this.releaseWakeLock();
  }

  async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          console.log('🔕 Wake Lock освобождён');
        });
        console.log('✅ Wake Lock активирован');
      }
    } catch (err) {
      console.error('Ошибка Wake Lock:', err);
    }
  }

  async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
      } catch (err) {
        console.error('Ошибка при освобождении Wake Lock:', err);
      }
    }
  }
}
