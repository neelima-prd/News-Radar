/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  content: string;
  category: string;
  published_at: string;
}

export interface BriefingCard {
  id: string;
  briefing_id: string;
  rank?: number;
  priority: "TOP STORY" | "IMPORTANT" | "OTHER";
  headline: string;
  summary: string;
  why_it_matters: string;
  category: string; // 'Technology', 'Startups'
  why_selected?: string[]; // transparency points: e.g. ["Matches your Technology interest", "High industry impact", "Covered by multiple trusted sources"]
  source_articles: { title: string; url: string; source: string }[];
  isRead?: boolean;
}

export interface Briefing {
  id: string;
  generated_at: string;
  is_automated: boolean;
  cards: BriefingCard[];
  scanned_count?: number; // articles analyzed count
  cluster_count?: number; // stories clustered count
  selected_story_count?: number;
  target_read_time_seconds?: number;
}

export interface UserPreferences {
  topics: string[]; // e.g. ["technology", "startups"]
  briefing_frequency_hours: 3 | 6 | 12 | 24; // default 6
  notifications_enabled?: boolean;
}

export interface Feedback {
  id: string;
  briefing_item_id: string;
  feedback_type: "useful" | "not_relevant";
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_name: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface LiveRadarLog {
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

