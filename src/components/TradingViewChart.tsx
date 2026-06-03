import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    TradingView: any;
  }
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

interface TradingViewChartProps {
  symbol: string;
}

let tvScriptLoaded = false;

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    const tvSymbol = SYMBOL_MAP[symbol] || "BIST:ALTIN";

    const createWidget = () => {
      if (!window.TradingView || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      const containerId = "tv-chart-" + Math.random().toString(36).substr(2, 5);
      const div = document.createElement("div");
      div.id = containerId;
      div.style.height = "100%";
      div.style.width = "100%";
      containerRef.current.appendChild(div);

      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: "D",
        timezone: "Europe/Istanbul",
        theme: "dark",
        style: "1",
        locale: "tr_TR",
        toolbar_bg: "#0f1729",
        enable_publishing: false,
        allow_symbol_change: false,
        container_id: containerId,
        hide_top_toolbar: false,
        save_image: false,
        studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
        backgroundColor: "#020617",
        gridColor: "#1e293b",
        borderColor: "#334155",
        loading_screen: { backgroundColor: "#020617" },
      });
    };

    if (!tvScriptLoaded) {
      tvScriptLoaded = true;
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
      <div ref={containerRef} style={{ height: "480px", width: "100%" }} />
    </div>
  );
}
