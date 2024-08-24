import { Component } from '@angular/core';
import { CdkDragDrop, DragDropModule} from "@angular/cdk/drag-drop";
import {CommonModule} from "@angular/common";

@Component({
  selector: 'scoreboard',
  templateUrl: './scoreboard.component.html',
  standalone: true,
  styleUrls: ['./scoreboard.component.css'],
  imports: [CommonModule, DragDropModule ]
})
export class ScoreboardComponent  {
  score1 = 1;
  score2 = 0;

  constructor() {

  }

  incrementScore1() {
    this.score1++;
  }

  incrementScore2() {
    this.score2++;
  }

  resetScores() {
    this.score1 = 0;
    this.score2 = 0;
  }

  dropped(event: CdkDragDrop<string[]>): void {
    if(event?.currentIndex === 0) {
      this.incrementScore2();
    } else {
      this.incrementScore1();
    }

  }

}
