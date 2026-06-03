import React, { useEffect, useRef } from "react";

interface TechnicalAnalysisProps {
  symbol: string;
}

const SYMBOL_MAP: Record<string, string> = {
  "ALTIN.S1": "BIST:ALTIN",
  "THYAO": "BIST:THYAO",
  "ASELS": "BIST:ASELS",
  "EREGL": "BIST:EREGL",
  "TUPRS": "BIST:TUPRS",
  "BIMAS": "BIST:BIMAS",
  "GARAN": "BIST:GARAN",
  "KCHOL": "BIST:KCHOL",
  "SAHOL": "BIST:SAHOL",
  "KOZAL": "BIST:KOZAL",
};

let taScriptLoaded = false;

export default function TechnicalAnalysis({ symbol }: TechnicalAnalysisProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    const tvSymbol = SYMBOL_MAP[symbol] || "BIST:ALTIN";

    const createWidget = () => {
      if (!window.TradingView || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      const containerId = "tv-ta-" + Math.random().toString(36).substr(2, 5);
      const div = document.createElement("div");
      div.id = containerId;
      containerRef.current.appendChild(div);

      widgetRef.current = new window.TradingView.TechnicalAnalysis({
        symbol: tvSymbol,
        interval: "1m",
        width: "100%",
        isTransparent: false,
        height: 420,
        locale: "tr_TR",
        colorTheme: "dark",
        container_id: containerId,
      });
    };

    if (!taScriptLoaded) {
      taScriptLoaded = true;
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = createWidget;
      document.head.appendChild(script);
    } else {
      createWidget();
    }

    return () => {
      widgetRef.current = null;
    };
  }, [symbol]);

  return (
    <div className="glass-effect rounded-2xl p-2 sm:p-3 shadow-xl border border-white/5">
      <div className="text-[11px] text-slate-400 font-bold mb-2 px-1 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        Teknik Analiz — {symbol}
      </div>
      <div ref={containerRef} style={{ width: "100%", minHeight: "420px" }} />
    </div>
  );
}
