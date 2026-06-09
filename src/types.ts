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
  headline: string;
  summary: string;
  why_it_matters: string;
  category: string;
  relevance: number; // 1-100
  importance: number; // 1-100
  popularity: number; // 1-100
  score: number; // ranked score (40% relevance + 40% importance + 20% popularity)
  source_articles: { title: string; url: string; source: string }[];
}

export interface Briefing {
  id: string;
  generated_at: string;
  is_automated: boolean;
  cards: BriefingCard[];
}

export interface UserPreferences {
  categories: string[]; // e.g. ["AI & ML", "Startups & VC", "Biotech", "Fintech", "Green Tech"]
  frequency: "hourly" | "daily" | "weekly";
  custom_feeds: string[]; // custom RSS feeds URLs
}

export interface Feedback {
  id: string;
  card_id: string;
  feedback_type: "up" | "down";
  comment?: string;
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
