import {Component, inject} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ScoreboardComponent} from "./scoreboard/scoreboard.component";
import {TelegramService} from "./services/telegram.service";
import {VideoComponent} from "./video/video.component";
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [ScoreboardComponent, RouterOutlet, VideoComponent, NgIf]
})
export class AppComponent {
  telegram = inject(TelegramService);
  title = 'scoreBoard';
  activeComponent: 'score' | 'video' = 'score'; // Устанавливаем начальный компонент

  constructor() {
    this.telegram.ready();
  }
}
