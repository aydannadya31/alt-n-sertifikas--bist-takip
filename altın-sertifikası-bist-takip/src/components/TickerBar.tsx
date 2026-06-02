/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface TickerBarProps {
  indices: {
    XU100: { price: number; change: number };
    XAUUSD: { price: number; change: number };
    USDTRY: { price: number; change: number };
    ALTIN_GRAM: { price: number; change: number };
  };
  isUpdating: boolean;
}

export default function TickerBar({ indices, isUpdating }: TickerBarProps) {
  return (
    <div className="bg-slate-950/40 backdrop-blur-md border-b border-white/10 text-xs text-slate-300 py-2.5 px-4 overflow-hidden shadow-lg relative z-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
        {/* Left Side: Live Banner */}
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-emerald-400 tracking-wider font-semibold uppercase animate-pulse">BIST CANLI YAYIN</span>
          <span className="text-white/10">|</span>
          <span className="text-slate-400 flex items-center gap-1.5 font-sans font-medium">
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isUpdating ? "animate-spin text-amber-400" : ""}`} />
            Canlı Güncelleniyor
          </span>
        </div>

        {/* Center/Right side: Benchmarks */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto scrollbar-none whitespace-nowrap w-full md:w-auto justify-start md:justify-end pb-1 md:pb-0">
          {/* BIST 100 */}
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-white/5 flex-shrink-0">
            <span className="text-slate-400 text-[10px] sm:text-[11px] font-bold">BIST 100</span>
            <span className="font-semibold text-slate-100 text-[11px] sm:text-xs">{indices.XU100.price.toLocaleString("tr-TR")}</span>
            <span className={`flex items-center text-[10px] sm:text-[11px] font-bold ${indices.XU100.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {indices.XU100.change >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {indices.XU100.change >= 0 ? "+" : ""}{indices.XU100.change}%
            </span>
          </div>

          {/* spot Gold Gram */}
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-white/5 flex-shrink-0">
            <span className="text-slate-400 text-[10px] sm:text-[11px] font-bold">Gram Altın (Spot)</span>
            <span className="font-semibold text-amber-450 text-[11px] sm:text-xs">{indices.ALTIN_GRAM.price.toLocaleString("tr-TR")} TL</span>
            <span className={`flex items-center text-[10px] sm:text-[11px] font-bold ${indices.ALTIN_GRAM.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {indices.ALTIN_GRAM.change >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {indices.ALTIN_GRAM.change >= 0 ? "+" : ""}{indices.ALTIN_GRAM.change}%
            </span>
          </div>

          {/* spot Gold Ons */}
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-white/5 flex-shrink-0">
            <span className="text-slate-400 text-[10px] sm:text-[11px] font-bold">Ons Altın (XAU)</span>
            <span className="font-semibold text-slate-100 text-[11px] sm:text-xs">${indices.XAUUSD.price.toLocaleString("tr-TR")}</span>
          </div>

          {/* usdt try */}
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-white/5 flex-shrink-0">
            <span className="text-slate-400 text-[10px] sm:text-[11px] font-bold">USDTRY</span>
            <span className="font-semibold text-slate-100 text-[11px] sm:text-xs">{indices.USDTRY.price.toFixed(3)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
