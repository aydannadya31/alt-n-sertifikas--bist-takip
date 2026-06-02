/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, HelpCircle } from "lucide-react";
import { HoldingItem, StockInfo } from "../types";

interface PortfolioManagerProps {
  holdings: HoldingItem[];
  onAddHolding: (holding: Omit<HoldingItem, "id" | "date">) => void;
  onRemoveHolding: (id: string) => void;
  assets: Record<string, StockInfo>;
}

export default function PortfolioManager({
  holdings,
  onAddHolding,
  onRemoveHolding,
  assets,
}: PortfolioManagerProps) {
  // Input states
  const [selectedSymbol] = useState<string>("ALTIN.S1");
  const [buyPrice, setBuyPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(buyPrice);
    const qtyNum = parseFloat(quantity);

    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage("Lütfen geçerli bir alış fiyatı yazın.");
      return;
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMessage("Lütfen geçerli bir miktar yazın.");
      return;
    }

    onAddHolding({
      symbol: selectedSymbol,
      buyPrice: priceNum,
      quantity: qtyNum,
    });

    setQuantity("");
    setErrorMessage("");
  };

  // Calculations
  let totalCost = 0;
  let totalCurrentValue = 0;

  holdings.forEach((hold) => {
    const liveAsset = assets[hold.symbol];
    const livePrice = liveAsset ? liveAsset.price : hold.buyPrice;
    totalCost += hold.buyPrice * hold.quantity;
    totalCurrentValue += livePrice * hold.quantity;
  });

  const netPL = totalCurrentValue - totalCost;
  const netPLPercent = totalCost > 0 ? (netPL / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Card Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Value */}
        <div className="bg-[#0b1329]/60 backdrop-blur-md border border-white/10 rounded-xl p-4.5 text-white flex justify-between items-center relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <span className="text-slate-400 text-xs font-bold block mb-1">Portföy Toplam Değeri</span>
            <span className="text-2xl font-extrabold font-mono text-white">
              {totalCurrentValue.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-semibold text-slate-300 ml-1">TL</span>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400 relative z-10">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-xl p-4.5 text-white flex justify-between items-center relative overflow-hidden shadow-xl">
          <div>
            <span className="text-slate-400 text-xs font-bold block mb-1">Toplam Maliyet</span>
            <span className="text-xl font-bold font-mono text-slate-200">
              {totalCost.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-slate-400 ml-1">TL</span>
          </div>
          <div className="p-2.5 bg-white/5 rounded-lg border border-white/5 text-slate-300">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Net Profit/Loss */}
        <div className={`border rounded-xl p-4.5 flex justify-between items-center shadow-xl backdrop-blur-md ${
          netPL >= 0 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          <div>
            <span className="text-slate-400 text-xs font-bold block mb-1">Net Kar / Zarar</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold font-mono">
                {netPL >= 0 ? "+" : ""}{netPL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-semibold">TL</span>
            </div>
            <span className="text-xs font-bold font-mono flex items-center mt-1">
              {netPL >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
              {netPL >= 0 ? "+" : ""}{netPLPercent.toFixed(2)}%
            </span>
          </div>
          <div className={`p-2.5 rounded-lg border ${
            netPL >= 0 
              ? "bg-emerald-500/20 border-emerald-500/30" 
              : "bg-rose-500/20 border-rose-500/30"
          }`}>
            {netPL >= 0 ? <ArrowUpRight className="w-5 h-5 text-emerald-400" /> : <ArrowDownRight className="w-5 h-5 text-rose-400" />}
          </div>
        </div>
      </div>

      {/* Main Section Grid: Holdings List and Add New Position Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-2">
        {/* Grid Left: Existing Holdings */}
        <div className="lg:col-span-8 glass-effect rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
            Mevcut Pozisyonlarım
          </h3>

          {holdings.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-xl bg-white/5">
              <Wallet className="w-8 h-8 text-slate-500 mx-auto mb-2 animate-bounce" />
              <p className="text-xs text-slate-300 font-bold">Bakiye girişi bulunamadı.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Sağdaki formu kullanarak ve senedinizi seçerek ilk portföy senedinizi ekleyin.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW (Table) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2">Varlık</th>
                      <th className="py-3 px-2 text-right">Ort. Maliyet</th>
                      <th className="py-3 px-2 text-right">Güncel Fiyat</th>
                      <th className="py-3 px-2 text-right">Miktar (Lot)</th>
                      <th className="py-3 px-2 text-right">Güncel Değer</th>
                      <th className="py-3 px-2 text-right">Fark / Getiri</th>
                      <th className="py-3 px-2 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {holdings.map((hold) => {
                      const liveAsset = assets[hold.symbol];
                      const activePrice = liveAsset ? liveAsset.price : hold.buyPrice;
                      const holdingCost = hold.buyPrice * hold.quantity;
                      const currentValue = activePrice * hold.quantity;
                      const pl = currentValue - holdingCost;
                      const plPercent = ((activePrice - hold.buyPrice) / hold.buyPrice) * 100;

                      return (
                        <tr key={hold.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-2 font-bold text-white">
                            <div className="flex flex-col">
                              <span className="font-mono">{hold.symbol}</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[120px] font-normal">
                                {liveAsset ? liveAsset.name : "Simüle Hisse"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono text-slate-300">
                            {hold.buyPrice.toFixed(2)} TL
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-bold text-white">
                            {activePrice.toFixed(2)} TL
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-semibold text-slate-300">
                            {hold.quantity.toLocaleString("tr-TR")}
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-bold text-white">
                            {currentValue.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TL
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-bold">
                            <div className={`flex flex-col items-end ${pl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              <span>{pl >= 0 ? "+" : ""}{pl.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL</span>
                              <span className="text-[10px] flex items-center">
                                {pl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                ({plPercent.toFixed(1)}%)
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <button
                              onClick={() => onRemoveHolding(hold.id)}
                              className="text-slate-400 hover:text-rose-450 p-1.5 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE VIEW (High-fidelity Cards) */}
              <div className="block md:hidden space-y-3">
                {holdings.map((hold) => {
                  const liveAsset = assets[hold.symbol];
                  const activePrice = liveAsset ? liveAsset.price : hold.buyPrice;
                  const holdingCost = hold.buyPrice * hold.quantity;
                  const currentValue = activePrice * hold.quantity;
                  const pl = currentValue - holdingCost;
                  const plPercent = ((activePrice - hold.buyPrice) / hold.buyPrice) * 100;

                  return (
                    <div 
                      key={hold.id} 
                      className="bg-[#0b1329]/40 border border-white/5 rounded-xl p-4 space-y-3.5 hover:border-white/10 transition"
                    >
                      {/* Card Header: Badge, Name and delete button */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-mono font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {hold.symbol}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-medium truncate max-w-[200px]">
                            {liveAsset ? liveAsset.name : "Simüle Hisse"}
                          </span>
                        </div>
                        <button
                          onClick={() => onRemoveHolding(hold.id)}
                          className="bg-white/5 hover:bg-rose-500/20 text-slate-450 hover:text-rose-400 p-2 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Card Metrics Grid */}
                      <div className="grid grid-cols-2 gap-3 text-left border-y border-white/5 py-3">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Ort. Maliyet</span>
                          <span className="text-xs font-bold font-mono text-slate-200">
                            {hold.buyPrice.toFixed(2)} TL
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Güncel Fiyat</span>
                          <span className="text-xs font-bold font-mono text-white">
                            {activePrice.toFixed(2)} TL
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Miktar (Lot)</span>
                          <span className="text-xs font-bold font-mono text-slate-200">
                            {hold.quantity.toLocaleString("tr-TR")} Loc
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Güncel Değer</span>
                          <span className="text-xs font-bold font-mono text-amber-400">
                            {currentValue.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TL
                          </span>
                        </div>
                      </div>

                      {/* Card Profit / Loss Performance Banner */}
                      <div className={`p-2 rounded-lg flex justify-between items-center text-xs font-bold font-mono ${
                        pl >= 0 
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" 
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                      }`}>
                        <span>Kar / Zarar:</span>
                        <span className="flex items-center gap-1 font-black">
                          {pl >= 0 ? "+" : ""}{pl.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL
                          <span>({plPercent >= 0 ? "+" : ""}{plPercent.toFixed(1)}%)</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Grid Right: Add Position Form */}
        <div className="lg:col-span-4 glass-effect rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-400" />
            Pozisyon Ekle (Yeni Alım)
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] text-slate-400 font-bold mb-1 block">Varlık & Güncel Canlı Fiyatı</label>
              <div className="w-full bg-[#0b1329]/60 border border-white/10 rounded-lg py-2.5 px-3 flex justify-between items-center text-xs font-bold text-slate-205">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-amber-400 font-black bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded text-[10px]">ALTIN.S1</span>
                  <span className="text-slate-300 font-semibold text-[11px] truncate max-w-[120px] sm:max-w-none">Altın Sertifikası</span>
                </div>
                <span className="font-mono font-black text-white text-xs whitespace-nowrap">
                  {assets["ALTIN.S1"] ? `${assets["ALTIN.S1"].price.toFixed(2)} TL` : "Yükleniyor..."}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-bold mb-1 block">Alış Fiyatı (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full glass-input-el rounded-lg py-2 pl-3 text-xs font-mono font-extrabold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-bold mb-1 block">Adet (Lot)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="100"
                  className="w-full glass-input-el rounded-lg py-2 pl-3 text-xs font-mono font-extrabold text-white focus:outline-none"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-[11px] text-rose-450 font-bold">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg py-2.5 text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Portföye Ekle
            </button>
          </form>

          {/* Education Mini Note */}
          <div className="border-t border-white/5 pt-4 mt-4 bg-white/5 p-3 rounded-lg flex items-start gap-2 text-[11px] text-slate-400 leading-snug">
            <HelpCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-extrabold text-slate-200 block">Nasıl Kullanılır?</span>
              <p className="mt-0.5 text-slate-400">Maliyet fiyatlarını ve lot miktarlarını gosterilen sekilde kaydederek anlık kâr/zarar performansınızı, komisyon veya senedi makas hesabı olmadan net olarak görebilirsiniz.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
