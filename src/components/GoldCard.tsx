/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Coins, HelpCircle, ArrowRightLeft, TrendingUp, TrendingDown, Percent } from "lucide-react";
import { StockInfo } from "../types";

interface GoldCardProps {
  goldCertificate: StockInfo;
  spotGramGold: number;
}

export default function GoldCard({ goldCertificate, spotGramGold }: GoldCardProps) {
  const [certCount, setCertCount] = useState<string>("500");
  const [gramWeight, setGramWeight] = useState<string>("5");
  const [activeUnit, setActiveUnit] = useState<"certToGram" | "gramToCert">("certToGram");

  // Calculations
  const calculatedGrams = (parseFloat(certCount) || 0) * 0.01;
  const calculatedValueFromCert = (parseFloat(certCount) || 0) * goldCertificate.price;

  const calculatedCerts = (parseFloat(gramWeight) || 0) * 100;
  const calculatedValueFromGrams = calculatedCerts * goldCertificate.price;

  // physical gold market comparison
  // Jewelers usually apply a 4-5% spread (premium) on retail gold, while ALTIN.S1 trades at very tight spreads!
  const physicalPremiumValue = calculatedValueFromCert * 1.042;
  const potentialSavings = physicalPremiumValue - calculatedValueFromCert;

  return (
    <div className="glass-gold-card rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Decorative Gold Glow Elements */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-500/15 text-amber-400 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-amber-500/35">
              {goldCertificate.symbol}
            </span>
            <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" /> Darphane Güvencesi
            </span>
          </div>
          <h2 className="text-xl font-bold text-white font-sans tracking-tight">
            Darphane Altın Sertifikası
          </h2>
          <p className="text-xs text-slate-350 leading-snug">
            Borsa İstanbul'da işlem gören, fiziki karşılığı olan vergi muafiyetli altın senedi.
          </p>
        </div>
      </div>

      {/* Grid: Financial Stats & Interactive Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Stats Section */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-white/5 p-4.5 rounded-xl border border-white/5">
          <div>
            <span className="text-xs text-slate-400 font-bold">Güncel Sertifika Fiyatı</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold font-mono text-amber-400">
                {goldCertificate.price.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-slate-300">TL</span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ml-2 ${
                goldCertificate.change >= 0 
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                  : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
              }`}>
                {goldCertificate.change >= 0 ? <TrendingUp className="w-3" /> : <TrendingDown className="w-3" />}
                {goldCertificate.change >= 0 ? "+" : ""}{goldCertificate.change}%
              </span>
            </div>
            <p className="text-[11px] text-slate-450 mt-1 font-mono">
              1 Lot Sertifika = 0.01 Gram Saf Altın (24 Ayar)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-4">
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Günlük Aralık</span>
              <span className="text-xs font-bold font-mono text-slate-200">
                {goldCertificate.low.toFixed(2)} - {goldCertificate.high.toFixed(2)} TL
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Spot Gr. Altın (Piyasa)</span>
              <span className="text-xs font-bold font-mono text-amber-400">
                {spotGramGold.toFixed(2)} TL
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Günlük İşlem Hacmi</span>
              <span className="text-xs font-bold font-mono text-slate-200">
                {goldCertificate.volume}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Vergi (Stopaj) Oranı</span>
              <span className="text-xs font-bold font-mono text-emerald-400 flex items-center">
                <Percent className="w-3 h-3 mr-0.5" /> 0 (Sıfır Stopaj)
              </span>
            </div>
          </div>
        </div>

        {/* Right Conversion Section */}
        <div className="lg:col-span-7 bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" /> Sertifika & Altın Dönüştürücü
            </span>
            <div className="flex gap-1 bg-white/5 p-0.5 rounded border border-white/5">
              <button
                onClick={() => setActiveUnit("certToGram")}
                className={`text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  activeUnit === "certToGram"
                    ? "bg-amber-500 text-slate-950 font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sertifika → Gram
              </button>
              <button
                onClick={() => setActiveUnit("gramToCert")}
                className={`text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  activeUnit === "gramToCert"
                    ? "bg-amber-500 text-slate-950 font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Gram → Sertifika
              </button>
            </div>
          </div>

          {activeUnit === "certToGram" ? (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Sertifika Miktarı (Adet)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={certCount}
                    onChange={(e) => setCertCount(e.target.value)}
                    placeholder="Adet girin"
                    className="w-full glass-input-el rounded-lg py-2 pl-3 pr-16 text-sm font-bold font-mono text-white focus:outline-none"
                  />
                  <div className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">LOT</div>
                </div>
              </div>

              {/* Translation equivalents values */}
              <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/10 grid grid-cols-2 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Fiziki Altın Eşdeğeri</span>
                  <span className="text-sm font-bold font-mono text-amber-450">
                    {calculatedGrams.toFixed(2)} gr
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Mevcut BIST Değeri</span>
                  <span className="text-sm font-bold font-mono text-slate-100">
                    {calculatedValueFromCert.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Arzulanılan Altın (Gram)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={gramWeight}
                    onChange={(e) => setGramWeight(e.target.value)}
                    placeholder="Gram olarak girin"
                    className="w-full glass-input-el rounded-lg py-2 pl-3 pr-16 text-sm font-bold font-mono text-white focus:outline-none"
                  />
                  <div className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">GRAM</div>
                </div>
              </div>

              <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/10 grid grid-cols-2 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Gerekli Sertifika Miktarı</span>
                  <span className="text-sm font-bold font-mono text-amber-450">
                    {calculatedCerts.toFixed(0)} Lot
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Mevcut BIST Değeri</span>
                  <span className="text-sm font-bold font-mono text-slate-100">
                    {calculatedValueFromGrams.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Jeweler comparisons banner */}
          <div className="mt-3.5 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 text-[11px] text-left">
            <div className="text-slate-300 font-medium">
              Kuyumcuda tahmini maliyet: <span className="font-mono text-rose-400 font-bold">{(physicalPremiumValue).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL</span>
            </div>
            <div className="font-bold text-emerald-400 font-mono">
              ~{potentialSavings.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL BIST Kazancı!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
