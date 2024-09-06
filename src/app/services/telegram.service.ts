import {Inject, Injectable} from '@angular/core';
import {DOCUMENT} from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class TelegramService {
  private window;
  public tg;
  constructor(@Inject(DOCUMENT) private _document:any) {
    this.window = this._document.defaultView;
    this.tg = this.window?.Telegram.WebApp;
  }

  saveScore() {
    console.log('Результат игры!!!')
  }
}
