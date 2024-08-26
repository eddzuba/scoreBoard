import {oneState} from "./oneState";

export class GameState {
    state: oneState[] = [];

  push(item: oneState): void {
    this.state.push(item);
  }

  // Извлечение элемента из стека
  pop(): oneState | undefined {
    if (this.state.length === 0) {
        return undefined;
    }
    return this.state.pop();
  }

  reset() {
    this.state = [];
    this.push({score1:0, score2:0, serverSide: 1});
  }


}
