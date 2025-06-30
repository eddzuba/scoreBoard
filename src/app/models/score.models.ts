export interface SetScore {
  day: string;        // ISO date string (YYYY-MM-DD) - matches 'day' column
  left_score: number; // left team score - matches 'left_score' column
  right_score: number; // right team score - matches 'right_score' column
  updated_at?: string; // timestamp - matches 'updated_at' column
}

export interface GlobalScore {
  day: string;        // ISO date string (YYYY-MM-DD) - matches 'day' column
  left_wins: number;  // sets won by left team - matches 'left_wins' column
  right_wins: number; // sets won by right team - matches 'right_wins' column
  updated_at?: string; // timestamp - matches 'updated_at' column
}
