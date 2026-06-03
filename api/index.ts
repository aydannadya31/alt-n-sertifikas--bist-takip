import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

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

let marketTrend: "normal" | "bullish" | "bearish" | "gold_spike" | "high_volatility" = "normal";

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

const currentPrices: Record<string, { price: number; dailyChange: number; todayHigh: number; todayLow: number; volume: number }> = {};

ASSETS.forEach((asset) => {
  currentPrices[asset.symbol] = {
    price: asset.basePrice,
    dailyChange: (Math.random() * 4 - 2),
    todayHigh: asset.basePrice * 1.015,
    todayLow: asset.basePrice * 0.985,
    volume: Math.floor(asset.volumeBase * (0.8 + Math.random() * 0.4))
  };
});

let xu100Price = 10450.25;
let xu100Change = 0.45;
let usdTryPrice = 33.22;
let xauUsdOunce = 2365.40;

let lastFetchTime = 0;
const CACHE_DURATION_MS = 10000;

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
    return 1.0 + (wave * 0.06);
  }
  return 1.0;
}

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

async function fetchLiveMarketPrices() {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION_MS) {
    return;
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

setInterval(() => {
  Object.keys(currentPrices).forEach((symbol) => {
    const pInfo = currentPrices[symbol];
    if (!pInfo) return;
    const tickChange = 1.0 + (Math.random() * 0.001 - 0.0005);
    pInfo.price = parseFloat((pInfo.price * tickChange).toFixed(2));
    if (pInfo.price > pInfo.todayHigh) pInfo.todayHigh = pInfo.price;
    if (pInfo.price < pInfo.todayLow) pInfo.todayLow = pInfo.price;
  });
}, 4000);

app.get("/api/market-data", async (req: Request, res: Response) => {
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

app.post("/api/market-trend", (req: Request, res: Response) => {
  const { trend } = req.body;
  if (["normal", "bullish", "bearish", "gold_spike", "high_volatility"].includes(trend)) {
    marketTrend = trend;
    lastFetchTime = 0;
    res.json({ success: true, activeTrend: marketTrend });
  } else {
    res.status(400).json({ error: "Invalid market trend code format" });
  }
});

app.get("/api/market-history/:symbol", async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const { range } = req.query;

  const asset = ASSETS.find(a => a.symbol === symbol);
  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  let ticker = `${symbol}.IS`;
  if (symbol === "ALTIN.S1") {
    ticker = "GC=F";
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

        const gramGold = (goldVal / 31.1035) * usdVal;
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

    const validPoints = historyPoints.filter(p => !isNaN(p.price));

    if (validPoints.length === 0) {
      throw new Error("No valid price points resolved");
    }

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

// ─── GitHub Users Storage Helpers ────────────────────────────────────────────

const GH_OWNER = "aydannadya31";
const GH_REPO = "alt-n-sertifikas--bist-takip";
const GH_PATH = "data/users.json";
const GH_BRANCH = "main";
const USERS_API_URL = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`;

interface StoredUser {
  id: string;
  email: string;
  password: string;
  createdAt: string;
}

interface PasswordResetRequest {
  id: string;
  email: string;
  option: "send_old" | "reset";
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

function getGhToken(): string {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("GH_TOKEN environment variable is not set");
  return token;
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    const token = process.env.GH_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3.raw",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(USERS_API_URL, { headers });
    if (!res.ok) {
      console.warn(`[readUsers] HTTP ${res.status}: ${res.statusText}`);
      return [];
    }
    const text = await res.text();
    if (!text || text.trim() === "") return [];
    return JSON.parse(text);
  } catch (err) {
    console.error("[readUsers] Fetch error:", err);
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<boolean> {
  const token = getGhToken();
  const content = Buffer.from(JSON.stringify(users, null, 2)).toString("base64");

  // Get current file SHA
  const getRes = await fetch(
    USERS_API_URL,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" } }
  );
  const currentFile = getRes.ok ? await getRes.json() : null;
  const sha = currentFile?.sha;

  const body: any = {
    message: "users.json güncellendi [AI Studio]",
    content,
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(
    USERS_API_URL,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  return putRes.ok;
}

async function readPasswordResets(): Promise<PasswordResetRequest[]> {
  try {
    const token = process.env.GH_TOKEN;
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/data/password-resets.json`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3.raw",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text || text.trim() === "") return [];
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function writePasswordResets(requests: PasswordResetRequest[]): Promise<boolean> {
  const token = getGhToken();
  const content = Buffer.from(JSON.stringify(requests, null, 2)).toString("base64");
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/data/password-resets.json`;

  const getRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" }
  });
  const currentFile = getRes.ok ? await getRes.json() : null;
  const sha = currentFile?.sha;

  const body: any = {
    message: "password-resets.json güncellendi [AI Studio]",
    content,
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return putRes.ok;
}

// ─── Auth Endpoints ──────────────────────────────────────────────────────────

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Ag1453ag!";

app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "E-posta ve şifre gereklidir." });
      return;
    }
    const users = await readUsers();
    if (users.find((u) => u.email === email)) {
      res.status(409).json({ error: "Bu e-posta adresi zaten kayıtlı." });
      return;
    }
    const newUser: StoredUser = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      password,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    const ok = await writeUsers(users);
    if (!ok) {
      res.status(500).json({ error: "Kullanıcı kaydedilemedi. GH_TOKEN ayarlandığından emin olun." });
      return;
    }
    res.json({ success: true, message: "Kayıt başarılı!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Kayıt sırasında hata oluştu." });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Admin login check
    if (email === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      res.json({ success: true, role: "admin", user: { email: ADMIN_USERNAME } });
      return;
    }

    if (!email || !password) {
      res.status(400).json({ error: "E-posta ve şifre gereklidir." });
      return;
    }

    const users = await readUsers();
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
      res.status(401).json({ error: "E-posta veya şifre hatalı." });
      return;
    }
    res.json({ success: true, role: "user", user: { email: user.email, id: user.id } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Giriş sırasında hata oluştu." });
  }
});

app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email, option } = req.body;
    if (!email || !option) {
      res.status(400).json({ error: "E-posta ve seçenek gereklidir." });
      return;
    }

    const users = await readUsers();
    const user = users.find((u) => u.email === email);
    if (!user) {
      res.status(404).json({ error: "Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı." });
      return;
    }

    // Save the reset request for admin review
    const resets = await readPasswordResets();
    const newRequest: PasswordResetRequest = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      option,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    resets.push(newRequest);
    const ok = await writePasswordResets(resets);
    if (!ok) {
      res.status(500).json({ error: "Talep kaydedilemedi." });
      return;
    }

    res.json({
      success: true,
      message: "Şifre sıfırlama talebiniz admin paneline iletilmiştir. Admininiz talebinizi manuel olarak değerlendirecektir.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "İşlem sırasında hata oluştu." });
  }
});

// ─── Admin Endpoints ─────────────────────────────────────────────────────────

function isAdmin(req: Request): boolean {
  const { adminUser, adminPass } = req.body;
  return adminUser === ADMIN_USERNAME && adminPass === ADMIN_PASSWORD;
}

app.post("/api/admin/users", async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      res.status(401).json({ error: "Yetkisiz erişim." });
      return;
    }
    const users = await readUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Kullanıcılar alınamadı." });
  }
});

app.post("/api/admin/users/update", async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      res.status(401).json({ error: "Yetkisiz erişim." });
      return;
    }
    const { userId, newEmail, newPassword } = req.body;
    if (!userId) {
      res.status(400).json({ error: "Kullanıcı ID gereklidir." });
      return;
    }
    const users = await readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      res.status(404).json({ error: "Kullanıcı bulunamadı." });
      return;
    }
    if (newEmail) users[idx].email = newEmail;
    if (newPassword) users[idx].password = newPassword;
    const ok = await writeUsers(users);
    if (!ok) {
      res.status(500).json({ error: "Kullanıcı güncellenemedi." });
      return;
    }
    res.json({ success: true, message: "Kullanıcı güncellendi." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Güncelleme sırasında hata oluştu." });
  }
});

app.post("/api/admin/users/delete", async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      res.status(401).json({ error: "Yetkisiz erişim." });
      return;
    }
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "Kullanıcı ID gereklidir." });
      return;
    }
    let users = await readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      res.status(404).json({ error: "Kullanıcı bulunamadı." });
      return;
    }
    users.splice(idx, 1);
    const ok = await writeUsers(users);
    if (!ok) {
      res.status(500).json({ error: "Kullanıcı silinemedi." });
      return;
    }
    res.json({ success: true, message: "Kullanıcı silindi." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Silme sırasında hata oluştu." });
  }
});

// ─── Admin Password Reset Endpoints ─────────────────────────────────────────

app.post("/api/admin/password-resets", async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      res.status(401).json({ error: "Yetkisiz erişim." });
      return;
    }
    const requests = await readPasswordResets();
    res.json({ success: true, requests });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Talepler alınamadı." });
  }
});

app.post("/api/admin/password-resets/approve", async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      res.status(401).json({ error: "Yetkisiz erişim." });
      return;
    }
    const { requestId } = req.body;
    if (!requestId) {
      res.status(400).json({ error: "Talep ID gereklidir." });
      return;
    }

    const requests = await readPasswordResets();
    const reqIdx = requests.findIndex((r) => r.id === requestId);
    if (reqIdx === -1) {
      res.status(404).json({ error: "Talep bulunamadı." });
      return;
    }

    const resetReq = requests[reqIdx];
    const users = await readUsers();
    const userIdx = users.findIndex((u) => u.email === resetReq.email);
    if (userIdx === -1) {
      res.status(404).json({ error: "Kullanıcı bulunamadı." });
      return;
    }

    let userPassword = users[userIdx].password;

    if (resetReq.option === "reset") {
      const newPassword = "YeniSifre" + Math.floor(Math.random() * 10000);
      users[userIdx].password = newPassword;
      userPassword = newPassword;
      const usersOk = await writeUsers(users);
      if (!usersOk) {
        res.status(500).json({ error: "Şifre güncellenemedi." });
        return;
      }
    }

    requests[reqIdx].status = "approved";
    await writePasswordResets(requests);

    res.json({
      success: true,
      message: resetReq.option === "send_old"
        ? `Kullanıcının mevcut şifresi: ${userPassword}`
        : `Yeni şifre oluşturuldu: ${userPassword}`,
      password: userPassword,
      email: resetReq.email,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Onaylama sırasında hata oluştu." });
  }
});

app.post("/api/admin/password-resets/reject", async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) {
      res.status(401).json({ error: "Yetkisiz erişim." });
      return;
    }
    const { requestId } = req.body;
    if (!requestId) {
      res.status(400).json({ error: "Talep ID gereklidir." });
      return;
    }

    const requests = await readPasswordResets();
    const reqIdx = requests.findIndex((r) => r.id === requestId);
    if (reqIdx === -1) {
      res.status(404).json({ error: "Talep bulunamadı." });
      return;
    }

    requests[reqIdx].status = "rejected";
    await writePasswordResets(requests);

    res.json({ success: true, message: "Talep reddedildi." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Reddetme sırasında hata oluştu." });
  }
});

// ─── Kullanıcı Data (Alerts/Holdings/Watchlist) Endpoints ───────────────────

interface UserData {
  email: string;
  alerts: any[];
  holdings: any[];
  watchlist: string[];
}

const USER_DATA_PATH = "data/user-data.json";
const USER_DATA_URL = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${USER_DATA_PATH}`;

async function readAllUserData(): Promise<UserData[]> {
  try {
    const token = process.env.GH_TOKEN;
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3.raw" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(USER_DATA_URL, { headers });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text || text.trim() === "") return [];
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function writeAllUserData(data: UserData[]): Promise<boolean> {
  const token = getGhToken();
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

  const getRes = await fetch(USER_DATA_URL, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" }
  });
  const currentFile = getRes.ok ? await getRes.json() : null;
  const sha = currentFile?.sha;

  const body: any = {
    message: "user-data.json güncellendi [AI Studio]",
    content,
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(USER_DATA_URL, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return putRes.ok;
}

app.post("/api/user-data/load", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "E-posta gereklidir." });
      return;
    }
    const allData = await readAllUserData();
    const userData = allData.find((d) => d.email === email);
    res.json({
      success: true,
      data: userData || { email, alerts: [], holdings: [], watchlist: [] },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Veriler alınamadı." });
  }
});

app.post("/api/user-data/save", async (req: Request, res: Response) => {
  try {
    const { email, alerts, holdings, watchlist } = req.body;
    if (!email) {
      res.status(400).json({ error: "E-posta gereklidir." });
      return;
    }
    let allData = await readAllUserData();
    const idx = allData.findIndex((d) => d.email === email);
    const newData: UserData = {
      email,
      alerts: alerts || [],
      holdings: holdings || [],
      watchlist: watchlist || [],
    };
    if (idx >= 0) {
      allData[idx] = newData;
    } else {
      allData.push(newData);
    }
    const ok = await writeAllUserData(allData);
    if (!ok) {
      res.status(500).json({ error: "Veriler kaydedilemedi." });
      return;
    }
    res.json({ success: true, message: "Veriler kaydedildi." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Kayıt sırasında hata oluştu." });
  }
});

// Serve static files in production
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

export default app;
