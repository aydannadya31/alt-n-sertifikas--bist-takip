/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Star, 
  Bell, 
  Settings, 
  Sparkles,
  BarChart3,
  BookOpen,
  X,
  Plus,
  HelpCircle,
  Play,
  Wallet,
  Volume2,
  VolumeX
} from "lucide-react";

import { StockInfo, HoldingItem, PriceAlert, LiveMarketResponse, HistoricalPoint } from "./types";
import TickerBar from "./components/TickerBar";
import GoldCard from "./components/GoldCard";
import MarketChart from "./components/MarketChart";
import PortfolioManager from "./components/PortfolioManager";
import AIAssistant from "./components/AIAssistant";

export default function App() {
  // Global Market Live states
  const [marketData, setMarketData] = useState<LiveMarketResponse | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("ALTIN.S1");
  const [activeCategory, setActiveCategory] = useState<string>("Tümü");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [marketTrend, setMarketTrend] = useState<string>("normal");
  const [updatingMarketData, setUpdatingMarketData] = useState<boolean>(false);

  // Chart States
  const [chartRange, setChartRange] = useState<"1D" | "1W" | "1M" | "1Y">("1D");
  const [historyData, setHistoryData] = useState<HistoricalPoint[]>([]);
  const [chartLoading, setChartLoading] = useState<boolean>(false);

  // Local Storage (Portfolio & Watchlist & Alerts)
  const [holdings, setHoldings] = useState<HoldingItem[]>(() => {
    const saved = localStorage.getItem("bist_holdings");
    return saved ? JSON.parse(saved) : [
      { id: "1", symbol: "ALTIN.S1", buyPrice: 29.50, quantity: 1500, date: new Date().toISOString() },
      { id: "2", symbol: "THYAO", buyPrice: 308.20, quantity: 50, date: new Date().toISOString() }
    ];
  });
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem("bist_watchlist");
    return saved ? JSON.parse(saved) : ["ALTIN.S1", "THYAO", "ASELS"];
  });

  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem("bist_alerts");
    return saved ? JSON.parse(saved) : [
      { id: "a1", symbol: "ALTIN.S1", condition: "above", targetPrice: 31.50, triggered: false, createdAt: new Date().toISOString() }
    ];
  });

  // Custom alert state
  const [alertSymbol, setAlertSymbol] = useState<string>("ALTIN.S1");
  const [alertCondition, setAlertCondition] = useState<"above" | "below">("above");
  const [alertPrice, setAlertPrice] = useState<string>("");
  const [activeNotification, setActiveNotification] = useState<string | null>(null);

  // Audio alarm playing states
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<number | null>(null);
  const audioTimeoutRef = useRef<number | null>(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"market" | "portfolio" | "ai_advisor">("market");

  // Cleanup audio timers on unmount
  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) window.clearInterval(audioIntervalRef.current);
      if (audioTimeoutRef.current) window.clearTimeout(audioTimeoutRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  // Save to Storage triggers
  useEffect(() => {
    localStorage.setItem("bist_holdings", JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem("bist_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem("bist_alerts", JSON.stringify(alerts));
  }, [alerts]);

  // Fetch live market ticks
  const fetchMarketData = async (showPulse: boolean) => {
    if (showPulse) setUpdatingMarketData(true);
    try {
      const response = await fetch("/api/market-data");
      const data = await response.json();
      setMarketData(data);
      
      // Perform dynamic alert checking with latest live prices of the assets
      checkAlerts(data.assets);
      
    } catch (err) {
      console.error("Unable to load latest market indices", err);
    } finally {
      if (showPulse) setUpdatingMarketData(false);
    }
  };

  // Fetch chart history when selected asset or range changes
  const fetchHistory = async () => {
    setChartLoading(true);
    try {
      const response = await fetch(`/api/market-history/${selectedSymbol}?range=${chartRange}`);
      const data = await response.json();
      if (data.history) {
        setHistoryData(data.history);
      }
    } catch (err) {
      console.error("Error reading financial chart history data", err);
    } finally {
      setChartLoading(false);
    }
  };

  // Initial fetch and polling loop (runs every 5 seconds)
  useEffect(() => {
    fetchMarketData(true);
    const interval = setInterval(() => {
      fetchMarketData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update chart when selected stock changes
  useEffect(() => {
    fetchHistory();
  }, [selectedSymbol, chartRange]);

  // Watch for symbol update and update alarm fields
  useEffect(() => {
    if (marketData && marketData.assets[selectedSymbol]) {
      setAlertPrice(marketData.assets[selectedSymbol].price.toFixed(2));
    }
  }, [selectedSymbol, marketData]);

  // Trigger Market Trend Event (Instruct Backend server to fluctuate specifically)
  const handleTrendChange = async (trend: string) => {
    setMarketTrend(trend);
    try {
      const response = await fetch("/api/market-trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trend })
      });
      const data = await response.json();
      if (data.success) {
        // Fetch values immediately for real-time dramatic UI feel
        fetchMarketData(true);
        setTimeout(() => fetchHistory(), 600);
      }
    } catch (err) {
      console.error("Unable to alter system market condition:", err);
    }
  };

  // Add / Remove from Watchlist
  const toggleWatchlist = (symbol: string) => {
    if (watchlist.includes(symbol)) {
      setWatchlist(prev => prev.filter(s => s !== symbol));
    } else {
      setWatchlist(prev => [...prev, symbol]);
    }
  };

  // Add Portfolio holding Position item
  const handleAddHolding = (newHolding: Omit<HoldingItem, "id" | "date">) => {
    const hold: HoldingItem = {
      ...newHolding,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString()
    };
    setHoldings(prev => [...prev, hold]);
  };

  const handleRemoveHolding = (id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
  };

  // Custom Alert controls
  const startAlarmAudio = () => {
    // Stop any currently running timer or context
    stopAlarmAudio();
    setIsAlarmPlaying(true);

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      let tick = 0;
      const playBeep = () => {
        if (!ctx || ctx.state === "closed") return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // 880 Hz (A5) for tick 0, 987.77 Hz (B5) for tick 1, alternating clean sound
        osc.frequency.setValueAtTime(tick % 2 === 0 ? 880 : 987.77, now);
        osc.type = "sine";

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
        tick++;
      };

      // Play initially
      playBeep();

      // Loop over every 600ms
      const intervalId = window.setInterval(playBeep, 600);
      audioIntervalRef.current = intervalId;

      // Automatically terminate after 7 seconds
      const timeoutId = window.setTimeout(() => {
        stopAlarmAudio();
      }, 7000);
      audioTimeoutRef.current = timeoutId;
    } catch (err) {
      console.error("Audio API warning / auto-play blocked by browser sandbox policy:", err);
    }
  };

  const stopAlarmAudio = () => {
    setIsAlarmPlaying(false);
    if (audioIntervalRef.current) {
      window.clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (audioTimeoutRef.current) {
      window.clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const handleCloseNotification = () => {
    setActiveNotification(null);
    stopAlarmAudio();
  };

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const priceVal = parseFloat(alertPrice);
    if (isNaN(priceVal) || priceVal <= 0) return;

    const newAlert: PriceAlert = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: alertSymbol,
      condition: alertCondition,
      targetPrice: priceVal,
      triggered: false,
      createdAt: new Date().toISOString()
    };

    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleRemoveAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const checkAlerts = (assets: Record<string, StockInfo>) => {
    setAlerts(prevAlerts => {
      let changed = false;
      const updated = prevAlerts.map(alert => {
        if (alert.triggered) return alert;

        const liveAsset = assets[alert.symbol];
        if (!liveAsset) return alert;

        const currentPrice = liveAsset.price;
        let meetsCondition = false;

        if (alert.condition === "above" && currentPrice >= alert.targetPrice) {
          meetsCondition = true;
        } else if (alert.condition === "below" && currentPrice <= alert.targetPrice) {
          meetsCondition = true;
        }

        if (meetsCondition) {
          changed = true;
          // Trigger visually explicit notification
          setActiveNotification(
            `🎯 Fiyat Alarmı Tetiklendi! ${alert.symbol} hedef fiyatı olan ${alert.targetPrice.toFixed(2)} TL değerine ulaştı. (Güncel: ${currentPrice.toFixed(2)} TL)`
          );
          startAlarmAudio();
          return { ...alert, triggered: true };
        }
        return alert;
      });

      return changed ? updated : prevAlerts;
    });
  };

  // Filter Assets list based on search and category
  const filteredAssets = useMemo(() => {
    if (!marketData) return [];
    
    return (Object.values(marketData.assets) as StockInfo[]).filter(asset => {
      const matchSearch = asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchCat = true;
      if (activeCategory === "Altın") {
        matchCat = asset.category === "Gold";
      } else if (activeCategory === "İzleme Listesi") {
        matchCat = watchlist.includes(asset.symbol);
      } else if (activeCategory !== "Tümü") {
        // Find by category code
        matchCat = asset.category === activeCategory;
      }

      return matchSearch && matchCat;
    });
  }, [marketData, searchQuery, activeCategory, watchlist]);

  // Categories defined for filters
  const CATEGORIES = ["Tümü", "Altın", "İzleme Listesi", "Aviation", "Defence", "Steel", "Energy", "Banking", "Holding", "Mining"];

  // Default values until loading finishes
  const indicesData = marketData?.indices || {
    XU100: { price: 10450.25, change: 0.45 },
    XAUUSD: { price: 2365.40, change: 0.22 },
    USDTRY: { price: 33.220, change: 0.15 },
    ALTIN_GRAM: { price: 2985.40, change: 0.22 }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "Gold": return "Altın Sertifikası";
      case "Aviation": return "Havacılık";
      case "Defence": return "Savunma ve Elektronik";
      case "Steel": return "Demir ve Çelik";
      case "Energy": return "Rafineri ve Enerji";
      case "Retail": return "Gıda / Perakende";
      case "Banking": return "Bankacılık";
      case "Holding": return "Holding";
      case "Mining": return "Madencilik";
      default: return cat;
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative overflow-hidden">
      {/* Ambient Background Gradients to power the glassmorphism backdrop */}
      <div className="absolute -top-24 -right-24 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-1/3 -left-24 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-24 right-1/3 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none"></div>
      
      {/* 1. Ambient Background Gradients to power the glassmorphism backdrop */}
      <div className="absolute -top-24 -right-24 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-1/3 -left-24 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-24 right-1/3 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none"></div>

      {/* 2. Main Alert Notifications */}
      {activeNotification && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold py-3 sm:py-3.5 shadow-2xl flex justify-between items-center transition animate-bounce z-50">
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4">
            <span className="text-xs sm:text-sm flex items-center gap-2 leading-relaxed">
              <Bell className="w-5 h-5 text-slate-950 animate-pulse flex-shrink-0" />
              <span>{activeNotification}</span>
            </span>
            <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
              {isAlarmPlaying && (
                <button
                  type="button"
                  onClick={stopAlarmAudio}
                  className="bg-slate-950 hover:bg-slate-900 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition animate-pulse cursor-pointer shadow-lg active:scale-95"
                >
                  <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                  Sesi Sustur (Durdur)
                </button>
              )}
              <button 
                type="button"
                onClick={handleCloseNotification}
                className="hover:bg-amber-700/30 p-1.5 rounded-full text-slate-950 cursor-pointer flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Header & Hero branding (Formatted exactly with 2 levels/rows) */}
      <header className="bg-slate-950/45 backdrop-blur-md border-b border-white/10 sticky top-0 z-20 shadow-lg py-3">
        <div className="max-w-7xl mx-auto px-4 flex flex-col gap-3">
          
          {/* Row 1: Logo, Title and Canlı Connection Status dot */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-xl sm:rounded-2xl text-slate-950 shadow-md flex-shrink-0">
                <Coins className="w-5 h-5 sm:w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-extrabold font-sans text-white tracking-tight flex flex-wrap items-center gap-1.5">
                  <span>Altın Sertifikası</span>
                  <span className="text-amber-400 font-mono text-xs sm:text-base font-semibold bg-amber-500/10 px-1.5 sm:px-2 py-0.5 rounded border border-amber-500/20">ALTIN.S1</span>
                  <span>takibi</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Borsa İstanbul (BIST) & Darphane Canlı Fiyat İzleme ve Analiz Paneli</p>
              </div>
            </div>

            {/* Custom Active Status Header Item */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/5 py-1 px-3 rounded-xl">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-emerald-400 tracking-wider font-extrabold text-[10px] sm:text-[11px] uppercase">ALTIN BAĞLANTISI</span>
              <span className="text-slate-600 text-xs">|</span>
              <span className="text-slate-400 font-sans font-medium text-[10px] sm:text-xs flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${updatingMarketData ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`}></span>
                Canlı Veri Akışı
              </span>
            </div>
          </div>

          {/* Row 2: Live gold-focus indices replacing old clutter & Trend Simulator */}
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto scrollbar-none whitespace-nowrap w-full justify-start py-0.5 border-t border-white/5 pt-2 flex-nowrap">
            {/* ALTIN.S1 Live indicator */}
            <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 flex-shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
              <span className="text-amber-400 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">ALTIN.S1</span>
              <span className="font-mono font-black text-white text-xs sm:text-sm">
                {marketData?.assets["ALTIN.S1"] ? `${marketData.assets["ALTIN.S1"].price.toFixed(2)} TL` : "24.50 TL"}
              </span>
              <span className={`font-mono text-[10px] sm:text-[11px] font-bold ${
                (marketData?.assets["ALTIN.S1"]?.change || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                {(marketData?.assets["ALTIN.S1"]?.change || 0) >= 0 ? "+" : ""}{marketData?.assets["ALTIN.S1"]?.change || 0.42}%
              </span>
            </div>

            {/* Gram Altın (Spot) Indicator */}
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex-shrink-0">
              <span className="text-slate-400 text-[10px] sm:text-[11px] font-bold">Gram Altın (Spot)</span>
              <span className="font-mono font-bold text-amber-450 text-xs sm:text-sm">{indicesData.ALTIN_GRAM.price.toLocaleString("tr-TR")} TL</span>
              <span className={`flex items-center font-mono text-[10px] sm:text-[11px] font-bold ${indicesData.ALTIN_GRAM.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {indicesData.ALTIN_GRAM.change >= 0 ? "+" : ""}{indicesData.ALTIN_GRAM.change}%
              </span>
            </div>

            {/* Ons Altın (Spot) */}
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex-shrink-0">
              <span className="text-slate-400 text-[10px] sm:text-[11px] font-bold">Ons Altın (XAU)</span>
              <span className="font-mono font-bold text-slate-100 text-xs sm:text-sm">${indicesData.XAUUSD.price.toLocaleString("tr-TR")}</span>
              <span className={`flex items-center font-mono text-[10px] sm:text-[11px] font-bold ${indicesData.XAUUSD.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {indicesData.XAUUSD.change >= 0 ? "+" : ""}{indicesData.XAUUSD.change}%
              </span>
            </div>

            {/* USDTRY */}
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex-shrink-0">
              <span className="text-slate-400 text-[10px] sm:text-[11px] font-bold">USDTRY</span>
              <span className="font-mono font-bold text-slate-100 text-xs sm:text-sm">{indicesData.USDTRY.price.toFixed(3)}</span>
              <span className={`flex items-center font-mono text-[10px] sm:text-[11px] font-bold ${indicesData.USDTRY.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {indicesData.USDTRY.change >= 0 ? "+" : ""}{indicesData.USDTRY.change}%
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* 4. Sub-Navigation Tabs */}
      <div className="bg-slate-900/40 backdrop-blur-md border-b border-white/5 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex gap-2 sm:gap-4 overflow-x-auto scrollbar-none whitespace-nowrap flex-nowrap">
          {[
            { id: "market", label: "Canlı Veriler (Sertifika Panosu)", icon: BarChart3 },
            { id: "portfolio", label: "Portföy & Balance Kaydı", icon: Wallet },
            { id: "ai_advisor", label: "Yapay Zeka Yatırım Danışmanı", icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 sm:py-3.5 px-2 sm:px-3 text-[11px] sm:text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition flex-shrink-0 ${
                  activeTab === tab.id
                    ? "border-amber-500 text-amber-400 bg-white/5 font-black"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Main Content Wrapper */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Dynamic TAB Layouts */}
        {activeTab === "market" && (
          <div className="space-y-6">
            
            {/* Row 1: Spotlight Card for ALTIN.S1 */}
            {marketData?.assets["ALTIN.S1"] && (
              <GoldCard 
                goldCertificate={marketData.assets["ALTIN.S1"]} 
                spotGramGold={indicesData.ALTIN_GRAM.price} 
              />
            )}

            {/* Row 2: Grid for Expanded Technical Chart and Price Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Technical Chart Screen Area - Expanded to take up 8 full columns */}
              <div className="lg:col-span-8 space-y-4">
                {marketData?.assets[selectedSymbol] && (
                  <MarketChart
                    symbol={selectedSymbol}
                    name={marketData.assets[selectedSymbol].name}
                    currentPrice={marketData.assets[selectedSymbol].price}
                    dailyChange={marketData.assets[selectedSymbol].change}
                    historyData={historyData}
                    activeRange={chartRange}
                    onRangeChange={(range) => setChartRange(range)}
                    isLoading={chartLoading}
                  />
                )}
              </div>

              {/* Price Alerts Form Area - Structured inside 4 columns on the right */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Custom Price alert form card */}
                <div className="glass-effect rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-400" />
                    ALTIN.S1 Akıllı Fiyat Alarmları
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4 leading-normal">
                    Piyasada gözünüzden kaçacak kritik Darphane Altın Sertifikası fiyat eşiklerini tanımlayın, tetiklenince anında görsel uyarı alın.
                  </p>

                  <form onSubmit={handleAddAlert} className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-white/5 border border-white/5 px-3 py-2.5 rounded-lg flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold">Takip Edilen Varlık</span>
                        <span className="text-slate-100 font-mono font-bold text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">ALTIN.S1</span>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Eşik Koşulu</label>
                        <select
                          value={alertCondition}
                          onChange={(e) => setAlertCondition(e.target.value as any)}
                          className="w-full glass-input-el rounded-lg py-1.5 px-2.5 text-xs font-semibold focus:outline-none"
                        >
                          <option value="above" className="bg-slate-950 text-white">Fiyat Yükselince (&gt;=)</option>
                          <option value="below" className="bg-slate-950 text-white">Fiyat Düşünce (&lt;=)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Hedef Fiyat (TL)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={alertPrice}
                          onChange={(e) => setAlertPrice(e.target.value)}
                          className="flex-1 glass-input-el rounded-lg py-1.5 px-3 text-xs font-mono font-bold focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg py-1.5 px-4 text-xs font-extrabold transition cursor-pointer flex items-center gap-1 flex-shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Alarm Kur
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Registered Alerts queue */}
                  {alerts.length > 0 && (
                    <div className="mt-4 border-t border-white/5 pt-3 space-y-1.5 max-h-48 overflow-y-auto">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Tanımlı Alarmlar ({alerts.length})</span>
                      {alerts.map((al) => (
                        <div key={al.id} className="flex justify-between items-center text-[11px] bg-white/5 py-1.5 px-2.5 rounded-lg border border-white/5">
                          <span className="font-mono font-bold text-slate-200">
                            {al.symbol} {al.condition === "above" ? ">=" : "<="} {al.targetPrice.toFixed(2)} TL
                          </span>
                          <div className="flex items-center gap-2">
                            {al.triggered ? (
                              <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/20">Tetiklendi</span>
                            ) : (
                              <span className="text-[9px] bg-white/5 text-slate-400 font-bold px-1.5 py-0.5 rounded border border-white/5">Beklemede</span>
                            )}
                            <button
                              onClick={() => handleRemoveAlert(al.id)}
                              className="text-slate-400 hover:text-rose-400 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === "portfolio" && marketData && (
          <PortfolioManager
            holdings={holdings}
            onAddHolding={handleAddHolding}
            onRemoveHolding={handleRemoveHolding}
            assets={marketData.assets}
          />
        )}

        {activeTab === "ai_advisor" && (
          <AIAssistant 
            holdings={holdings} 
            watchlist={watchlist} 
          />
        )}

      </main>

      {/* 6. Professional Footer Education */}
      <footer className="bg-slate-950/40 backdrop-blur-md border-t border-white/5 py-12 mt-16 text-slate-400 text-xs text-center border-box">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex justify-center gap-6 text-slate-350 font-medium">
            <span className="flex items-center gap-1"><Coins className="w-4 h-4 text-amber-500" /> Darphane ve Damga Matbaası Genel Müdürlüğü</span>
            <span>•</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-amber-400" /> Borsa İstanbul Piyasaları Pazarı</span>
          </div>
          <p className="max-w-2xl mx-auto text-[11px] text-slate-450 leading-relaxed font-sans">
            Sorumluluk Reddi Beyanı: Bu web sitemiz üzerinde paylaşılan simüle veriler, canlı grafikler ve yapay zeka tarafından sağlanan portföy check-up yorumları yatırım danışmanlığı kapsamında değildir. Darphane Altın Sertifikası (ALTIN.S1) ihraç mevzuatı gereği Borsa İstanbul Emtia Pazarı'nda alınıp satılır ve fiziki altına dönüş hakkı saklıdır.
          </p>
          <div className="text-[10px] text-slate-500 font-mono">
            © 2026 Altın Sertifikası ve BIST Takip Terminali. T.C. Darphane Güvencesiyle Entegre Edilmiştir.
          </div>
        </div>
      </footer>
    </div>
  );
}
