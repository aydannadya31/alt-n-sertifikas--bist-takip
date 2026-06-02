/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HistoricalPoint {
  date: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
}

export interface StockInfo {
  symbol: string;
  name: string;
  category: "Gold" | "Aviation" | "Defence" | "Steel" | "Energy" | "Retail" | "Banking" | "Holding" | "Mining";
  price: number;
  change: number; // daily change percentage
  open: number;
  high: number;
  low: number;
  volume: string; // formatted e.g., "4.2M" hoặc "325M TL"
  marketCap: string;
  peRatio?: number;
  isGoldCertificate?: boolean;
}

export interface HoldingItem {
  id: string;
  symbol: string;
  buyPrice: number;
  quantity: number;
  date: string;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: "above" | "below";
  targetPrice: number;
  createdAt: string;
  triggered: boolean;
}

export interface LiveMarketResponse {
  assets: Record<string, StockInfo>;
  indices: {
    XU100: { price: number; change: number };
    XAUUSD: { price: number; change: number }; // USD Ounce gold
    USDTRY: { price: number; change: number }; // USD TRY exchange rate
    ALTIN_GRAM: { price: number; change: number }; // Spot Gold Gram
  };
  timestamp: string;
}

export interface AIAnalysisRequest {
  portfolio: {
    symbol: string;
    buyPrice: number;
    quantity: number;
  }[];
  watchlist: string[];
}

export interface AISearchRequest {
  question: string;
}
