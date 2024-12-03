import {Component, inject} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ScoreboardComponent} from "./scoreboard/scoreboard.component";
import {TelegramService} from "./services/telegram.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [ScoreboardComponent, RouterOutlet]
})
export class AppComponent {
  telegram = inject(TelegramService);
  title = 'scoreBoard';

  constructor() {
    this.telegram.ready();
  }
}
