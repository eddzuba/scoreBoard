// gopro-status.component.ts — Angular 18 standalone
// Drop-in UI component with icons for GoProBleService
// - No external UI libs, inline SVG icons
// - Standalone component (Angular 15+), optimized for Angular 18

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoProBleService } from "../services/gopro-ble.service";
import {CAMERA} from "../scoreboard/constants";
import {PlaylistService} from "../services/playlist.service";


@Component({
  selector: 'app-gopro-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
  <div class="card">
    <div class="row spaced">
      <div class="lhs">
        <button class="btn" (click)="g.connect()" *ngIf="!(g.connected$ | async)">
         <span class="label">Connect</span>
        </button>
        <button class="btn" (click)="g.record()" *ngIf="!(g.device$ | async)?.isRecording && (g.connected$ | async)" >
          <svg viewBox="0 0 24 24" class="i rec"><circle cx="12" cy="12" r="6"/></svg>
          <span class="label">REC</span>
        </button>
        <button class="btn" (click)="g.stop()" *ngIf="(g.device$ | async)?.isRecording && (g.connected$ | async)">
          <svg viewBox="0 0 24 24" class="i"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
          <span class="label">STOP</span>
        </button>
      </div>
      <div class="rhs" *ngIf="(g.connected$ | async)">
        <div class="badges">
            <span class="badge" *ngIf="(g.videoProgress$ | async)" [class.rec]="(g.device$ | async)?.isRecording">
            <svg viewBox="0 0 24 24" class="i rec"><circle cx="12" cy="12" r="6"/></svg>
            <ng-container *ngIf="(g.videoProgress$ | async) as t">
              {{ t > 0 ? formatSeconds(t) : 'stopped' }}
            </ng-container>
          </span>
          <span class="badge">
            <svg viewBox="0 0 24 24" class="i batt">
              <path d="M16 7h1a1 1 0 011 1v8a1 1 0 01-1 1h-1v1H6V6h10v1z"/>
            </svg>
            <ng-container *ngIf="(g.battery$ | async) as b">{{ b }}%</ng-container>
          </span>
          <span class="badge warn" *ngIf="(g.device$ | async)?.isHot">
            <svg viewBox="0 0 24 24" class="i"><path d="M11 2h2v10l2 2v2h-6v-2l2-2z"/></svg>
            HOT
          </span>
          <span class="badge info" *ngIf="(g.device$ | async)?.isCold">
            ❄️ COLD
          </span>
        </div>
       <!-- <div class="meta">
          <div>
            <span class="label">Preset</span>
            <span class="val">{{ (g.preset$ | async) || '—' }}</span>
          </div>
          <div>
            <span class="label">Free</span>
            <span class="val">{{ (g.remainingSpace$ | async) | asyncBytes }}</span>
          </div>
        </div>-->
      </div>
    </div>

  </div>
  <div  class="btn highlight" *ngIf="(g.device$ | async)?.isRecording && (g.connected$ | async)"
        (click)="onHighlightClick()" [class.pressing]="isPressing" (animationend)="onAnimationEnd($event)">
    <span class="star" aria-hidden="true">★</span>
    <span class="label">HighLight</span>
    <span class="star" aria-hidden="true">★</span>
  </div>
      </div>
  `,
  styles: [`
    .highlight{
      transform: rotate(90deg) translateY(-54%)  translateX(-6%);
      width: 375px !important;
      height: 60px!important;
      transform-origin: left;
      background: gray !important;
      font-size: 45px !important;
      writing-mode: horizontal-tb; /* ensure normal letter order */
      position: relative;
      z-index: 1000;
    }
    .card{
      padding-left:2px;
      padding-right:3px;
      padding-top: 5px;
      color:#eee;font-family:Inter,system-ui,Segoe UI,Roboto,Arial}
    .row{/*display:flex;*/gap:12px}
    .spaced{justify-content:space-between;align-items:flex-start}
    .lhs{display:flex;flex-wrap:wrap;gap:8px}
    .rhs{flex:1; padding-top: 10px;}
    .btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:6px;
      padding:8px 10px;
      border-radius:10px;
      border:1px solid #2a2a2a;
      background:gray;
      color:black;
      cursor:pointer;
      overflow:hidden;
      width: 100%;
    }
    /* Make the vertical highlight consume full green strip height */
    :host { display: block; }
    :host ::ng-deep .buttons { position: relative; }
    .highlight { flex: 1 1 auto; }
    /* Ensure icon is before text and button grows with text */
    .btn .label { display:inline-block; white-space: nowrap; }
    .btn svg { transform: none; }
    .star { color: #FFD700; margin-right: 6px; font-size: 18px; line-height: 1; }
    .btn:hover{background:#222}
    .i{width:18px;height:18px;fill:currentColor;stroke:currentColor;stroke-width:1.5}
    .i.rec{color:#ff4d4f}
    .title{display:flex;align-items:center;gap:8px;font-weight:600;margin-bottom:8px}
    .muted{opacity:.6;margin-left:6px;font-weight:400}
    .badges{display:flex;gap:2px;flex-wrap:wrap}
    .badge{display:inline-flex;
      width:100%;
      align-items:center;gap:6px;padding:4px 8px;border-radius:999px;border:1px solid #2a2a2a;background:#1a1a1a}
    .badge.busy{border-color:#888}
    .badge.rec{border-color:#ff4d4f}
    .badge.warn{border-color:#f59e0b;color:#f59e0b}
    .badge.info{border-color:#60a5fa;color:#60a5fa}
    .meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:10px}
    .label{opacity:.7;margin-right:0}
    .val{font-weight:600}

    /* Press animation for Highlight button */
    .highlight.pressing {
      animation: btn-press 350ms ease-out;
    }
    @keyframes btn-press {
      0% { transform: rotate(90deg) translateY(-54%) translateX(-6%) scale(1); filter: brightness(1); }
      20% { transform: rotate(90deg) translateY(-54%) translateX(-6%) scale(0.96); filter: brightness(0.9); }
      50% { transform: rotate(90deg) translateY(-54%) translateX(-6%) scale(0.98); filter: brightness(1.05); }
      100% { transform: rotate(90deg) translateY(-54%) translateX(-6%) scale(1); filter: brightness(1); }
    }

    /* Optional subtle ripple highlight */
    .highlight.pressing::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.0) 70%);
      animation: press-glow 350ms ease-out;
      pointer-events: none;
    }
    @keyframes press-glow {
      0% { opacity: 0.0; }
      15% { opacity: 0.45; }
      100% { opacity: 0; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoProStatusComponent {
  isPressing = false;

   constructor(public g: GoProBleService,  private playlistService: PlaylistService,) {}

  async onHighlightClick() {
    this.playlistService.addToPlaylist(CAMERA);
    await this.g.onHighlightClick();
  }

  onAnimationEnd(ev: AnimationEvent) {
    if ((ev.target as HTMLElement)?.classList?.contains('highlight')) {
      this.isPressing = false;
    }
  }

  formatSeconds(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (x: number) => x.toString().padStart(2,'0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
}


