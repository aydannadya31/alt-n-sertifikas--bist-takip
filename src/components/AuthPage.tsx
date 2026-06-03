import React, { useState } from "react";
import { Mail, Lock, UserPlus, LogIn, KeyRound, ShieldCheck, Eye, EyeOff } from "lucide-react";

interface AuthPageProps {
  onLogin: (role: "user" | "admin", email: string) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "options">("email");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessageType("success");
        setMessage("Kayıt başarılı! Giriş yapabilirsiniz.");
        setMode("login");
      } else {
        setMessageType("error");
        setMessage(data.error || "Kayıt başarısız.");
      }
    } catch {
      setMessageType("error");
      setMessage("Sunucu hatası.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onLogin(data.role, data.user.email);
      } else {
        setMessageType("error");
        setMessage(data.error || "Giriş başarısız.");
      }
    } catch {
      setMessageType("error");
      setMessage("Sunucu hatası.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessageType("error");
      setMessage("E-posta adresinizi girin.");
      return;
    }
    setForgotStep("options");
    setMessage("");
  };

  const handleForgotOption = async (option: "send_old" | "reset") => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, option }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessageType("success");
        setMessage(data.message);
      } else {
        setMessageType("error");
        setMessage(data.error || "İşlem başarısız.");
      }
    } catch {
      setMessageType("error");
      setMessage("Sunucu hatası.");
    } finally {
      setLoading(false);
      setForgotStep("email");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 mb-8">
      <div className="glass-effect rounded-2xl p-6 sm:p-8 shadow-xl border border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">
              {mode === "login" ? "Giriş Yap" : mode === "register" ? "Kayıt Ol" : "Şifre Yardımı"}
            </h2>
            <p className="text-[11px] text-slate-400">
              {mode === "login"
                ? "AI Danışmanına erişmek için giriş yapın"
                : mode === "register"
                ? "Ücretsiz hesap oluşturun"
                : "Şifrenizi sıfırlayın"}
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`text-xs font-bold px-4 py-2.5 rounded-xl mb-4 ${
              messageType === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            {message}
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">E-posta / Kullanıcı Adı</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Şifre</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-white cursor-pointer">
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
            >
              {loading ? (
                "Giriş yapılıyor..."
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Giriş Yap
                </>
              )}
            </button>
            <div className="flex justify-between text-[10px]">
              <button type="button" onClick={() => { setMode("register"); setMessage(""); }} className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer">
                Hesabın yok mu? Kayıt Ol
              </button>
              <button type="button" onClick={() => { setMode("forgot"); setForgotStep("email"); setMessage(""); }} className="text-slate-400 hover:text-slate-300 font-bold cursor-pointer">
                Şifremi Unuttum
              </button>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">E-posta Adresi</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Şifre</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-white cursor-pointer">
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
            >
              {loading ? (
                "Kaydediliyor..."
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Kayıt Ol
                </>
              )}
            </button>
            <div className="flex justify-between text-[10px]">
              <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer">
                Zaten hesabın var mı? Giriş Yap
              </button>
              <button type="button" onClick={() => { setMode("forgot"); setForgotStep("email"); setMessage(""); }} className="text-slate-400 hover:text-slate-300 font-bold cursor-pointer">
                Şifremi Unuttum
              </button>
            </div>
          </form>
        )}

        {mode === "forgot" && (
          <div className="space-y-4">
            {forgotStep === "email" && (
              <form onSubmit={handleForgotEmail} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Kayıtlı E-posta Adresiniz</label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@mail.com"
                      className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" /> Devam Et
                </button>
                <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className="w-full text-center text-[10px] text-slate-400 hover:text-slate-300 font-bold cursor-pointer">
                  Giriş sayfasına dön
                </button>
              </form>
            )}

            {forgotStep === "options" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-bold text-center">
                  <KeyRound className="w-4 h-4 inline-block mr-1 text-amber-400" />
                  <span className="text-amber-400">{email}</span> için işlem seçin:
                </p>
                <button
                  onClick={() => handleForgotOption("send_old")}
                  disabled={loading}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
                >
                  <Mail className="w-4 h-4 text-amber-400" />
                  Eski şifremi mail adresime gönder
                </button>
                <button
                  onClick={() => handleForgotOption("reset")}
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
                >
                  <KeyRound className="w-4 h-4" />
                  Şifremi sıfırla ve mail adresime yeni şifre gönder
                </button>
                <button
                  onClick={() => { setForgotStep("email"); setMessage(""); }}
                  className="w-full text-center text-[10px] text-slate-400 hover:text-slate-300 font-bold cursor-pointer"
                >
                  Geri dön
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className="text-[9px] text-slate-500">
            Admin girişi için &quot;admin&quot; kullanıcı adı ile giriş yapın.
          </p>
        </div>
      </div>
    </div>
  );
}
