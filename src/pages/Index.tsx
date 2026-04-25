import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const HERO_IMG = "https://cdn.poehali.dev/projects/69eda840-7284-4645-a209-b149cacb54ce/files/b0753bb1-e385-447c-8017-7bda1254a1ec.jpg";
const SUPPORT_EMAIL = "usertophit49@gmail.com";
const CRYPTO_WALLET = "UQDz2ihzBbSH1gAtCXFdNSimLpmwEwKD8OIlv7t46KDofROf";

const API = {
  auth: "https://functions.poehali.dev/307eed25-8891-400b-8504-61269ef603cd",
  orders: "https://functions.poehali.dev/69b56b08-d523-44d0-b400-cd158e8a831a",
  verifyPayment: "https://functions.poehali.dev/a402843e-b9ec-4a6e-9b0e-454b67e3d0d7",
  mods: "https://functions.poehali.dev/46981288-9ee5-442c-ac11-e889ff415eef",
};

async function apiFetch(url: string, opts?: RequestInit) {
  const t = localStorage.getItem("pbsu_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (t) headers["X-Auth-Token"] = t;
  const res = await fetch(url, { ...opts, headers: { ...headers, ...(opts?.headers || {}) } });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: { error: text } }; }
}

type Page = "home" | "free" | "paid" | "search" | "upload" | "profile";

interface Mod {
  id: number; title: string; description: string; game: string;
  category: string; price: number; rating: number; downloads: number;
  cover_url: string; file_name: string;
}
interface User { id: number; username: string; email: string; }
interface Order {
  id: number; mod_id: number; payment_method: string; amount: number;
  status: string; created_at: string; mod_title: string; file_name: string; file_url: string | null;
}

export default function Index() {
  const [page, setPage] = useState<Page>("home");
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [authModal, setAuthModal] = useState<"" | "login" | "register">("");
  const [authForm, setAuthForm] = useState({ username: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [payMod, setPayMod] = useState<Mod | null>(null);
  const [payMethod, setPayMethod] = useState<"transfer" | "crypto">("transfer");
  const [payStep, setPayStep] = useState<"choose" | "info" | "upload" | "checking" | "done" | "rejected" | "manual">("choose");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [payVerdict, setPayVerdict] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [uploadForm, setUploadForm] = useState({ title: "", game: "PBSU", category: "Текстуры", description: "", price: "0" });

  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadMods();
    if (localStorage.getItem("pbsu_token")) checkMe();
  }, []);

  async function loadMods(search = "", category = "", price = "") {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category && category !== "all") params.set("category", category);
    if (price && price !== "all") params.set("price", price);
    const res = await apiFetch(`${API.mods}?${params}`);
    if (res.ok) setMods(res.data.mods || []);
    setLoading(false);
  }

  async function checkMe() {
    const res = await apiFetch(API.auth, { method: "POST", body: JSON.stringify({ action: "me" }) });
    if (res.ok) setUser(res.data.user);
    else logout();
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const body = authModal === "login"
      ? { action: "login", email: authForm.email, password: authForm.password }
      : { action: "register", username: authForm.username, email: authForm.email, password: authForm.password };
    const res = await apiFetch(API.auth, { method: "POST", body: JSON.stringify(body) });
    setAuthLoading(false);
    if (res.ok) {
      localStorage.setItem("pbsu_token", res.data.token);
      setUser(res.data.user);
      setAuthModal("");
      setAuthForm({ username: "", email: "", password: "" });
    } else {
      setAuthError(res.data.error || "Ошибка");
    }
  }

  function logout() {
    localStorage.removeItem("pbsu_token");
    setUser(null);
    setMyOrders([]);
  }

  async function loadMyOrders() {
    setOrdersLoading(true);
    const res = await apiFetch(API.orders, { method: "POST", body: JSON.stringify({ action: "my_orders" }) });
    if (res.ok) setMyOrders(res.data.orders || []);
    setOrdersLoading(false);
  }

  useEffect(() => {
    if (page === "profile" && user) loadMyOrders();
  }, [page, user]);

  async function handleBuy(mod: Mod) {
    setPayMod(mod);
    setPayStep(mod.price === 0 ? "info" : "choose");
    setPayMethod("transfer");
    setOrderId(null);
    setPayVerdict("");
    setScreenshotFile(null);
    setScreenshotName("");
  }

  async function handleCreateOrder() {
    if (!payMod) return;
    const res = await apiFetch(API.orders, {
      method: "POST",
      body: JSON.stringify({ action: "create", mod_id: payMod.id, payment_method: payMod.price === 0 ? "free" : payMethod })
    });
    if (res.ok) {
      setOrderId(res.data.order_id);
      if (payMod.price === 0) setPayStep("done");
      else setPayStep("info");
    }
  }

  async function handleUploadScreenshot() {
    if (!screenshotFile || !orderId) return;
    setUploadingScreenshot(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const ext = screenshotFile.name.split(".").pop() || "jpg";
      await apiFetch(API.orders, {
        method: "POST",
        body: JSON.stringify({ action: "upload_screenshot", order_id: orderId, image_data: base64, image_ext: ext })
      });
      setUploadingScreenshot(false);
      setPayStep("checking");
      verifyTimerRef.current = setTimeout(() => pollVerify(), 5000);
    };
    reader.readAsDataURL(screenshotFile);
  }

  async function pollVerify() {
    if (!orderId) return;
    const res = await apiFetch(API.verifyPayment, {
      method: "POST",
      body: JSON.stringify({ order_id: orderId })
    });
    if (res.ok) {
      const { status, verdict } = res.data;
      setPayVerdict(verdict || "");
      if (status === "approved") { setPayStep("done"); loadMyOrders(); }
      else if (status === "rejected") setPayStep("rejected");
      else if (status === "manual_review") setPayStep("manual");
      else verifyTimerRef.current = setTimeout(() => pollVerify(), 8000);
    } else {
      verifyTimerRef.current = setTimeout(() => pollVerify(), 10000);
    }
  }

  function downloadFile(fileName: string) {
    const a = document.createElement("a");
    a.href = `/mods/${fileName}`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  const filteredMods = mods.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || m.title.toLowerCase().includes(q) || m.game.toLowerCase().includes(q);
    const matchCat = filterCategory === "all" || m.category === filterCategory;
    const matchPrice = priceFilter === "all" || (priceFilter === "free" && m.price === 0) || (priceFilter === "paid" && m.price > 0);
    return matchSearch && matchCat && matchPrice;
  });

  const freeMods = mods.filter(m => m.price === 0);
  const paidMods = mods.filter(m => m.price > 0);
  const categories = [...new Set(mods.map(m => m.category))];

  function closePayModal() {
    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    setPayMod(null); setPayStep("choose"); setOrderId(null);
    setScreenshotFile(null); setScreenshotName(""); setPayVerdict("");
  }

  const nav: { id: Page; label: string; icon: string }[] = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "free", label: "Бесплатные", icon: "Download" },
    { id: "paid", label: "Платные", icon: "ShoppingCart" },
    { id: "search", label: "Поиск", icon: "Search" },
    { id: "upload", label: "Публикация", icon: "Upload" },
    { id: "profile", label: user ? user.username : "Кабинет", icon: "User" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-dark)]">
      {/* NAV */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage("home")}>
            <div className="w-8 h-8 rounded border border-[var(--neon-green)] flex items-center justify-center" style={{ boxShadow: "0 0 10px #00ff8840" }}>
              <span style={{ color: "var(--neon-green)", fontFamily: "Rajdhani,sans-serif", fontWeight: 700, fontSize: "0.75rem" }}>PB</span>
            </div>
            <span style={{ fontFamily: "Rajdhani,sans-serif", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.1em", color: "white" }}>
              PBSU<span className="neon-text">MODS</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {nav.map(n => (
              <span key={n.id} className={`nav-link ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>{n.label}</span>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <button className="neon-btn px-4 py-1.5 rounded text-sm hidden md:flex items-center gap-2" onClick={logout}>
                <Icon name="LogOut" size={14} />Выйти
              </button>
            ) : (
              <button className="neon-btn-filled px-4 py-1.5 rounded text-sm hidden md:block"
                onClick={() => { setAuthModal("login"); setAuthError(""); }}>Войти</button>
            )}
            <button className="md:hidden text-white/60" onClick={() => setMobileMenu(!mobileMenu)}>
              <Icon name="Menu" size={22} />
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden glass border-t border-white/5 px-4 py-3 flex flex-col gap-3">
            {nav.map(n => (
              <span key={n.id} className={`nav-link flex items-center gap-2 ${page === n.id ? "active" : ""}`}
                onClick={() => { setPage(n.id); setMobileMenu(false); }}>
                <Icon name={n.icon} size={14} />{n.label}
              </span>
            ))}
            {user
              ? <button className="neon-btn px-4 py-2 rounded text-sm text-left" onClick={() => { logout(); setMobileMenu(false); }}>Выйти</button>
              : <button className="neon-btn-filled px-4 py-2 rounded text-sm text-left"
                  onClick={() => { setAuthModal("login"); setMobileMenu(false); }}>Войти / Регистрация</button>
            }
          </div>
        )}
      </header>

      {/* HOME */}
      {page === "home" && (
        <div>
          <div className="relative h-[500px] overflow-hidden">
            <img src={HERO_IMG} alt="PBSU Mods" className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f50] to-[#0a0a0f]" />
            <div className="absolute inset-0 grid-bg opacity-50" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <div className="text-xs tracking-[0.35em] neon-text mb-4 animate-fade-in" style={{ fontFamily: "Rajdhani,sans-serif" }}>◈ МАРКЕТПЛЕЙС МОДОВ ДЛЯ PBSU ◈</div>
              <h1 className="font-bold text-5xl md:text-7xl text-white tracking-tight mb-4 animate-fade-in"
                style={{ fontFamily: "Rajdhani,sans-serif", animationDelay: "0.1s", opacity: 0 }}>
                PBSU<span className="neon-text">MODS</span>
              </h1>
              <p className="text-white/60 text-lg max-w-2xl mb-3 animate-fade-in" style={{ animationDelay: "0.15s", opacity: 0 }}>
                Моды для автобусного симулятора PBSU — текстуры, маршруты, карты, звуки и геймплей
              </p>
              <p className="text-white/30 text-sm mb-8 animate-fade-in" style={{ animationDelay: "0.2s", opacity: 0 }}>
                Оплата банковским переводом или TON-криптой · Мгновенный доступ после AI-проверки
              </p>
              <div className="flex flex-wrap gap-3 justify-center animate-fade-in" style={{ animationDelay: "0.25s", opacity: 0 }}>
                <button className="neon-btn-filled px-8 py-3 rounded text-base" onClick={() => setPage("free")}>Бесплатные моды</button>
                <button className="neon-btn-pink px-8 py-3 rounded text-base" onClick={() => setPage("paid")}>Платные моды</button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Всего модов", value: `${mods.length}`, icon: "Package" },
              { label: "Бесплатных", value: `${freeMods.length}`, icon: "Download" },
              { label: "Платных", value: `${paidMods.length}`, icon: "ShoppingCart" },
              { label: "Игра", value: "PBSU", icon: "Bus" },
            ].map(s => (
              <div key={s.label} className="mod-card rounded-lg p-5 text-center">
                <Icon name={s.icon} size={22} className="neon-text mx-auto mb-2" />
                <div className="font-bold text-2xl text-white" style={{ fontFamily: "Rajdhani,sans-serif" }}>{s.value}</div>
                <div className="text-white/40 text-sm">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="max-w-7xl mx-auto px-4 mb-8">
            <div className="rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between"
              style={{ background: "linear-gradient(135deg, #00ff8808, #ff006605)", border: "1px solid #00ff8818" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#00ff8815" }}>
                  <Icon name="Shield" size={20} className="neon-text" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm" style={{ fontFamily: "Rajdhani,sans-serif" }}>AI-ПРОВЕРКА ОПЛАТЫ ЗА 30–60 СЕК</div>
                  <div className="text-white/40 text-xs">Загрузи скриншот — нейросеть проверяет автоматически и выдаёт доступ</div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: "#ffffff06", border: "1px solid #ffffff10" }}>
                  <Icon name="Banknote" size={13} className="text-white/40" />
                  <span className="text-white/50 text-xs" style={{ fontFamily: "Rajdhani,sans-serif" }}>ПЕРЕВОД</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: "#ffffff06", border: "1px solid #ffffff10" }}>
                  <Icon name="Coins" size={13} className="text-white/40" />
                  <span className="text-white/50 text-xs" style={{ fontFamily: "Rajdhani,sans-serif" }}>TON КРИПТА</span>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title text-white">🚌 Моды для PBSU</h2>
              <button className="nav-link text-sm" onClick={() => setPage("search")}>Поиск →</button>
            </div>
            <ModsGrid mods={mods} onBuy={handleBuy} loading={loading} />
          </div>
        </div>
      )}

      {/* FREE */}
      {page === "free" && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="section-title text-white mb-1">Бесплатные моды</h2>
          <p className="text-white/40 mb-6 text-sm">Скачивай без оплаты. Регистрация не обязательна.</p>
          <ModsGrid mods={freeMods} onBuy={handleBuy} loading={loading} />
        </div>
      )}

      {/* PAID */}
      {page === "paid" && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="section-title text-white mb-1">Платные моды</h2>
          <p className="text-white/40 mb-6 text-sm">Оплата переводом или TON-криптой. Доступ после AI-проверки скриншота.</p>
          <ModsGrid mods={paidMods} onBuy={handleBuy} loading={loading} />
        </div>
      )}

      {/* SEARCH */}
      {page === "search" && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="section-title text-white mb-6">Поиск модов</h2>
          <div className="relative mb-4">
            <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input className="w-full rounded-lg pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none transition-all"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
              placeholder="Название мода..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3 mb-6">
            <select className="rounded-lg px-4 py-2 text-sm focus:outline-none cursor-pointer text-white/70"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
              value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">Все категории</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              {(["all", "free", "paid"] as const).map(f => (
                <button key={f} className={`px-4 py-2 rounded-lg text-sm transition-all ${priceFilter === f ? "neon-btn-filled" : "neon-btn"}`}
                  onClick={() => setPriceFilter(f)}>
                  {f === "all" ? "Все" : f === "free" ? "Бесплатные" : "Платные"}
                </button>
              ))}
            </div>
          </div>
          <div className="text-white/30 text-sm mb-4" style={{ fontFamily: "Rajdhani,sans-serif" }}>Найдено: {filteredMods.length}</div>
          <ModsGrid mods={filteredMods} onBuy={handleBuy} loading={loading} />
        </div>
      )}

      {/* UPLOAD */}
      {page === "upload" && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="section-title text-white mb-2">Опубликовать мод</h2>
          <p className="text-white/40 mb-8 text-sm">Поделись своим модом для PBSU с сообществом</p>
          <div className="space-y-5">
            {[{ label: "Название мода *", key: "title", placeholder: "PBSU Ultra HD Pack..." }, { label: "Игра", key: "game", placeholder: "PBSU" }].map(f => (
              <div key={f.key}>
                <label className="block text-white/50 text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "Rajdhani,sans-serif" }}>{f.label}</label>
                <input className="w-full rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-all"
                  style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
                  value={uploadForm[f.key as keyof typeof uploadForm]}
                  onChange={e => setUploadForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} />
              </div>
            ))}
            <div>
              <label className="block text-white/50 text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "Rajdhani,sans-serif" }}>Категория</label>
              <select className="w-full rounded-lg px-4 py-3 text-white/80 focus:outline-none cursor-pointer"
                style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
                value={uploadForm.category} onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}>
                {["Текстуры", "Маршруты", "Карты", "Звуки", "Геймплей", "Другое"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "Rajdhani,sans-serif" }}>Описание</label>
              <textarea rows={4} className="w-full rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none resize-none transition-all"
                style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
                placeholder="Что делает этот мод..." value={uploadForm.description}
                onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "Rajdhani,sans-serif" }}>Цена в ₽ (0 = бесплатно)</label>
              <input type="number" min={0} className="w-full rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-all"
                style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
                value={uploadForm.price} onChange={e => setUploadForm(p => ({ ...p, price: e.target.value }))} />
            </div>
            <label className="block border-2 border-dashed border-white/10 hover:border-[var(--neon-green)] rounded-lg p-8 text-center cursor-pointer transition-all">
              <input type="file" className="hidden" accept=".zip,.rar,.7z" />
              <Icon name="Upload" size={32} className="text-white/20 mx-auto mb-3" />
              <div className="text-white/40 text-sm">Перетащи файл мода или <span className="neon-text">нажми для выбора</span></div>
              <div className="text-white/20 text-xs mt-1">.zip, .rar, .7z — до 500 МБ</div>
            </label>
            <button className="neon-btn-filled w-full py-3 rounded-lg text-base">Опубликовать мод</button>
          </div>
        </div>
      )}

      {/* PROFILE */}
      {page === "profile" && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {!user ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full neon-border mx-auto mb-6 flex items-center justify-center" style={{ background: "#00ff8810" }}>
                <Icon name="User" size={36} className="neon-text" />
              </div>
              <h2 className="section-title text-white mb-2">Личный кабинет</h2>
              <p className="text-white/40 mb-8">Войди, чтобы видеть покупки и скачивать платные моды</p>
              <div className="flex gap-4 justify-center">
                <button className="neon-btn-filled px-8 py-3 rounded-lg" onClick={() => { setAuthModal("login"); setAuthError(""); }}>Войти</button>
                <button className="neon-btn px-8 py-3 rounded-lg" onClick={() => { setAuthModal("register"); setAuthError(""); }}>Регистрация</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-full neon-border flex items-center justify-center" style={{ background: "#00ff8812" }}>
                  <Icon name="User" size={28} className="neon-text" />
                </div>
                <div>
                  <h2 className="font-bold text-2xl text-white" style={{ fontFamily: "Rajdhani,sans-serif" }}>{user.username}</h2>
                  <div className="text-white/40 text-sm">{user.email}</div>
                </div>
                <button className="ml-auto neon-btn px-4 py-2 rounded text-sm flex items-center gap-2" onClick={logout}>
                  <Icon name="LogOut" size={14} />Выйти
                </button>
              </div>
              <h3 className="font-bold text-xl text-white mb-4 uppercase tracking-wider" style={{ fontFamily: "Rajdhani,sans-serif" }}>Мои покупки</h3>
              {ordersLoading ? (
                <div className="text-white/30 text-center py-8">Загружаю...</div>
              ) : myOrders.length === 0 ? (
                <div className="mod-card rounded-lg p-10 text-center">
                  <Icon name="Package" size={48} className="mx-auto mb-3 text-white/10" />
                  <div className="text-white/30">Покупок пока нет</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {myOrders.map(order => (
                    <div key={order.id} className="mod-card rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-white text-sm" style={{ fontFamily: "Rajdhani,sans-serif" }}>{order.mod_title}</div>
                        <div className="text-white/30 text-xs mt-0.5">
                          {order.amount > 0 ? `${order.amount} ₽ · ` : "Бесплатно"}
                          {order.payment_method === "crypto" ? " Крипта" : order.payment_method === "transfer" ? " Перевод" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        {order.status === "approved" && order.file_name && (
                          <button className="neon-btn-filled px-4 py-1.5 rounded text-sm flex items-center gap-1.5"
                            onClick={() => downloadFile(order.file_name)}>
                            <Icon name="Download" size={13} />Скачать
                          </button>
                        )}
                        {(order.status === "rejected" || order.status === "manual_review") && (
                          <a href={`mailto:${SUPPORT_EMAIL}?subject=Проблема с заказом #${order.id}`}
                            className="neon-btn px-4 py-1.5 rounded text-sm flex items-center gap-1.5">
                            <Icon name="Mail" size={13} />Поддержка
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <footer className="border-t border-white/5 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-white/30 tracking-widest text-sm" style={{ fontFamily: "Rajdhani,sans-serif" }}>
            PBSU<span className="neon-text">MODS</span> © 2025
          </div>
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white/30 text-xs hover:text-white/60 transition-colors flex items-center gap-1.5">
              <Icon name="Mail" size={12} />{SUPPORT_EMAIL}
            </a>
            {["О проекте", "Правила"].map(l => (
              <span key={l} className="text-white/20 text-xs hover:text-white/50 cursor-pointer transition-colors uppercase tracking-wide" style={{ fontFamily: "Rajdhani,sans-serif" }}>{l}</span>
            ))}
          </div>
        </div>
      </footer>

      {/* AUTH MODAL */}
      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.88)" }}>
          <div className="rounded-xl w-full max-w-sm p-6 relative neon-border" style={{ background: "var(--bg-card)" }}>
            <button className="absolute top-4 right-4 text-white/30 hover:text-white" onClick={() => setAuthModal("")}>
              <Icon name="X" size={20} />
            </button>
            <div className="text-xs tracking-widest neon-text mb-4" style={{ fontFamily: "Rajdhani,sans-serif" }}>
              ◈ {authModal === "login" ? "ВХОД" : "РЕГИСТРАЦИЯ"}
            </div>
            <h3 className="font-bold text-xl text-white mb-6" style={{ fontFamily: "Rajdhani,sans-serif" }}>
              {authModal === "login" ? "Войти в аккаунт" : "Создать аккаунт"}
            </h3>
            <form onSubmit={handleAuth} className="space-y-4">
              {authModal === "register" && (
                <div>
                  <label className="block text-white/50 text-xs mb-1.5 tracking-wider uppercase" style={{ fontFamily: "Rajdhani,sans-serif" }}>Имя пользователя</label>
                  <input required className="w-full rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none"
                    style={{ background: "var(--bg-dark)", border: "1px solid rgba(255,255,255,0.12)" }}
                    placeholder="nickname" value={authForm.username}
                    onChange={e => setAuthForm(p => ({ ...p, username: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="block text-white/50 text-xs mb-1.5 tracking-wider uppercase" style={{ fontFamily: "Rajdhani,sans-serif" }}>Email</label>
                <input required type="email" className="w-full rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none"
                  style={{ background: "var(--bg-dark)", border: "1px solid rgba(255,255,255,0.12)" }}
                  placeholder="your@email.com" value={authForm.email}
                  onChange={e => setAuthForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1.5 tracking-wider uppercase" style={{ fontFamily: "Rajdhani,sans-serif" }}>Пароль</label>
                <input required type="password" className="w-full rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none"
                  style={{ background: "var(--bg-dark)", border: "1px solid rgba(255,255,255,0.12)" }}
                  placeholder="••••••" value={authForm.password}
                  onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              {authError && (
                <div className="text-sm px-3 py-2 rounded" style={{ background: "#ff006612", border: "1px solid #ff006630", color: "var(--neon-pink)" }}>
                  {authError}
                </div>
              )}
              <button type="submit" disabled={authLoading}
                className="neon-btn-filled w-full py-3 rounded-lg font-bold" style={{ opacity: authLoading ? 0.6 : 1 }}>
                {authLoading ? "Подождите..." : authModal === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>
            <div className="text-center mt-4">
              <span className="text-white/30 text-sm">
                {authModal === "login" ? "Нет аккаунта? " : "Уже есть? "}
                <button className="neon-text hover:underline" onClick={() => { setAuthModal(authModal === "login" ? "register" : "login"); setAuthError(""); }}>
                  {authModal === "login" ? "Зарегистрируйся" : "Войти"}
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {payMod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.90)" }}>
          <div className="rounded-xl w-full max-w-md p-6 relative neon-border" style={{ background: "var(--bg-card)" }}>
            <button className="absolute top-4 right-4 text-white/30 hover:text-white" onClick={closePayModal}>
              <Icon name="X" size={20} />
            </button>

            {payStep === "choose" && (
              <>
                <div className="text-xs tracking-widest neon-text mb-4" style={{ fontFamily: "Rajdhani,sans-serif" }}>◈ СПОСОБ ОПЛАТЫ</div>
                <h3 className="font-bold text-xl text-white mb-1" style={{ fontFamily: "Rajdhani,sans-serif" }}>{payMod.title}</h3>
                <div className="font-bold text-3xl neon-pink-text mb-6" style={{ fontFamily: "Rajdhani,sans-serif" }}>{payMod.price} ₽</div>
                <div className="space-y-3 mb-6">
                  {(["transfer", "crypto"] as const).map(m => (
                    <button key={m} onClick={() => setPayMethod(m)}
                      className="w-full rounded-xl p-4 flex items-center gap-4 transition-all cursor-pointer"
                      style={{
                        background: payMethod === m ? (m === "transfer" ? "#00ff8808" : "#ff006808") : "var(--bg-dark)",
                        border: payMethod === m ? (m === "transfer" ? "1px solid #00ff8840" : "1px solid #ff006640") : "1px solid rgba(255,255,255,0.1)"
                      }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: payMethod === m ? (m === "transfer" ? "#00ff8815" : "#ff006815") : "#ffffff08" }}>
                        <Icon name={m === "transfer" ? "Banknote" : "Coins"} size={20}
                          className={payMethod === m ? (m === "transfer" ? "neon-text" : "neon-pink-text") : "text-white/40"} />
                      </div>
                      <div className="text-left">
                        <div className={`font-bold text-sm ${payMethod === m ? (m === "transfer" ? "neon-text" : "neon-pink-text") : "text-white/60"}`}
                          style={{ fontFamily: "Rajdhani,sans-serif" }}>
                          {m === "transfer" ? "БАНКОВСКИЙ ПЕРЕВОД" : "КРИПТОВАЛЮТА (TON)"}
                        </div>
                        <div className="text-white/30 text-xs">{m === "transfer" ? "Т-Банк, СБП, любой банк" : "TON-кошелёк, анонимно"}</div>
                      </div>
                      {payMethod === m && <Icon name="CheckCircle" size={18} className={m === "transfer" ? "neon-text" : "neon-pink-text"} style={{ marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>
                <button className="neon-btn-filled w-full py-3 rounded-lg" onClick={handleCreateOrder}>Продолжить →</button>
              </>
            )}

            {payStep === "info" && (
              <>
                <div className="text-xs tracking-widest neon-text mb-4" style={{ fontFamily: "Rajdhani,sans-serif" }}>◈ РЕКВИЗИТЫ</div>
                <h3 className="font-bold text-lg text-white mb-1" style={{ fontFamily: "Rajdhani,sans-serif" }}>{payMod.title}</h3>
                {payMod.price === 0 ? (
                  <div className="py-4 text-center">
                    <button className="neon-btn-filled w-full py-3 rounded-lg flex items-center justify-center gap-2" onClick={handleCreateOrder}>
                      <Icon name="Download" size={18} />Скачать бесплатно
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="font-bold text-3xl mb-5" style={{ fontFamily: "Rajdhani,sans-serif", color: payMethod === "crypto" ? "var(--neon-pink)" : "var(--neon-green)" }}>
                      {payMod.price} ₽
                    </div>
                    {payMethod === "transfer" ? (
                      <div className="rounded-xl p-4 mb-5" style={{ background: "#00ff8808", border: "1px solid #00ff8820" }}>
                        <div className="text-white/50 text-xs mb-2 uppercase tracking-widest" style={{ fontFamily: "Rajdhani,sans-serif" }}>Переведи на карту:</div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono neon-text text-xl tracking-wider">+7 (999) 123-45-67</div>
                            <div className="text-white/30 text-xs mt-0.5">Т-Банк · Иван И.</div>
                          </div>
                          <button className="p-2 rounded hover:bg-white/5 text-white/40 hover:text-white/80" onClick={() => copyText("+79991234567")}>
                            <Icon name="Copy" size={15} />
                          </button>
                        </div>
                        <div className="text-white/30 text-xs mt-2">Сумма точно: <span className="neon-text font-bold">{payMod.price} ₽</span></div>
                      </div>
                    ) : (
                      <div className="rounded-xl p-4 mb-5" style={{ background: "#ff006808", border: "1px solid #ff006830" }}>
                        <div className="text-white/50 text-xs mb-2 uppercase tracking-widest" style={{ fontFamily: "Rajdhani,sans-serif" }}>TON-кошелёк:</div>
                        <div className="flex items-start gap-2">
                          <div className="font-mono text-xs break-all leading-relaxed" style={{ color: "var(--neon-pink)" }}>{CRYPTO_WALLET}</div>
                          <button className="p-1.5 rounded hover:bg-white/5 text-white/40 flex-shrink-0" onClick={() => copyText(CRYPTO_WALLET)}>
                            <Icon name="Copy" size={14} />
                          </button>
                        </div>
                        <div className="text-white/30 text-xs mt-2">Сеть: TON · Сумма в TON эквивалентная <span style={{ color: "var(--neon-pink)" }}>{payMod.price} ₽</span></div>
                      </div>
                    )}
                    <ol className="space-y-1.5 text-sm text-white/50 mb-5">
                      {["Переведи точную сумму на реквизиты", "Сделай скриншот подтверждения", "Загрузи скриншот — ИИ проверит за 30–60 сек"].map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="neon-text font-bold" style={{ fontFamily: "Rajdhani,sans-serif" }}>{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                    <button className="neon-btn-filled w-full py-3 rounded-lg" onClick={() => setPayStep("upload")}>
                      Я перевёл — загрузить скриншот
                    </button>
                  </>
                )}
              </>
            )}

            {payStep === "upload" && (
              <>
                <div className="text-xs tracking-widest neon-text mb-4" style={{ fontFamily: "Rajdhani,sans-serif" }}>◈ ПОДТВЕРЖДЕНИЕ</div>
                <h3 className="font-bold text-xl text-white mb-2" style={{ fontFamily: "Rajdhani,sans-serif" }}>Загрузи скриншот</h3>
                <p className="text-white/40 text-sm mb-5">Скриншот подтверждения перевода или транзакции</p>
                <label className="block border-2 border-dashed border-white/12 hover:border-[var(--neon-green)] rounded-xl p-8 text-center cursor-pointer transition-all mb-5">
                  <input type="file" className="hidden" accept="image/*"
                    onChange={e => { if (e.target.files?.[0]) { setScreenshotFile(e.target.files[0]); setScreenshotName(e.target.files[0].name); } }} />
                  <Icon name="ImagePlus" size={40} className="text-white/20 mx-auto mb-3" />
                  {screenshotName
                    ? <div className="neon-text font-bold" style={{ fontFamily: "Rajdhani,sans-serif" }}>✓ {screenshotName}</div>
                    : <><div className="text-white/40 text-sm">Нажми для выбора скриншота</div><div className="text-white/20 text-xs mt-1">PNG, JPG, WEBP</div></>
                  }
                </label>
                <button className="neon-btn-filled w-full py-3 rounded-lg"
                  style={{ opacity: screenshotFile && !uploadingScreenshot ? 1 : 0.4, cursor: screenshotFile ? "pointer" : "not-allowed" }}
                  disabled={!screenshotFile || uploadingScreenshot}
                  onClick={handleUploadScreenshot}>
                  {uploadingScreenshot ? "Загружаю..." : "Отправить на проверку ИИ"}
                </button>
              </>
            )}

            {payStep === "checking" && (
              <div className="text-center py-10">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="w-16 h-16 rounded-full border-2 border-t-transparent animate-spin absolute inset-0"
                    style={{ borderColor: "var(--neon-green)", borderTopColor: "transparent", boxShadow: "0 0 20px #00ff8840" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon name="Cpu" size={22} className="neon-text" />
                  </div>
                </div>
                <div className="font-bold text-xl text-white mb-2" style={{ fontFamily: "Rajdhani,sans-serif" }}>ИИ проверяет оплату...</div>
                <div className="text-white/40 text-sm mb-1">Анализируем скриншот {payMethod === "crypto" ? "крипто-транзакции" : "перевода"}</div>
                <div className="text-white/20 text-xs mb-6">Обычно 30–60 секунд</div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "#00ff8815" }}>
                  <div className="h-full rounded-full animate-pulse" style={{ width: "65%", background: "var(--neon-green)", boxShadow: "0 0 8px #00ff88" }} />
                </div>
              </div>
            )}

            {payStep === "done" && (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full neon-border mx-auto mb-6 flex items-center justify-center"
                  style={{ background: "#00ff8815", boxShadow: "0 0 30px #00ff8840" }}>
                  <Icon name="CheckCheck" size={32} className="neon-text" />
                </div>
                <div className="font-bold text-2xl text-white mb-2" style={{ fontFamily: "Rajdhani,sans-serif" }}>
                  {payMod.price === 0 ? "Готово!" : "Оплата подтверждена!"}
                </div>
                <div className="text-white/40 text-sm mb-8">{payMod.title} доступен для скачивания</div>
                <button className="neon-btn-filled w-full py-3 rounded-lg flex items-center justify-center gap-2"
                  onClick={() => { downloadFile(payMod.file_name); closePayModal(); }}>
                  <Icon name="Download" size={18} />Скачать {payMod.file_name}
                </button>
              </div>
            )}

            {payStep === "rejected" && (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full neon-border-pink mx-auto mb-6 flex items-center justify-center" style={{ background: "#ff006615" }}>
                  <Icon name="XCircle" size={32} className="neon-pink-text" />
                </div>
                <div className="font-bold text-2xl text-white mb-2" style={{ fontFamily: "Rajdhani,sans-serif" }}>Оплата не подтверждена</div>
                <div className="text-white/40 text-sm mb-2">{payVerdict}</div>
                <div className="text-white/25 text-xs mb-8">Если считаешь, что это ошибка — напиши нам</div>
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Проблема с оплатой заказа #${orderId}`}
                  className="neon-btn-pink w-full py-3 rounded-lg flex items-center justify-center gap-2">
                  <Icon name="Mail" size={16} />Написать в поддержку
                </a>
              </div>
            )}

            {payStep === "manual" && (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ background: "#ff990010", border: "1px solid #ff990040" }}>
                  <Icon name="Clock" size={32} style={{ color: "#ff9900" }} />
                </div>
                <div className="font-bold text-2xl text-white mb-2" style={{ fontFamily: "Rajdhani,sans-serif" }}>Ручная проверка</div>
                <div className="text-white/40 text-sm mb-2">ИИ не смог автоматически подтвердить оплату</div>
                <div className="text-white/25 text-xs mb-8">Проверим вручную в течение часа и выдадим доступ. Напиши нам:</div>
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Ручная проверка заказа %23${orderId}&body=Мод: ${payMod.title}%0AСумма: ${payMod.price} руб%0AСпособ: ${payMethod === "crypto" ? "Крипта TON" : "Банковский перевод"}`}
                  className="neon-btn-filled w-full py-3 rounded-lg flex items-center justify-center gap-2">
                  <Icon name="Mail" size={16} />{SUPPORT_EMAIL}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModsGrid({ mods, onBuy, loading }: { mods: Mod[]; onBuy?: (m: Mod) => void; loading?: boolean }) {
  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="mod-card rounded-xl overflow-hidden animate-pulse">
          <div className="h-44" style={{ background: "var(--bg-card-hover)" }} />
          <div className="p-4 space-y-2">
            <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.05)", width: "60%" }} />
            <div className="h-5 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>
        </div>
      ))}
    </div>
  );
  if (mods.length === 0) return (
    <div className="text-center py-16">
      <Icon name="PackageX" size={48} className="mx-auto mb-4 text-white/10" />
      <div className="text-white/30">Ничего не найдено</div>
    </div>
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {mods.map(mod => <ModCard key={mod.id} mod={mod} onBuy={onBuy} />)}
    </div>
  );
}

function ModCard({ mod, onBuy }: { mod: Mod; onBuy?: (m: Mod) => void }) {
  return (
    <div className="mod-card rounded-xl overflow-hidden">
      <div className="relative h-44 overflow-hidden">
        <img src={mod.cover_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80"}
          alt={mod.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-0.5 rounded text-xs ${mod.price === 0 ? "tag-free" : "tag-paid"}`}>
            {mod.price === 0 ? "БЕСПЛАТНО" : `${mod.price} ₽`}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded px-2 py-0.5" style={{ background: "rgba(0,0,0,0.65)" }}>
          <Icon name="Star" size={11} className="text-yellow-400" />
          <span className="text-white text-xs font-bold" style={{ fontFamily: "Rajdhani,sans-serif" }}>{mod.rating}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-white/25 text-xs tracking-widest uppercase mb-1" style={{ fontFamily: "Rajdhani,sans-serif" }}>
          {mod.game} · {mod.category}
        </div>
        <h3 className="font-bold text-white text-lg leading-tight mb-2" style={{ fontFamily: "Rajdhani,sans-serif" }}>{mod.title}</h3>
        {mod.description && <p className="text-white/35 text-xs mb-3 line-clamp-2">{mod.description}</p>}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-white/25 text-xs">
            <Icon name="Download" size={12} />
            <span style={{ fontFamily: "Rajdhani,sans-serif" }}>
              {mod.downloads >= 1000 ? `${(mod.downloads / 1000).toFixed(1)}k` : mod.downloads}
            </span>
          </div>
          <button className={`px-4 py-1.5 rounded text-sm ${mod.price === 0 ? "neon-btn-filled" : "neon-btn-pink"}`}
            onClick={() => onBuy?.(mod)}>
            {mod.price === 0 ? "Скачать" : "Купить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    approved: { label: "✓ Оплачено", color: "var(--neon-green)" },
    pending: { label: "⏳ Ожидание", color: "#ff9900" },
    rejected: { label: "✕ Отклонено", color: "var(--neon-pink)" },
    manual_review: { label: "👁 Проверка", color: "#ff9900" },
    free: { label: "✓ Бесплатно", color: "var(--neon-green)" },
  };
  const s = map[status] || { label: status, color: "#ffffff40" };
  return (
    <span className="text-xs px-2 py-1 rounded" style={{ fontFamily: "Rajdhani,sans-serif", color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
      {s.label}
    </span>
  );
}
