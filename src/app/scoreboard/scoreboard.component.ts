import {Component, OnInit} from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { GameState } from '../gameState/gameStates';
import {CONTROLBALL, PAUSE, WHISTLE, WIN} from "./constants";
import { TelegramService } from '../services/telegram.service';
import { PlaylistService } from '../services/playlist.service';
import { FormsModule } from "@angular/forms";
import {AudioCacheService} from "../services/audioCache.service";
import { SupabaseService } from '../services/supabase.service';

declare const Telegram: any;

@Component({
  selector: 'scoreboard',
  templateUrl: './scoreboard.component.html',
  standalone: true,
  styleUrls: ['./scoreboard.component.css'],
  imports: [CommonModule, DragDropModule, FormsModule ]
})
export class ScoreboardComponent implements OnInit {

  voices = [
    { name: 'По умолчанию', path: 'default' },
    { name: 'Борис', path: 'boris' },
    { name: 'Юля', path: 'julia' },
    { name: 'Наталья', path: 'natalia' },
    { name: 'Сергей', path: 'sergey' },
    { name: 'SpongeBob', path: 'spongebob' },
    { name: 'English', path: 'english' },
  ];

  selectedVoice: string = this.voices[0].path; // Устанавливаем значение по умолчанию

  user: any;
  chatId: number | null = null;

  score1 = 0;
  score2 = 0;
  currentSound: number = 0; // номер счета в произношении счета

  curState: GameState = new GameState();

  playScore1 = 0; // число которое нужно проиграть первым
  playScore2 = 0; // число которое нужно проиграть вторым
  isControlBall: boolean = false; //Это контрольный мяч
  matchOver:boolean = false; // Матч завершен
  rotateScore: boolean = false;
  setLeft: boolean = false; // подача слева

  whistlePlay: boolean = false;

  // Daily totals tracking
  dailyLeftWins: number = 0;
  dailyRightWins: number = 0;

  private clickTimeout: any;
  private delay: number = 500; // Задержка для определения двойного клика
  private whistleFirstClick: boolean = false;

  constructor(
    private playlistService: PlaylistService,
    private telegram: TelegramService,
    private audioCacheService: AudioCacheService,
    private supabaseService: SupabaseService) {

    this.curState.reset();
  }

  ngOnInit(): void {
    this.telegram.expand();
    this.loadDailyTotals();
  }

  /**
   * Load daily totals from Supabase on component init
   */
  private async loadDailyTotals(): Promise<void> {
    try {
      const dailyTotals = await this.supabaseService.getDailyTotals();
      if (dailyTotals) {
        this.dailyLeftWins = dailyTotals.left_wins || 0;
        this.dailyRightWins = dailyTotals.right_wins || 0;
      } else {
        // No data for today yet
        this.dailyLeftWins = 0;
        this.dailyRightWins = 0;
      }
    } catch (error) {
      // Error loading - start with 0:0
      console.warn('[Component] Failed to load daily totals:', error);
      this.dailyLeftWins = 0;
      this.dailyRightWins = 0;
    }
  }

    incrementScore1() {
    this.score1++;
    this.setLeft = this.rotateScore;
    this.playSound(1);
    this.curState.push( { score1: this.score1, score2: this.score2, serverSide: 1 } );
    this.syncCurrentScore();
  }

  incrementScore2() {
    this.score2++;

    this.setLeft = !this.rotateScore;
    this.playSound(2);
    this.curState.push( { score1: this.score1, score2: this.score2, serverSide: 2 } );
    this.syncCurrentScore();
  }

  onVoiceChange(event: Event): void {
    // console.log('Выбранный путь голоса:', this.selectedVoice);
    this.audioCacheService.loadFiles(this.selectedVoice);
    // Здесь можно обработать изменение пути, например, отправить его в сервис.
  }
  onComboBoxClick(event: Event): void {
    event.stopPropagation(); // Останавливаем всплытие события
  }

  resetScores() {
    if(this.score2 != 0 || this.score1 != 0) {
      this.score1 = 0;
      this.score2 = 0;

      this.playScore1 = 0;
      this.playScore2 = 0;

      this.currentSound = 0;
      this.whistlePlay = false;
      this.matchOver = false;

      this.curState.reset();
      this.rotateScore = !this.rotateScore;
    }

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

    this.playlistService.cleanQuery();
    this.playlistService.addToPlaylist(PAUSE);
    this.playScore(this.playScore1);
    this.playScore(this.playScore2);

    this.isControlBall = this.isControlBallScore()
    if (this.isControlBall) {
      this.playlistService.addToPlaylist(CONTROLBALL);
    }

    this.matchOver = this.isMatchOver();
    if(this.isMatchOver()) {
      this.playlistService.addToPlaylist(WIN);
      // Sync final score when match is over
      this.syncMatchComplete();
      // Запустить функцию reset через 30 секунд
      setTimeout(() => {
        // this.telegram.saveScore();
        this.resetScores();
      }, 20000);
    }
  }

  private playScore(number: number) {
    this.playlistService.addToPlaylist(`${number}.ogg`);
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
  telegramTest(): void {
      this.sendData();
  }

  sendData() {
    // отправляем данные в телеграм
    this.telegram.sendData({ feedback: 'my-massage' });
  }

  whistle() {
    this.telegramTest();
    if(!this.whistleFirstClick) {
      this.whistleFirstClick = true;
      this.clickTimeout = setTimeout(() => {
          this.whistlePlay = true;
          this.whistleFirstClick = false;
          // пауза для установления соединения с колонкой
          // иногда уходит в энергосберегающий режим
          this.playlistService.addToPlaylist(PAUSE);
          this.playlistService.addToPlaylist(WHISTLE);
          if(this.score1 == 0 && this.score2 == 0) {
            this.playScore(0);
            this.playScore(0);
          }

      }, this.delay);
    } else {

      clearTimeout(this.clickTimeout);
      this.whistleFirstClick = false;
      this.rollbackGameScore();
    }
  }

  roundClick(event: MouseEvent) {
    event.stopPropagation(); // Останавливаем всплытие события
    this.rotateScore = !this.rotateScore;
  }

  private rollbackGameScore() {
    let prevState = this.curState.pop();
    if( prevState != undefined) {
        prevState = this.curState.pop();
        if( prevState !== undefined) {
          this.score1 = prevState.score1;
          this.score2 = prevState.score2;
          this.setLeft = prevState.serverSide == 1;
          if(!this.rotateScore) {
            this.setLeft = !this.setLeft;
          }

          this.playSound(prevState.serverSide);
          this.curState.push(prevState);
        }

    }
  }

  /**
   * Sync current score to Supabase - optimistic and error ignoring
   */
  private syncCurrentScore(): void {
    // Map scores according to UI display logic (accounting for rotateScore)
    const leftScore = this.rotateScore ? this.score1 : this.score2;
    const rightScore = this.rotateScore ? this.score2 : this.score1;

    const setScore = this.supabaseService.createSetScore(
      leftScore,  // left_score (what's displayed on left in UI)
      rightScore  // right_score (what's displayed on right in UI)
    );

    // Fire and forget - don't await to avoid blocking UI
    this.supabaseService.syncSetScore(setScore).catch(() => {
      // Ignore errors silently to keep main system stable
    });
  }

    /**
   * Sync match completion data to global scores
   */
  private syncMatchComplete(): void {
    // Map scores according to UI display logic (accounting for rotateScore)
    const leftScore = this.rotateScore ? this.score1 : this.score2;
    const rightScore = this.rotateScore ? this.score2 : this.score1;

    // Determine winner based on UI display
    const leftWon = leftScore > rightScore;
    const rightWon = rightScore > leftScore;

    // Update local daily totals immediately for UI responsiveness
    if (leftWon) {
      this.dailyLeftWins++;
    } else if (rightWon) {
      this.dailyRightWins++;
    }

    // Increment daily wins in database - fire and forget
    this.supabaseService.incrementDailyWins(leftWon, rightWon).catch(() => {
      // If sync fails, revert local changes
      if (leftWon) {
        this.dailyLeftWins--;
      } else if (rightWon) {
        this.dailyRightWins--;
      }
      console.warn('[Component] Failed to sync daily wins, reverted local changes');
    });
  }

  /**
   * Get current daily totals for UI display
   */
  getDailyLeftWins(): number {
    return this.dailyLeftWins;
  }

  getDailyRightWins(): number {
    return this.dailyRightWins;
  }

  /**
   * Get current daily totals as formatted string for display
   */
  getDailyTotalsString(): string {
    return `${this.dailyLeftWins} — ${this.dailyRightWins}`;
  }
}
