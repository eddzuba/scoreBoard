import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ScoreboardComponent} from "./scoreboard/scoreboard.component";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [ScoreboardComponent]
})
export class AppComponent {
  title = 'scoreBoard';
}
