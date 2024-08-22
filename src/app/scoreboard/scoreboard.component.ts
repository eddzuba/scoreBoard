import { Component, HostListener, OnDestroy } from '@angular/core';

@Component({
  selector: 'scoreboard',
  templateUrl: './scoreboard.component.html',
  standalone: true,
  styleUrls: ['./scoreboard.component.css']
})
export class ScoreboardComponent implements OnDestroy {
  score1 = 0;
  score2 = 0;

  constructor() {
    document.documentElement.requestFullscreen();
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

/*  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowUp') {
      this.incrementScore1();
    } else if (event.key === 'ArrowDown') {
      this.incrementScore2();
    } else if (event.key === 'r') {
      this.resetScores();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  handleMouseEvent(event: MouseEvent) {
    if (event.button === 0) { // Left mouse button
      this.incrementScore1();
    } else if (event.button === 2) { // Right mouse button
      this.incrementScore2();
    }
  }
*/

  @HostListener('window:copy', ['$event'])
  onPlay(event: Event): void {
    this.incrementScore2();
    // Добавьте логику для обработки события play здесь
  }

  @HostListener('window:cut', ['$event'])
  onPast(event: Event): void {
    this.incrementScore1();
    // Добавьте логику для обработки события play здесь
  }
  ngOnDestroy() {

  }
}
