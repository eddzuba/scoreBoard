import { Routes } from '@angular/router';
import { VideoComponent } from "./video/video.component";
import {ScoreboardComponent} from "./scoreboard/scoreboard.component";

export const routes: Routes = [
  { path: 'video', component: VideoComponent },
  { path: '', component: ScoreboardComponent }
];
