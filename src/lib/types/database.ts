export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StrategyType =
  | 'SMC'
  | 'CHART_PATTERNS'
  | 'CANDLESTICK'
  | 'CONFLUENCE';

export type BiasType = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export type AnalysisStatus = 'pending' | 'completed' | 'failed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          first_name: string | null;
          last_name: string | null;
          location: string | null;
          avatar_url: string | null;
          default_strategy: string;
          default_symbol: string;
          default_timeframe: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          first_name?: string | null;
          last_name?: string | null;
          location?: string | null;
          avatar_url?: string | null;
          default_strategy?: string;
          default_symbol?: string;
          default_timeframe?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          first_name?: string | null;
          last_name?: string | null;
          location?: string | null;
          avatar_url?: string | null;
          default_strategy?: string;
          default_symbol?: string;
          default_timeframe?: string;
          updated_at?: string;
        };
      };
      snapshots: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          symbol: string;
          timeframe: string;
          chart_timestamp: string;
          visible_range: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path: string;
          symbol: string;
          timeframe: string;
          chart_timestamp?: string;
          visible_range?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          storage_path?: string;
          symbol?: string;
          timeframe?: string;
          chart_timestamp?: string;
          visible_range?: Json | null;
          metadata?: Json | null;
        };
      };
      analyses: {
        Row: {
          id: string;
          user_id: string;
          snapshot_id: string | null;
          symbol: string;
          timeframe: string;
          strategy: string;
          custom_question: string | null;
          status: string;
          bias: string;
          confluence_score: number | null;
          result: Json;
          model_name: string;
          prompt_version: string;
          processing_duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_id?: string | null;
          symbol: string;
          timeframe: string;
          strategy: string;
          custom_question?: string | null;
          status?: string;
          bias: string;
          confluence_score?: number | null;
          result: Json;
          model_name: string;
          prompt_version: string;
          processing_duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          snapshot_id?: string | null;
          symbol?: string;
          timeframe?: string;
          strategy?: string;
          custom_question?: string | null;
          status?: string;
          bias?: string;
          confluence_score?: number | null;
          result?: Json;
          model_name?: string;
          prompt_version?: string;
          processing_duration_ms?: number | null;
        };
      };
      usage_events: {
        Row: {
          id: string;
          user_id: string;
          analysis_id: string | null;
          provider: string;
          model_id: string;
          input_tokens: number | null;
          output_tokens: number | null;
          cost_estimate_usd: number | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          analysis_id?: string | null;
          provider?: string;
          model_id: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cost_estimate_usd?: number | null;
          status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          analysis_id?: string | null;
          provider?: string;
          model_id?: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cost_estimate_usd?: number | null;
          status?: string;
        };
      };
    };
  };
}

export interface SMCAnalysisResult {
  bias: BiasType;
  confluenceScore: number;
  executiveSummary: string;
  keyLevels: {
    poiZone: {
      low: number;
      high: number;
      label: string;
    };
    invalidationSL: {
      price: number;
      distancePips: number;
      reason: string;
    };
    targets: Array<{
      level: number;
      price: number;
      gainPips: number;
      label: string;
    }>;
    riskRewardRatio: string;
  };
  evidenceChecklist: Array<{
    title: string;
    description: string;
    isConfirmed: boolean;
  }>;
  marketStructure: {
    higherTimeframeTrend: string;
    internalTrend: string;
    liquidityStatus: string;
    equilibriumZone: string;
  };
  disclaimer: string;
}
