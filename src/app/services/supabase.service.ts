import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SetScore, GlobalScore } from '../models/score.models';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private isEnabled = true;

  constructor() {
    // Hardcoded Supabase credentials (matching Swift implementation)
    const supabaseUrl = 'https://ufejocelbvrvgmoewhaw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZWpvY2VsYnZydmdtb2V3aGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NTU4NDksImV4cCI6MjA1NzIzMTg0OX0.HoZLb6kO9m3Mt23VCTkdLUTJZM-5HJG3jiRajDcufDM';

    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase] ✅ Service initialized with hardcoded credentials');
  }

  /**
   * Sync set score to Supabase - error ignoring and optimistic
   * Similar to Swift's syncSetScore function
   */
  async syncSetScore(setScore: SetScore): Promise<void> {
    if (!this.isEnabled) {
      return; // Silently skip if not configured
    }

    try {
      const { data, error } = await this.supabase
        .from('daily_sets')
        .upsert(setScore, {
          onConflict: 'day'
        });

      if (error) {
        console.warn('[Supabase] ❌ daily_sets upsert FAILED:', error);
      } else {
        console.log('[Supabase] ✅ daily_sets upsert OK');
      }
    } catch (error) {
      // Error ignoring - log but don't throw
      console.warn('[Supabase] ❌ daily_sets upsert FAILED (catch):', error);
      // Don't re-throw the error to keep the main system stable
    }
  }

  /**
   * Sync global score to Supabase - error ignoring and optimistic
   * Similar to Swift's syncGlobalScore function
   */
  async syncGlobalScore(globalScore: GlobalScore): Promise<void> {
    if (!this.isEnabled) {
      return; // Silently skip if not configured
    }

    try {
      const { data, error } = await this.supabase
        .from('daily_totals')
        .upsert(globalScore, {
          onConflict: 'day'
        });

      if (error) {
        console.warn('[Supabase] ❌ daily_totals upsert FAILED:', error);
      } else {
        console.log('[Supabase] ✅ daily_totals upsert OK');
      }
    } catch (error) {
      // Error ignoring - log but don't throw
      console.warn('[Supabase] ❌ daily_totals upsert FAILED (catch):', error);
      // Don't re-throw the error to keep the main system stable
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.isEnabled;
  }

  /**
   * Get current day in ISO format (YYYY-MM-DD)
   */
  private getCurrentDay(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Helper method to create SetScore from current game state
   */
  createSetScore(leftScore: number, rightScore: number): SetScore {
    return {
      day: this.getCurrentDay(),
      left_score: leftScore,
      right_score: rightScore,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Helper method to create GlobalScore
   */
  createGlobalScore(leftWins: number, rightWins: number): GlobalScore {
    return {
      day: this.getCurrentDay(),
      left_wins: leftWins,
      right_wins: rightWins,
      updated_at: new Date().toISOString()
    };
  }
}
