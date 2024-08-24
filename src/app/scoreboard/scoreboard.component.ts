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
  score1 = 0;
  score2 = 0;
  currentSound: number = 0; // номер счета в произношении счета

  playScore1 = 0; // число которое нужно проиграть первым
  playScore2 = 0; // число которое нужно проиграть вторым

  private audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio();
    // Добавляем обработчик события `ended`
    this.audio.addEventListener('ended', () => {
      console.log('Audio playback finished.');
      if( this.currentSound == 0) {
        this.currentSound = 1;
        this.playScore(this.playScore2);
      } else {
        this.currentSound = 0;
      }
      // Здесь можно выполнить дополнительные действия после завершения аудио
    });
  }

  incrementScore1() {
    this.score1++;
    this.playSound(1);
  }

  incrementScore2() {
    this.score2++;
    this.playSound(2);
  }

  resetScores() {
    this.score1 = 0;
    this.score2 = 0;
  }

  dropped(event: CdkDragDrop<string[]>): void {

    if(event?.distance.y > 0) {
      this.incrementScore2();
    } else {
      this.incrementScore1();
    }

  }

  private playSound(number: number) {
    if(number == 1) {
      this.playScore1 = this.score1;
      this.playScore2 = this.score2;
    } else {
      this.playScore1 = this.score1;
      this.playScore2 = this.score2;
    }
    this.playScore(this.playScore1);

  }

  private playScore(number: number) {
    this.audio.src = `audio/${number}.wav`;
    this.audio.play();
  }
}
