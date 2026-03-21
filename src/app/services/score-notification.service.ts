import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, timeout, of, Subject, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScoreNotificationService {
  private readonly URL_KEY = 'score_notification_url';
  private defaultUrl = '';
  private scoreSubject = new Subject<{team1: number, team2: number, finished: boolean, side: string}>();

  constructor(private http: HttpClient) {
    this.defaultUrl = localStorage.getItem(this.URL_KEY) || 'http://212.124.107.106:5050';

    // Подписываемся на поток изменений
    this.scoreSubject.pipe(
      switchMap(data => {
        const url = this.getUrl();
        if (!url) return of(null);

        const payload = {
          Team1Score: data.team1,
          Team2Score: data.team2,
          IsFinished: data.finished,
          MySide: data.side
        };

        return this.http.post(url, payload).pipe(
          timeout(10000),
          catchError(err => {
            console.error('Error sending score notification (silent):', err);
            return of(null);
          })
        );
      })
    ).subscribe();
  }

  setUrl(url: string) {
    this.defaultUrl = url;
    localStorage.setItem(this.URL_KEY, url);
  }

  getUrl(): string {
    return this.defaultUrl;
  }

  notifyScore(team1Score: number, team2Score: number, isFinished: boolean, side: string) {
    // Отправляем данные в поток
    this.scoreSubject.next({
      team1: team1Score,
      team2: team2Score,
      finished: isFinished,
      side: side
    });
  }
}
