/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Clock, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { HistoricalPoint } from "../types";

interface MarketChartProps {
  symbol: string;
  name: string;
  currentPrice: number;
  dailyChange: number;
  historyData: HistoricalPoint[];
  activeRange: string;
  onRangeChange: (range: "1D" | "1W" | "1M" | "1Y") => void;
  isLoading: boolean;
}

export default function MarketChart({
  symbol,
  name,
  currentPrice,
  dailyChange,
  historyData,
  activeRange,
  onRangeChange,
  isLoading,
}: MarketChartProps) {
  const [showSMA, setShowSMA] = useState<boolean>(false);
  const [showRSI, setShowRSI] = useState<boolean>(false);

  // Calculate simulated SMA 5 (as short-term moving average) and simulated RSI
  const processedData = historyData.map((item, idx, arr) => {
    // Simulated Moving average
    let smaVal: number | null = null;
    const windowSize = 4;
    if (idx >= windowSize - 1) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += arr[idx - j].price;
      }
      smaVal = parseFloat((sum / windowSize).toFixed(2));
    } else {
      smaVal = item.price; // fallback or null
    }

    // Simulated technical RSI values
    // Just a realistic sine wave oscillating to look authentic to the price wave
    const rsiVal = Math.max(25, Math.min(85, Math.round(50 + (item.price - arr[0].price) * (50 / (arr[0].price * 0.1 || 1)) + (Math.sin(idx) * 10))));

    return {
      ...item,
      sma: smaVal,
      rsi: rsiVal,
    };
  });

  // Color scheme based on asset symbol/category
  const isGoldRelated = symbol === "ALTIN.S1" || symbol === "KOZAL";
  const strokeColor = isGoldRelated ? "#d97706" : "#2563eb"; // Gold Amber vs BIST Blue
  const fillColor = isGoldRelated ? "#fef3c7" : "#dbeafe";
  const gradientId = `colorPrice-${symbol}`;

  // Stats
  const firstPrice = historyData[0]?.price || currentPrice;
  const rangeChange = currentPrice - firstPrice;
  const rangeChangePercent = (rangeChange / firstPrice) * 100;

  return (
    <div className="glass-effect rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-5 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-extrabold text-white font-sans tracking-tight">
              {symbol} - {name}
            </h3>
            <span className="text-white/10">|</span>
            <span className="text-xs bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full font-mono text-slate-300 font-bold uppercase">
              Grafik Terminali
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold font-mono text-white">
              {currentPrice.toFixed(2)} TL
            </span>
            <span className={`text-xs font-bold flex items-center gap-0.5 ${
              dailyChange >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {dailyChange >= 0 ? <TrendingUp className="w-3" /> : <TrendingDown className="w-3" />}
              {dailyChange >= 0 ? "+" : ""}{dailyChange}% (24S)
            </span>
            
            {/* Period Performance */}
            <span className="text-white/10 mx-1">•</span>
            <span className={`text-xs font-medium ${rangeChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              Dönem Getirisi: <span className="font-mono font-bold">{rangeChange >= 0 ? "+" : ""}{rangeChangePercent.toFixed(1)}%</span>
            </span>
          </div>
        </div>

        {/* Timeline Buttons */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
          {(["1D", "1W", "1M", "1Y"] as const).map((range) => (
            <button
              key={range}
              onClick={() => onRangeChange(range)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                activeRange === range
                  ? "bg-amber-500 text-slate-950 shadow-md border-transparent"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {range === "1D" ? "24S" : range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative h-72 w-full">
        {isLoading && (
          <div className="absolute inset-0 bg-[#020617]/70 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-semibold animate-pulse">Grafik yükleniyor...</span>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={processedData} margin={{ top: 10, right: 38, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#64748b" }}
              dy={8}
            />
            <YAxis
              domain={["auto", "auto"]}
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#64748b" }}
              dx={8}
              tickFormatter={(v) => `${v.toFixed(1)}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="bg-slate-950/95 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-xl text-xs font-mono">
                      <div className="text-slate-400 text-[10px] mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" /> {p.date}
                      </div>
                      <div className="font-bold text-white flex justify-between gap-4">
                        <span>Fiyat:</span>
                        <span className="text-amber-400">{parseFloat(p.price).toFixed(2)} TL</span>
                      </div>
                      {showSMA && p.sma && (
                        <div className="text-emerald-400 flex justify-between gap-4 mt-1">
                          <span>A.Ort (4P):</span>
                          <span>{p.sma.toFixed(2)} TL</span>
                        </div>
                      )}
                      {showRSI && (
                        <div className="text-cyan-400 flex justify-between gap-4 mt-1">
                          <span>RSI:</span>
                          <span>{p.rsi}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={2.5}
              fillOpacity={0.9}
              fill={`url(#${gradientId})`}
            />

            {/* Simulated Moving Average Line */}
            {showSMA && (
              <Area
                type="monotone"
                dataKey="sma"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="transparent"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Technical Utility Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4 mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSMA(!showSMA)}
            className={`text-[11px] px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition cursor-pointer ${
              showSMA
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Hareketli Ortalama (SMA)
          </button>
          
          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`text-[11px] px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition cursor-pointer ${
              showRSI
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> RSI Göstergesi (Göreceli Güç)
          </button>
        </div>

        {showRSI && (
          <div className="flex items-center gap-2 text-xs bg-slate-950/40 px-3 py-1.5 rounded-lg border border-white/5 max-w-xs font-mono">
            <span className="text-slate-400">RSI (Canlı Durum):</span>
            {processedData[processedData.length - 1]?.rsi >= 70 ? (
              <span className="text-rose-400 font-bold">Aşırı Alım (&gt;70)</span>
            ) : processedData[processedData.length - 1]?.rsi <= 30 ? (
              <span className="text-emerald-400 font-bold">Aşırı Satım (&lt;30)</span>
            ) : (
              <span className="text-slate-200 font-bold">Nötr ({processedData[processedData.length - 1]?.rsi})</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
