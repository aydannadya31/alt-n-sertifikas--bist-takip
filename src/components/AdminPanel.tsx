import React, { useState, useEffect } from "react";
import { ShieldCheck, Trash2, Edit3, X, Save, RefreshCw, Mail, Eye, EyeOff, Users } from "lucide-react";

interface StoredUser {
  id: string;
  email: string;
  password: string;
  createdAt: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const adminUser = "admin";
  const adminPass = "Ag1453ag!";

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUser, adminPass }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        setMessageType("error");
        setMessage(data.error || "Kullanıcılar alınamadı.");
      }
    } catch {
      setMessageType("error");
      setMessage("Sunucu hatası.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdate = async (userId: string) => {
    setMessage("");
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUser, adminPass, userId, newEmail: editEmail, newPassword: editPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setMessageType("success");
        setMessage("Kullanıcı güncellendi.");
        setEditingId(null);
        fetchUsers();
      } else {
        setMessageType("error");
        setMessage(data.error || "Güncelleme başarısız.");
      }
    } catch {
      setMessageType("error");
      setMessage("Sunucu hatası.");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    setMessage("");
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUser, adminPass, userId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessageType("success");
        setMessage("Kullanıcı silindi.");
        fetchUsers();
      } else {
        setMessageType("error");
        setMessage(data.error || "Silme başarısız.");
      }
    } catch {
      setMessageType("error");
      setMessage("Sunucu hatası.");
    }
  };

  const startEdit = (user: StoredUser) => {
    setEditingId(user.id);
    setEditEmail(user.email);
    setEditPassword(user.password);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 mb-8">
      <div className="glass-effect rounded-2xl p-5 sm:p-6 shadow-xl border border-white/5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Yönetim Paneli</h2>
              <p className="text-[11px] text-slate-400">Kayıtlı kullanıcıları yönetin</p>
            </div>
          </div>
          <button
            onClick={fetchUsers}
            className="bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 p-2 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
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

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-bold">Kullanıcılar yükleniyor...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-bold">Henüz kayıtlı kullanıcı yok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="text-left py-2.5 px-2">#</th>
                  <th className="text-left py-2.5 px-2">E-posta</th>
                  <th className="text-left py-2.5 px-2">Şifre</th>
                  <th className="text-left py-2.5 px-2 hidden sm:table-cell">Kayıt Tarihi</th>
                  <th className="text-right py-2.5 px-2">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    {editingId === user.id ? (
                      <>
                        <td className="py-2.5 px-2 text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-2.5 px-2">
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full bg-white/10 border border-white/10 rounded px-2 py-1 text-white font-bold text-[11px] focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1">
                            <input
                              type={showPasswords[user.id] ? "text" : "password"}
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              className="flex-1 bg-white/10 border border-white/10 rounded px-2 py-1 text-white font-bold text-[11px] focus:outline-none"
                            />
                            <button
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-slate-400 hover:text-white cursor-pointer flex-shrink-0"
                            >
                              {showPasswords[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 hidden sm:table-cell">
                          {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleUpdate(user.id)}
                              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 p-1.5 rounded-lg transition cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="bg-white/5 hover:bg-white/10 text-slate-400 p-1.5 rounded-lg transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 px-2 text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-2.5 px-2 font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            {user.email}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-slate-200 font-bold">
                              {showPasswords[user.id] ? user.password : "••••••••"}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              {showPasswords[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 hidden sm:table-cell">
                          {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(user)}
                              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 p-1.5 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 p-1.5 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-white/5 text-[9px] text-slate-500 text-center">
          Toplam {users.length} kayıtlı kullanıcı
        </div>
      </div>
    </div>
  );
}
