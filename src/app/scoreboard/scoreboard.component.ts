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
  isControlBall: boolean = false; //Это контрольный мяч
  matchOver:boolean = false; // Матч завершен
  rotateScore: boolean = false;

  private audio: HTMLAudioElement;
  whistlePlay: boolean = false;

  private clickTimeout: any;
  private delay: number = 500; // Задержка для определения двойного клика
  private whistleFirstClick: boolean = false;



  constructor() {
    this.audio = new Audio();
    // Добавляем обработчик события `ended`
    this.audio.addEventListener('ended', () => {
      if(this.whistlePlay) {
        this.whistlePlay = false;
        if(this.score1 == 0 && this.score2 == 0 ){
          this.playScore(this.playScore1);
        }
        return;
      }

      if(this.matchOver) {
        return;
      }
      if(this.isControlBall){
        this.isControlBall = false;
        return;
      }

      if(this.currentSound == 1){
        this.currentSound = 0;
        this.isControlBall = this.isControlBallScore()
        if (this.isControlBall) {
          this.audio.src = `audio/controlball.wav`;
          this.audio.play();
          return;
        }

        this.matchOver = this.isMatchOver();
        if(this.isMatchOver()) {
          this.audio.src = `audio/win.wav`;
          this.audio.play();
          return;
        }
        return;
      }

      if(this.currentSound == 0){
        this.playScore(this.playScore2);
        this.currentSound = 1;
        return;
      }

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

    this.playScore1 = 0;
    this.playScore2 = 0;

    this.currentSound = 0;
    this.whistlePlay = false;
    this.matchOver = false;

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
      this.playScore1 = this.score2;
      this.playScore2 = this.score1;
    }
    this.playScore(this.playScore1);

  }

  private playScore(number: number) {
    this.audio.src = `audio/${number}.wav`;
    this.audio.play();
  }

  private isControlBallScore() {
    const maxScore = 25;

    // Check if one of the teams is at 24 points and the other has less than 24
    if ((this.score1 === 24 && this.score2 < 24) || (this.score2 === 24 && this.score1 < 24)) {
      return true;
    }

    // Check if one of the teams can win with the next point in a deuce situation
    if ((this.score1 >= maxScore - 1 || this.score2 >= maxScore - 1)
      && Math.abs(this.score1 - this.score2) === 1) {
      return true;
    }

    return false;
  }

  private isMatchOver(): boolean {
    const winningScore = 25;
    const minDifference = 2;

    // Check if one of the teams has reached the winning score and has at least a 2-point lead
    if ((this.score1 >= winningScore || this.score2 >= winningScore)
      && Math.abs(this.score1 - this.score2) >= minDifference) {
      return true;
    }

    return false;
  }

  whistle() {
    if(!this.whistleFirstClick) {
      this.whistleFirstClick = true;
      this.clickTimeout = setTimeout(() => {
        this.whistlePlay = true;
        this.whistleFirstClick = false;
        this.audio.src = `audio/whistle.wav`;
        this.audio.play();

      }, this.delay);
    } else {

      clearTimeout(this.clickTimeout);
      this.whistleFirstClick = false;
      alert('double');
    }
  }

  roundClick(event: MouseEvent) {
    event.stopPropagation(); // Останавливаем всплытие события
    this.rotateScore = !this.rotateScore;
  }

}
