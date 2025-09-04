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

  enterFullscreen(): void {
    const elem = document.documentElement;

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }

    this.isFullscreen = true;
  }

  exitFullscreen(): void {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }

    this.isFullscreen = false;
  }
}
