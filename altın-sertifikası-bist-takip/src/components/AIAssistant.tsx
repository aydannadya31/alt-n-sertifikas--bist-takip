/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, Send, Bot, RefreshCw, Bookmark, Globe, ArrowRight, MessageSquare, ShieldCheck } from "lucide-react";
import { HoldingItem } from "../types";

interface AIAssistantProps {
  holdings: HoldingItem[];
  watchlist: string[];
}

export default function AIAssistant({ holdings, watchlist }: AIAssistantProps) {
  // States
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);

  // Preset Questions
  const PRESETS = [
    "Darphane Altın Sertifikası (ALTIN.S1) vergi/stopaj avantajı nedir?",
    "ALTIN.S1 fiziki altına nasıl dönüştürülür, kaç lot gerekir?",
    "Altın Sertifikası mı almak daha mantıklı, fonlar mı?",
    "BIST'te altın sertifikasının alım-satım makas aralığı avantajı ne?"
  ];

  // Request Portfoio Analysis
  const handlePortfolioAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysis("");
    try {
      const response = await fetch("/api/analyst/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolio: holdings.map(h => ({
            symbol: h.symbol,
            buyPrice: h.buyPrice,
            quantity: h.quantity
          })),
          watchlist: watchlist
        })
      });
      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setAnalysis(data.fallbackAnalysis || "Analiz tamamlanamadı.");
      }
    } catch (err) {
      setAnalysis("⚠️ Sunucu ile bağlantı sağlanamadı. Lütfen backend sunucusunun aktif olduğunu kontrol edin.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Custom Question
  const handleAskQuestion = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsAnswering(true);
    setAnswer("");
    setSources([]);
    try {
      const response = await fetch("/api/analyst/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: queryText })
      });
      const data = await response.json();
      setAnswer(data.answer);
      if (data.sources) {
        setSources(data.sources);
      }
    } catch (err) {
      setAnswer("⚠️ Soru iletilirken hata oluştu. Sunucu bağlantınızı kontrol edin.");
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Portfolio Check-Up Column */}
      <div className="xl:col-span-5 glass-effect rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 bg-indigo-500/10 border border-indigo-500/15 rounded-xl text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-white font-sans">
                Yapay Zeka Portföy Raporu
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Maliyet dağılımınızı ve altın güvencesini anında check-up yapın.
              </p>
            </div>
          </div>

          <div className="bg-[#090f23]/60 p-4 rounded-xl border border-white/5 text-xs text-slate-300 my-4 leading-relaxed max-h-96 overflow-y-auto">
            {analysis ? (
              <div className="space-y-3 prose max-w-none text-slate-200 font-medium">
                {analysis.split("\n\n").map((para, i) => {
                  if (para.startsWith("###")) {
                    return <h4 key={i} className="text-sm font-extrabold text-amber-450 mt-3 mb-1">{para.replace("### ", "")}</h4>;
                  }
                  if (para.startsWith("-") || para.startsWith("*")) {
                    return (
                      <ul key={i} className="list-disc pl-4 space-y-1 my-1">
                        {para.split("\n").map((li, j) => (
                          <li key={j}>{li.replace(/^[-\*\s]+/, "")}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={i}>{para}</p>;
                })}
              </div>
            ) : (
              <div className="text-center py-10 space-y-3.5">
                <Bot className="w-10 h-10 text-indigo-400/80 mx-auto animate-bounce" />
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-200">Portföyünüz Nasıl Duruyor?</p>
                  <p className="text-[11px] text-slate-400">Risk derecenizi, BIST 100 hisse sepetiniz ile Darphane Altın dengesini loto bazlı ölçer.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handlePortfolioAnalysis}
          disabled={isAnalyzing}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 cursor-pointer rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-45"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              Sektörler Analiz Ediliyor...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              Yatırımımı Güvenceye Al (Ücretsiz Portföy Check-Up)
            </>
          )}
        </button>
      </div>

      {/* Grounded Financial Q&A Column */}
      <div className="xl:col-span-7 glass-effect rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Bot className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-white font-sans">
                Google Arama Destekli BIST & Altın Asistanı
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Mevzuat kurallarını, vergi durumlarını ve altın şartlarını canlı arama ile doğrulatın.
              </p>
            </div>
          </div>

          {/* Quick Presets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuestion(preset);
                  handleAskQuestion(preset);
                }}
                className="text-left text-[11px] bg-white/5 hover:bg-white/10 border border-white/5 p-2.5 rounded-xl transition text-slate-300 hover:text-white leading-snug cursor-pointer font-bold font-sans"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Answer Panel */}
          {answer && (
            <div className="bg-[#090f23]/60 p-4 rounded-xl border border-white/5 mb-4 max-h-56 overflow-y-auto">
              <div className="flex items-start gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400 mt-0.5" />
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Yapay Zeka Yanıtı</span>
              </div>
              <div className="text-xs text-slate-200 leading-relaxed space-y-2.5 font-medium">
                {answer.split("\n\n").map((para, i) => {
                  if (para.startsWith("###")) {
                    return <h4 key={i} className="text-sm font-extrabold text-amber-400 mt-3 mb-1">{para.replace("### ", "")}</h4>;
                  }
                  if (para.startsWith("-") || para.startsWith("*")) {
                    return (
                      <ul key={i} className="list-disc pl-4 space-y-1">
                        {para.split("\n").map((li, j) => (
                          <li key={j}>{li.replace(/^[-\*\s]+/, "")}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={i}>{para}</p>;
                })}
              </div>

              {/* URL Grounding Resources */}
              {sources.length > 0 && (
                <div className="border-t border-white/5 pt-3.5 mt-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-400" /> Yapay Zekanın Yararlandığı Doğrulanmış Kaynaklar
                  </span>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-400 font-bold transition flex items-center gap-1.5"
                      >
                        <Globe className="w-3 h-3 text-emerald-400" />
                        {src.title || "Kaynak Web Adresi"}
                        <ArrowRight className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isAnswering && (
            <div className="text-center py-6 bg-[#090f23]/60 rounded-xl border border-white/5 mb-4 animate-pulse">
              <Bot className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-1.5" />
              <span className="text-[10px] text-slate-300 font-bold">Borsa İstanbul ve Darphane mevzuatları canlı aranıyor...</span>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAskQuestion(question);
            }}
            placeholder="Altın Sertifikası vergilendirmesi, BIST saatleri..."
            className="flex-1 glass-input-el rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:outline-none"
          />
          <button
            onClick={() => handleAskQuestion(question)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl p-2.5 transition flex-shrink-0 cursor-pointer shadow-lg"
          >
            <Send className="w-4 h-4 text-slate-950 stroke-[3px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
