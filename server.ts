/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Standard ESM dir conversions
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Global In-Memory Real-Time State
// To let the user interactively influence the market, we provide "Market State Settings"
let marketTrend: "normal" | "bullish" | "bearish" | "gold_spike" | "high_volatility" = "normal";

// Initializing static reference of our assets
interface AssetDefinition {
  symbol: string;
  name: string;
  category: "Gold" | "Aviation" | "Defence" | "Steel" | "Energy" | "Retail" | "Banking" | "Holding" | "Mining";
  basePrice: number;
  peRatio?: number;
  marketCap: string;
  volumeBase: number;
}

const ASSETS: AssetDefinition[] = [
  { symbol: "ALTIN.S1", name: "Darphane Altın Sertifikası (1/100 gr)", category: "Gold", basePrice: 30.25, peRatio: undefined, marketCap: "15.4B TL", volumeBase: 6500000 },
  { symbol: "THYAO", name: "Türk Hava Yolları", category: "Aviation", basePrice: 312.50, peRatio: 4.8, marketCap: "431.2B TL", volumeBase: 12500000 },
  { symbol: "ASELS", name: "Aselsan Elektronik", category: "Defence", basePrice: 72.80, peRatio: 11.2, marketCap: "331.5B TL", volumeBase: 8400000 },
  { symbol: "EREGL", name: "Ereğli Demir Çelik", category: "Steel", basePrice: 51.40, peRatio: 14.1, marketCap: "179.9B TL", volumeBase: 7100000 },
  { symbol: "TUPRS", name: "Tüpraş Türkiye Petrol Rafinerileri", category: "Energy", basePrice: 168.20, peRatio: 6.1, marketCap: "323.4B TL", volumeBase: 9200000 },
  { symbol: "BIMAS", name: "BİM Birleşik Mağazalar", category: "Retail", basePrice: 478.00, peRatio: 16.5, marketCap: "290.1B TL", volumeBase: 3100000 },
  { symbol: "GARAN", name: "Garanti Bankası", category: "Banking", basePrice: 118.90, peRatio: 5.2, marketCap: "499.3B TL", volumeBase: 11000000 },
  { symbol: "KCHOL", name: "Koç Holding", category: "Holding", basePrice: 231.60, peRatio: 5.9, marketCap: "587.2B TL", volumeBase: 5300000 },
  { symbol: "SAHOL", name: "Sabancı Holding", category: "Holding", basePrice: 94.70, peRatio: 4.5, marketCap: "193.1B TL", volumeBase: 6100000 },
  { symbol: "KOZAL", name: "Koza Altın İşletmeleri", category: "Mining", basePrice: 24.35, peRatio: 8.7, marketCap: "78.4B TL", volumeBase: 4800000 }
];

// Current values in memory
const currentPrices: Record<string, { price: number; dailyChange: number; todayHigh: number; todayLow: number; volume: number }> = {};

// Initialize prices
ASSETS.forEach((asset) => {
  currentPrices[asset.symbol] = {
    price: asset.basePrice,
    dailyChange: (Math.random() * 4 - 2), // start with minor random change
    todayHigh: asset.basePrice * 1.015,
    todayLow: asset.basePrice * 0.985,
    volume: Math.floor(asset.volumeBase * (0.8 + Math.random() * 0.4))
  };
});

// Spot Index state
let xu100Price = 10450.25;
let xu100Change = 0.45;
let usdTryPrice = 33.22;
let xauUsdOunce = 2365.40;

let lastFetchTime = 0;
const CACHE_DURATION_MS = 10000; // 10 seconds cache to be friendly to Yahoo Finance API

const TICKERS: Record<string, string> = {
  "ALTIN.S1": "ALTINS1.IS",
  "THYAO": "THYAO.IS",
  "ASELS": "ASELS.IS",
  "EREGL": "EREGL.IS",
  "TUPRS": "TUPRS.IS",
  "BIMAS": "BIMAS.IS",
  "GARAN": "GARAN.IS",
  "KCHOL": "KCHOL.IS",
  "SAHOL": "SAHOL.IS",
  "KOZAL": "KOZAL.IS"
};

// Apply simulated trends as a modifier offset on top of live values if selected
function getTrendModifier(symbol: string, category: string): number {
  if (marketTrend === "normal") return 1.0;
  
  if (marketTrend === "bullish") {
    if (category === "Gold") return 1.01;
    if (category === "Banking") return 1.05;
    return 1.03;
  }
  
  if (marketTrend === "bearish") {
    if (category === "Gold") return 0.99;
    return 0.94;
  }
  
  if (marketTrend === "gold_spike") {
    if (symbol === "ALTIN.S1" || category === "Mining" || category === "Gold") {
      return 1.10;
    }
    return 0.98;
  }
  
  if (marketTrend === "high_volatility") {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) hash += symbol.charCodeAt(i);
    const wave = Math.sin(hash + Date.now() / 20000);
    return 1.0 + (wave * 0.06); // +/- 6% volatility wave
  }

  return 1.0;
}

// Helper functions to fetch single quote from the chart endpoint
async function fetchTickerFromYahoo(symbol: string): Promise<any> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=15m`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    return meta || null;
  } catch (err) {
    return null;
  }
}

// Fetch live financial indexes and stocks from Yahoo Finance using the secure chart endpoints to prevent 401 unauthorized errors
async function fetchLiveMarketPrices() {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION_MS) {
    return; // Use cache
  }

  try {
    const tickersToFetch = [
      "USDTRY=X",
      "GC=F",
      "^XU100",
      "ALTINS1.IS",
      "THYAO.IS",
      "ASELS.IS",
      "EREGL.IS",
      "TUPRS.IS",
      "BIMAS.IS",
      "GARAN.IS",
      "KCHOL.IS",
      "SAHOL.IS",
      "KOZAL.IS"
    ];

    // Fetch in parallel
    const fetchPromises = tickersToFetch.map(ticker => 
      fetchTickerFromYahoo(ticker).then(meta => ({ ticker, meta }))
    );
    const settled = await Promise.all(fetchPromises);
    const results: Record<string, any> = {};
    settled.forEach(item => {
      if (item.meta) {
        results[item.ticker] = item.meta;
      }
    });

    // Parse Core Indices
    const usdTryMeta = results["USDTRY=X"];
    const gcMeta = results["GC=F"];
    const xuMeta = results["^XU100"];

    if (usdTryMeta) {
      usdTryPrice = usdTryMeta.regularMarketPrice || usdTryPrice;
    }
    if (gcMeta) {
      xauUsdOunce = gcMeta.regularMarketPrice || xauUsdOunce;
    }
    if (xuMeta) {
      xu100Price = xuMeta.regularMarketPrice || xu100Price;
      const prevClose = xuMeta.chartPreviousClose || xuMeta.previousClose || xu100Price;
      xu100Change = prevClose > 0 ? ((xu100Price - prevClose) / prevClose) * 100 : xu100Change;
    }

    const spotGramGold = (xauUsdOunce / 31.1035) * usdTryPrice;

    // Parse Individual Stock Quotes and Altin Sertifikasi
    ASSETS.forEach((asset) => {
      const liveModifier = getTrendModifier(asset.symbol, asset.category);

      if (asset.symbol === "ALTIN.S1") {
        const altinS1Meta = results["ALTINS1.IS"];
        
        let price = (spotGramGold / 100) * 1.23 * liveModifier;
        let prevClose = price / (1 + 0.0015);
        let high = price * 1.015;
        let low = price * 0.985;
        let volume = 6500000;

        if (altinS1Meta) {
          const rawPrice = altinS1Meta.regularMarketPrice || (spotGramGold / 100) * 1.23;
          price = rawPrice * liveModifier;
          prevClose = (altinS1Meta.chartPreviousClose || altinS1Meta.previousClose || rawPrice) * liveModifier;
          high = (altinS1Meta.regularMarketDayHigh || altinS1Meta.regularMarketPrice || price) * liveModifier;
          low = (altinS1Meta.regularMarketDayLow || altinS1Meta.regularMarketPrice || price) * liveModifier;
          volume = altinS1Meta.regularMarketVolume || volume;
        }

        const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0.15;

        currentPrices[asset.symbol] = {
          price: parseFloat(price.toFixed(2)),
          dailyChange: parseFloat(change.toFixed(2)),
          todayHigh: parseFloat(high.toFixed(2)),
          todayLow: parseFloat(low.toFixed(2)),
          volume: Math.floor(volume)
        };
        return;
      }

      const yahooSymbol = `${asset.symbol}.IS`;
      const meta = results[yahooSymbol];

      if (meta) {
        const pr = (meta.regularMarketPrice || asset.basePrice) * liveModifier;
        const prevC = (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice || asset.basePrice) * liveModifier;
        const change = prevC > 0 ? ((pr - prevC) / prevC) * 100 : 0;
        const high = (meta.regularMarketDayHigh || meta.regularMarketPrice || pr) * liveModifier;
        const low = (meta.regularMarketDayLow || meta.regularMarketPrice || pr) * liveModifier;
        const volume = meta.regularMarketVolume || asset.volumeBase;

        currentPrices[asset.symbol] = {
          price: parseFloat(pr.toFixed(2)),
          dailyChange: parseFloat(change.toFixed(2)),
          todayHigh: parseFloat(high.toFixed(2)),
          todayLow: parseFloat(low.toFixed(2)),
          volume: Math.floor(volume)
        };
      }
    });

    lastFetchTime = now;
    console.log(`[Yahoo Finance] Live Prices updated from real-world markets successfully.`);

  } catch (error) {
    console.error("[Yahoo Finance API Sync Failed] Using existing in-memory data:", error);
  }
}

// Every 4 seconds, we run server simulation updates as micro-ticks to keep the trading terminal beautifully ticking!
setInterval(() => {
  Object.keys(currentPrices).forEach((symbol) => {
    const pInfo = currentPrices[symbol];
    if (!pInfo) return;
    
    // Tiny micro-fluctuation (+/- 0.05%) to give real-time live tape momentum feel
    const tickChange = 1.0 + (Math.random() * 0.001 - 0.0005);
    pInfo.price = parseFloat((pInfo.price * tickChange).toFixed(2));
    if (pInfo.price > pInfo.todayHigh) pInfo.todayHigh = pInfo.price;
    if (pInfo.price < pInfo.todayLow) pInfo.todayLow = pInfo.price;
  });
}, 4000);


// API 1: Market data endpoint
app.get("/api/market-data", async (req: Request, res: Response) => {
  // Sync with live financial APIs immediately on request
  await fetchLiveMarketPrices();

  const spotGramGold = (xauUsdOunce / 31.1035) * usdTryPrice;

  const assetsResponse: Record<string, any> = {};
  ASSETS.forEach((asset) => {
    const live = currentPrices[asset.symbol];
    assetsResponse[asset.symbol] = {
      ...asset,
      price: live.price,
      change: live.dailyChange,
      high: live.todayHigh,
      low: live.todayLow,
      volume: formatVolume(live.volume, asset.symbol === "ALTIN.S1" ? false : true),
      isGoldCertificate: asset.symbol === "ALTIN.S1"
    };
  });

  res.json({
    assets: assetsResponse,
    indices: {
      XU100: { price: parseFloat(xu100Price.toFixed(2)), change: parseFloat(xu100Change.toFixed(2)) },
      XAUUSD: { price: parseFloat(xauUsdOunce.toFixed(2)), change: parseFloat((goldChangeFactor() * 100).toFixed(2)) },
      USDTRY: { price: parseFloat(usdTryPrice.toFixed(4)), change: 0.15 },
      ALTIN_GRAM: { price: parseFloat(spotGramGold.toFixed(2)), change: parseFloat((goldChangeFactor() * 100).toFixed(2)) }
    },
    timestamp: new Date().toISOString()
  });
});

function goldChangeFactor() {
  if (marketTrend === "gold_spike") return 0.024;
  if (marketTrend === "bearish") return -0.008;
  return 0.003;
}

function formatVolume(val: number, isStock: boolean): string {
  if (isStock) {
    if (val > 10000000) return `${(val / 1000000).toFixed(1)}M Lot`;
    return `${(val / 1000).toFixed(0)}K Lot`;
  } else {
    return `${(val / 1000000).toFixed(2)}M Adet`;
  }
}

// API 2: Market Trend Configuration
app.post("/api/market-trend", (req: Request, res: Response) => {
  const { trend } = req.body;
  if (["normal", "bullish", "bearish", "gold_spike", "high_volatility"].includes(trend)) {
    marketTrend = trend;
    // Expire cache immediately so next pull forces updated logic
    lastFetchTime = 0;
    res.json({ success: true, activeTrend: marketTrend });
  } else {
    res.status(400).json({ error: "Invalid market trend code format" });
  }
});


// API 3: Market History endpoint (Fetches real historical charts from Yahoo Finance)
app.get("/api/market-history/:symbol", async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const { range } = req.query; // 1D, 1W, 1M, 1Y
  
  const asset = ASSETS.find(a => a.symbol === symbol);
  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  // Determine tickers
  let ticker = `${symbol}.IS`;
  if (symbol === "ALTIN.S1") {
    ticker = "GC=F"; // Default to gold ounce and combine with USDTRY
  } else if (symbol === "XU100") {
    ticker = "^XU100";
  }

  let yfRange = "1d";
  let yfInterval = "15m";

  if (range === "1D") {
    yfRange = "1d"; yfInterval = "15m";
  } else if (range === "1W") {
    yfRange = "5d"; yfInterval = "1h";
  } else if (range === "1M") {
    yfRange = "1mo"; yfInterval = "1d";
  } else if (range === "1Y") {
    yfRange = "1y"; yfInterval = "1mo";
  }

  try {
    let historyPoints: any[] = [];

    if (symbol === "ALTIN.S1") {
      // Golden dual-sync calculation for Altin Sertifikasi to maintain extreme financial fidelity
      const [goldRes, usdRes] = await Promise.all([
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=${yfRange}&interval=${yfInterval}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" }
        }).then(r => r.json()),
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/USDTRY=X?range=${yfRange}&interval=${yfInterval}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" }
        }).then(r => r.json())
      ]);

      const gResult = goldRes?.chart?.result?.[0];
      const uResult = usdRes?.chart?.result?.[0];

      if (!gResult || !uResult) {
        throw new Error("Could not fetch gold/currency history pairs");
      }

      const gTimestamps = gResult.timestamp || [];
      const gCloses = gResult.indicators?.quote?.[0]?.close || [];
      const uCloses = uResult.indicators?.quote?.[0]?.close || [];

      historyPoints = gTimestamps.map((ts: number, index: number) => {
        const date = new Date(ts * 1000);
        let dateLabel = "";

        if (range === "1D") dateLabel = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
        else if (range === "1W") dateLabel = date.toLocaleDateString("tr-TR", { weekday: "short" });
        else if (range === "1M") dateLabel = date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
        else dateLabel = date.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });

        const goldVal = gCloses[index] || gCloses[gCloses.length - 1] || 2300;
        const usdVal = uCloses[index] || uCloses[uCloses.length - 1] || usdTryPrice;
        
        // Spot Gram Gold = (Ounce Gold / 31.1035) * USDTRY 
        const gramGold = (goldVal / 31.1035) * usdVal;
        // ALTIN.S1 represent 1/100 of gram gold * 1.23 standard premium
        const val = (gramGold / 100) * 1.23;

        return {
          date: dateLabel,
          price: parseFloat(val.toFixed(2)),
          open: parseFloat((val * 0.995).toFixed(2)),
          high: parseFloat((val * 1.006).toFixed(2)),
          low: parseFloat((val * 0.994).toFixed(2))
        };
      });

    } else {
      // Standard stock history chart from Yahoo Finance
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${yfRange}&interval=${yfInterval}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" }
      });
      if (!res.ok) throw new Error(`Yahoo HTTP Chart Status ${res.status}`);

      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) throw new Error("No chart result found");

      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const closes = quotes.close || [];
      const opens = quotes.open || [];
      const highs = quotes.high || [];
      const lows = quotes.low || [];

      historyPoints = timestamps.map((ts: number, index: number) => {
        const date = new Date(ts * 1000);
        let dateLabel = "";

        if (range === "1D") dateLabel = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
        else if (range === "1W") dateLabel = date.toLocaleDateString("tr-TR", { weekday: "short" });
        else if (range === "1M") dateLabel = date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
        else dateLabel = date.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });

        const priceVal = closes[index] || opens[index] || result.meta?.regularMarketPrice || asset.basePrice;

        return {
          date: dateLabel,
          price: parseFloat(priceVal.toFixed(2)),
          open: parseFloat((opens[index] || priceVal * 0.995).toFixed(2)),
          high: parseFloat((highs[index] || priceVal * 1.005).toFixed(2)),
          low: parseFloat((lows[index] || priceVal * 0.995).toFixed(2))
        };
      });
    }

    // Filter nulls or NaN
    const validPoints = historyPoints.filter(p => !isNaN(p.price));

    if (validPoints.length === 0) {
      throw new Error("No valid price points resolved");
    }

    // Apply Trend simulation multiplier to historical data too if user activated it
    const activeModifier = getTrendModifier(symbol, asset.category);
    if (activeModifier !== 1.0) {
      validPoints.forEach(p => {
        p.price = parseFloat((p.price * activeModifier).toFixed(2));
        p.open = parseFloat((p.open * activeModifier).toFixed(2));
        p.high = parseFloat((p.high * activeModifier).toFixed(2));
        p.low = parseFloat((p.low * activeModifier).toFixed(2));
      });
    }

    res.json({
      symbol,
      name: asset.name,
      range,
      history: validPoints
    });

  } catch (error) {
    console.warn(`[History Fallback triggered for ${symbol}]`, error);
    // Smoothly falls back to backtrack calculation terminating precisely at the current in-memory price
    const currentPrice = currentPrices[symbol]?.price || asset.basePrice;
    const dataPoints: any[] = [];
    
    let steps = 30;
    if (range === "1D") steps = 12;
    else if (range === "1W") steps = 7;
    else if (range === "1M") steps = 30;
    else if (range === "1Y") steps = 12;

    const now = new Date();

    for (let i = steps - 1; i >= 0; i--) {
      let dateStr = "";
      let mockPrice = currentPrice;

      if (range === "1D") {
        const pastHour = new Date(now.getTime() - i * 45 * 60 * 1000);
        dateStr = pastHour.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
        const randomWalk = Math.sin(i * 1.5) * (currentPrice * 0.003) + (Math.random() * 0.002 - 0.001) * currentPrice;
        mockPrice = currentPrice - randomWalk;
      } else if (range === "1W") {
        const pastDay = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dateStr = pastDay.toLocaleDateString("tr-TR", { weekday: "short" });
        const randomWalk = Math.sin(i * 1.1) * (currentPrice * 0.015) + (Math.random() * 0.01 - 0.005) * currentPrice;
        mockPrice = currentPrice - randomWalk;
      } else if (range === "1M") {
        const pastDay = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dateStr = pastDay.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
        const randomWalk = Math.cos(i * 0.3) * (currentPrice * 0.04) + (Math.random() * 0.02 - 0.01) * currentPrice;
        mockPrice = currentPrice - randomWalk;
      } else {
        const pastMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dateStr = pastMonth.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
        const trendBias = symbol === "ALTIN.S1" ? (i * -0.025 * currentPrice) : (i * -0.018 * currentPrice);
        const cyclic = Math.sin(i * 0.8) * (currentPrice * 0.08);
        mockPrice = parseFloat(Math.max(1.0, currentPrice + trendBias + cyclic + (Math.random() * 0.03 - 0.015) * currentPrice).toFixed(2));
      }

      const priceVal = parseFloat(Math.max(0.1, mockPrice).toFixed(2));
      const rangeVariance = priceVal * 0.012;
      
      dataPoints.push({
        date: dateStr,
        price: priceVal,
        open: parseFloat((priceVal * 0.995).toFixed(2)),
        high: parseFloat((priceVal + rangeVariance * Math.random()).toFixed(2)),
        low: parseFloat((priceVal - rangeVariance * Math.random()).toFixed(2))
      });
    }

    dataPoints[dataPoints.length - 1].price = currentPrice;

    res.json({
      symbol,
      name: asset.name,
      range,
      history: dataPoints
    });
  }
});


// API 4: Yapay Zeka Portföy Analizi (Sadece Server tarafında çalışan Gemini API)
app.post("/api/analyst/portfolio", async (req: Request, res: Response) => {
  const { portfolio, watchlist } = req.body;

  try {
    const ai = getGeminiClient();

    let portfolioDescription = "";
    if (!portfolio || portfolio.length === 0) {
      portfolioDescription = "Henüz bir portföy yatırımı eklenmedi, sadece boş veya izleme listesi var.";
    } else {
      portfolio.forEach((item: any, idx: number) => {
        portfolioDescription += `${idx + 1}. Hisse: ${item.symbol}, Maliyet: ${item.buyPrice} TL, Adet: ${item.quantity} adet\n`;
      });
    }

    const watchlistDescription = (watchlist && watchlist.length > 0) 
      ? `İzleme Listesindeki Hisseler: ${watchlist.join(", ")}` 
      : "İzleme listesinde henüz hisse yok.";

    const systemPrompt = `Borsa İstanbul (BIST 100) piyasası ve özellikle "Darphane Altın Sertifikası" (ALTIN.S1) yatırımları konusunda uzmanlaşmış kıdemli bir Türk finans analisti ve portföy danışmanısın.
Kullanıcılara kişiselleştirilmiş, yapıcı, profesyonel, anlaşılır ve eyleme dökülebilir tavsiyeler ver.

Analizinde şu önemli noktaları mutlaka ele al:
1. "Darphane Altın Sertifikası" (ALTIN.S1) hissesinin portföydeki yeri, %0 stopaj (vergi) avantajı, fiziki altına dönüşebilme şansı, ve enflasyona karşı koruma (hedging) özelliği hakkındaki analizini belirt.
2. Kullanıcının maliyetlerine göre anlık durumunun genel değerlendirmesini yap.
3. Çeşitlendirme (risk dağılımı) analizini sun: havacılık, teknoloji/savunma (Aselsan), sanayi, holding veya altın dengesi uygun mu?
4. Tavsiyelerini resmi yatırım tavsiyesi (YTD) olmadan profesyonel bir dille ilet.

Lütfen yanıtı zengin Markdown formatında, düzgün başlıklar, listeler ve vurgulamalar kullanarak tamamen Türkçe yaz.`;

    const userPrompt = `Aşağıda benim mevcut BIST portföyüm ve izleme listem yer almaktadır:
    
PORTFÖYÜM:
${portfolioDescription}

İZLEME LİSTEM:
${watchlistDescription}

Lütfen bu verileri detaylıca analiz et ve bana portföy sağlığım, altın sertifikası dengem, risk derecem ve piyasa şartlarına göre atabileceğim adımlar hakkında Türkçe zengin bir analiz raporu sun.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    res.json({
      success: true,
      analysis: response.text
    });

  } catch (error: any) {
    console.error("Gemini portfolio analysis error:", error);
    res.status(200).json({
      success: false,
      error: error.message || "Yapay zeka servisi şu an başlatılamadı veya GEMINI_API_KEY yapılandırılmamış durumda.",
      fallbackAnalysis: `### ⚠️ Yapay Zeka Danışmanı Bağlantı Detayı

Yapay zeka asistanının çalışabilmesi için **Settings > Secrets** sekmesinden geçerli bir **GEMINI_API_KEY** tanımlanmış olmalıdır.

**Sizin için Portföy Analiz Önizlemesi (Özet):**
- **ALTIN.S1 Analizi**: Darphane Altın Sertifikası, fiziki altına endeksli olup Borsa İstanbul'da işlem gören ve kazancı stopajdan muaf tutulan harika bir limandır. Portföyünüzde altın ağırlığı olması, piyasa dalgalanmalarına karşı sigorta işlevi görür.
- **Portföy Dengesi**: Portföyünüzde savunma (%aselsan), havacılık (%thyao) ve sanayi (%eregl, %tuprs) ağırlıklarının dengeli dağılımı kritik öneme sahiptir.
- **İPhone/Web Ayarı**: Lütfen sol alttan veya sağ üstten "Settings" sekmesine basarak API anahtarınızı ekleyin ve analiz motorunu canlandırın!`
    });
  }
});


// API 5: Google Search Grounding Destekli Yapay Zeka Finansal Soru Cevap
app.post("/api/analyst/question", async (req: Request, res: Response) => {
  const { question } = req.body;

  if (!question) {
    res.status(400).json({ error: "Soru boş bırakılamaz." });
    return;
  }

  try {
    const ai = getGeminiClient();

    const systemPrompt = `Borsa İstanbul mevzuatı, Darphane Altın Sertifikası (ALTIN.S1) kuralları ve Türk maliyesi hakkında uzman bir danışmansın. 
Kullanıcının sorduğu soruya doğrulanmış internet bilgileri kullanarak net ve doğru cevaplar ver.
Özellikle ALTIN.S1'in vergisel avantajları (stopaj muafiyeti), fiziki altına çevrilme şartları (minimum talep miktarı, Darphane başvuru limitleri), Borsa İstanbul'da işlem saatleri gibi detaylarda hata yapmamaya özen göster.
Her zaman Markdown olarak Türkçe yanıtla. Yanıtın sonunda, kullandığın kaynakları veya arama kanıtlarını "Yararlanılan Kaynaklar:" başlığı altında listele.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: question,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }],
        temperature: 0.4
      }
    });

    // Extract search grounding metadata sources if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks.map((chunk: any) => {
      if (chunk.web) {
        return {
          title: chunk.web.title,
          uri: chunk.web.uri
        };
      }
      return null;
    }).filter(Boolean);

    res.json({
      success: true,
      answer: response.text,
      sources: sources
    });

  } catch (error: any) {
    console.error("Gemini search integration query error:", error);
    // Let's answer with an educational fallback explaining ALTIN.S1 rules accurately
    let offlineAnswer = "";
    if (question.toLowerCase().includes("vergi") || question.toLowerCase().includes("stopaj")) {
      offlineAnswer = `### ALTIN.S1 Vergilendirme ve Stopaj Avantajı (Özet Bilgi)
Darphane Altın Sertifikaları (ALTIN.S1), Borsa İstanbul'da hisse senedi gibi alınıp satılabilen ve **bireysel yatırımcılar için kazançta stopaj oranı %0 (Sıfır)** olan olağanüstü vergi avantajına sahip bir üründür.
* **Stopaj Avantajı**: Elde edilen alım-satım kazançları üzerinden herhangi bir gelir vergisi kesintisi yapılmaz.
* **Fiziki Teslimat**: Darphane mevzuatına göre talep edilmesi halinde, asgari 50-100 gram ve katları olacak şekilde, sertifikalar fiziki altın külçesi veya Darphane basımı altın ile birebir değiştirilebilir. Fiziki altın almak istediğinizde aracı kurumunuz aracılığıyla Darphane'ye talepte bulunabilirsiniz.`;
    } else {
      offlineAnswer = `### Darphane Altın Sertifikası (ALTIN.S1) Hakkında Soru Cevap
ALTIN.S1, Darphane ve Damga Matbaası Genel Müdürlüğü tarafından ihraç edilmiş, her bir sertifikanın 0.01 gram altını temsil ettiği bir yatırım aracıdır.
* **Nasıl Alınır?**: Herhangi bir banka veya aracı kurumdaki hisse senedi (yatırım) hesabınızdan tıpkı bir hisse kodu girer gibi **ALTIN.S1** kodunu yazarak alıp satabilirsiniz.
* **Neden Tercih Edilir?**: Çalınma, kaybolma veya saklama maliyeti yoktur. Makas aralığı (alım-satım farkı) fiziki kuyumculara veya bankaların altın hesaplarına kıyasla son derece düşüktür.
* *Not*: Yapay Zeka İnternet Aramasını çalıştırmak için projenize bir geçerli \`GEMINI_API_KEY\` eklemeniz yeterlidir.`;
    }

    res.json({
      success: false,
      answer: offlineAnswer + "\n\n*(Bilgi: Yapay zeka servis anahtarı bulunmadığı için sistem yerleşik kılavuz verilerinden otomatik yanıt üretmiştir.)*",
      sources: [
        { title: "Darphane Altın Sertifikası Resmi Kılavuzu", uri: "https://www.darphane.gov.tr" },
        { title: "Borsa İstanbul Altın Sertifikası Pazarı", uri: "https://www.borsaistanbul.com" }
      ]
    });
  }
});


// Express setup with Vite Dev Environment or static handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server loaded in mode ${process.env.NODE_ENV || "development"}`);
    console.log(`Open BIST Stock & Gold tracker on http://0.0.0.0:${PORT}`);
  });
}

startServer();
