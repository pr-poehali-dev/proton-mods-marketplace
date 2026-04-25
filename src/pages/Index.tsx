import { useState } from "react";
import Icon from "@/components/ui/icon";

const HERO_IMG = "https://cdn.poehali.dev/projects/69eda840-7284-4645-a209-b149cacb54ce/files/cd2d9851-431d-42e6-875b-77197ce09b48.jpg";

const MODS = [
  { id: 1, title: "Dark Souls Ultra Remaster", game: "Dark Souls III", category: "Графика", price: 0, rating: 4.8, downloads: 12400, img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80", tags: ["Графика", "HD"] },
  { id: 2, title: "GTA V Cyberpunk Overhaul", game: "GTA V", category: "Текстуры", price: 299, rating: 4.9, downloads: 8700, img: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80", tags: ["Текстуры", "Cyberpunk"] },
  { id: 3, title: "Skyrim Dragon Rework", game: "Skyrim SE", category: "Персонажи", price: 0, rating: 4.7, downloads: 34200, img: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80", tags: ["Персонажи", "Монстры"] },
  { id: 4, title: "Minecraft Ultra Shaders", game: "Minecraft", category: "Шейдеры", price: 149, rating: 4.6, downloads: 67000, img: "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=400&q=80", tags: ["Шейдеры", "RTX"] },
  { id: 5, title: "Elden Ring Lore Expansion", game: "Elden Ring", category: "Квесты", price: 499, rating: 5.0, downloads: 3100, img: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=400&q=80", tags: ["Квесты", "Лор"] },
  { id: 6, title: "Fallout 4 Survival Plus", game: "Fallout 4", category: "Геймплей", price: 0, rating: 4.5, downloads: 21500, img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80", tags: ["Геймплей", "Выживание"] },
];

type Page = "home" | "free" | "paid" | "upload" | "profile" | "search";

export default function Index() {
  const [page, setPage] = useState<Page>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGame, setFilterGame] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paymentMod, setPaymentMod] = useState<typeof MODS[0] | null>(null);
  const [paymentStep, setPaymentStep] = useState<"info" | "upload" | "checking" | "done">("info");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

  const freeMods = MODS.filter(m => m.price === 0);
  const paidMods = MODS.filter(m => m.price > 0);

  const filteredMods = MODS.filter(m => {
    const matchQuery = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.game.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGame = filterGame === "all" || m.game === filterGame;
    const matchCat = filterCategory === "all" || m.category === filterCategory;
    const matchPrice = priceFilter === "all" || (priceFilter === "free" && m.price === 0) || (priceFilter === "paid" && m.price > 0);
    return matchQuery && matchGame && matchCat && matchPrice;
  });

  const handleBuy = (mod: typeof MODS[0]) => {
    setPaymentMod(mod);
    setPaymentStep("info");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0].name);
    }
  };

  const handleCheckPayment = () => {
    setPaymentStep("checking");
    setTimeout(() => {
      setPaymentStep("done");
    }, 8000);
  };

  const nav: { id: Page; label: string; icon: string }[] = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "free", label: "Бесплатные", icon: "Download" },
    { id: "paid", label: "Платные", icon: "ShoppingCart" },
    { id: "upload", label: "Публикация", icon: "Upload" },
    { id: "search", label: "Поиск", icon: "Search" },
    { id: "profile", label: "Кабинет", icon: "User" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] font-rubik">
      {/* NAV */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage("home")}>
            <div className="w-8 h-8 rounded border border-[var(--neon-green)] flex items-center justify-center"
              style={{ boxShadow: "0 0 10px #00ff8840" }}>
              <span style={{ color: "var(--neon-green)", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "0.8rem" }}>MV</span>
            </div>
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.15em", color: "white" }}>
              MOD<span className="neon-text">VAULT</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {nav.map(n => (
              <span key={n.id} className={`nav-link ${page === n.id ? "active" : ""}`}
                onClick={() => setPage(n.id)}>{n.label}</span>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button className="neon-btn px-4 py-1.5 rounded text-sm hidden md:block"
              onClick={() => setPage("profile")}>Войти</button>
            <button className="md:hidden text-white/70" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Icon name="Menu" size={20} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-white/5 px-4 py-3 flex flex-col gap-3">
            {nav.map(n => (
              <span key={n.id} className={`nav-link text-base flex items-center gap-2 ${page === n.id ? "active" : ""}`}
                onClick={() => { setPage(n.id); setMobileMenuOpen(false); }}>
                <Icon name={n.icon} size={14} />
                {n.label}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* HOME */}
      {page === "home" && (
        <div>
          <div className="relative h-[480px] overflow-hidden">
            <img src={HERO_IMG} alt="ModVault" className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f60] to-[#0a0a0f]" />
            <div className="absolute inset-0 grid-bg opacity-60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <div className="text-xs tracking-[0.3em] neon-text mb-4 animate-fade-in"
                style={{ fontFamily: "Rajdhani, sans-serif" }}>
                ◈ МАРКЕТПЛЕЙС ИГРОВЫХ МОДОВ ◈
              </div>
              <h1 className="font-bold text-5xl md:text-7xl text-white tracking-tight mb-4 animate-fade-in"
                style={{ fontFamily: "Rajdhani, sans-serif", animationDelay: "0.1s", opacity: 0 }}>
                MOD<span className="neon-text">VAULT</span>
              </h1>
              <p className="text-white/60 text-lg max-w-xl mb-8 animate-fade-in"
                style={{ animationDelay: "0.2s", opacity: 0 }}>
                Тысячи модов для любимых игр. Бесплатно и по подписке.
                Мгновенный доступ после оплаты.
              </p>
              <div className="flex gap-4 animate-fade-in" style={{ animationDelay: "0.3s", opacity: 0 }}>
                <button className="neon-btn-filled px-8 py-3 rounded text-base" onClick={() => setPage("free")}>
                  Смотреть моды
                </button>
                <button className="neon-btn px-8 py-3 rounded text-base" onClick={() => setPage("upload")}>
                  Опубликовать мод
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-3 gap-4">
            {[
              { label: "Модов в каталоге", value: "12,400+", icon: "Package" },
              { label: "Авторов", value: "3,200+", icon: "Users" },
              { label: "Загрузок", value: "1.2M+", icon: "Download" },
            ].map(s => (
              <div key={s.label} className="mod-card rounded-lg p-5 text-center">
                <Icon name={s.icon} size={24} className="neon-text mx-auto mb-2" />
                <div className="font-bold text-2xl text-white" style={{ fontFamily: "Rajdhani, sans-serif" }}>{s.value}</div>
                <div className="text-white/40 text-sm">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="max-w-7xl mx-auto px-4 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title text-white">🔥 Популярные моды</h2>
              <button className="nav-link text-sm" onClick={() => setPage("search")}>Все моды →</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MODS.map(mod => (
                <ModCard key={mod.id} mod={mod} onBuy={() => handleBuy(mod)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FREE */}
      {page === "free" && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="section-title text-white mb-2">Бесплатные моды</h2>
          <p className="text-white/40 mb-6">Скачивай без регистрации и оплаты</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {freeMods.map(mod => (
              <ModCard key={mod.id} mod={mod} onBuy={() => handleBuy(mod)} />
            ))}
          </div>
        </div>
      )}

      {/* PAID */}
      {page === "paid" && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="section-title text-white mb-2">Платные моды</h2>
          <p className="text-white/40 mb-6">Эксклюзивный контент от лучших авторов</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paidMods.map(mod => (
              <ModCard key={mod.id} mod={mod} onBuy={() => handleBuy(mod)} />
            ))}
          </div>
        </div>
      )}

      {/* SEARCH */}
      {page === "search" && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="section-title text-white mb-6">Поиск модов</h2>

          <div className="relative mb-4">
            <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="w-full rounded-lg pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none transition-all"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
              placeholder="Поиск по названию или игре..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            <select
              className="rounded-lg px-4 py-2 text-sm focus:outline-none cursor-pointer text-white/70"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
              value={filterGame}
              onChange={e => setFilterGame(e.target.value)}
            >
              <option value="all">Все игры</option>
              {[...new Set(MODS.map(m => m.game))].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              className="rounded-lg px-4 py-2 text-sm focus:outline-none cursor-pointer text-white/70"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="all">Все категории</option>
              {[...new Set(MODS.map(m => m.category))].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex gap-2">
              {(["all", "free", "paid"] as const).map((f) => (
                <button key={f}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${priceFilter === f ? "neon-btn-filled" : "neon-btn"}`}
                  onClick={() => setPriceFilter(f)}>
                  {f === "all" ? "Все" : f === "free" ? "Бесплатные" : "Платные"}
                </button>
              ))}
            </div>
          </div>

          <div className="text-white/30 text-sm mb-4" style={{ fontFamily: "Rajdhani, sans-serif" }}>
            Найдено: {filteredMods.length} модов
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMods.map(mod => (
              <ModCard key={mod.id} mod={mod} onBuy={() => handleBuy(mod)} />
            ))}
          </div>
        </div>
      )}

      {/* UPLOAD */}
      {page === "upload" && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="section-title text-white mb-2">Публикация мода</h2>
          <p className="text-white/40 mb-8">Поделись своим творчеством с сообществом</p>

          <div className="space-y-5">
            {[
              { label: "Название мода *", placeholder: "Введи название..." },
              { label: "Игра *", placeholder: "Skyrim SE, GTA V, Minecraft..." },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-white/50 text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "Rajdhani, sans-serif" }}>{f.label}</label>
                <input className="w-full rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-all"
                  style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
                  placeholder={f.placeholder} />
              </div>
            ))}

            <div>
              <label className="block text-white/50 text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "Rajdhani, sans-serif" }}>Категория</label>
              <select className="w-full rounded-lg px-4 py-3 text-white/70 focus:outline-none cursor-pointer"
                style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {["Графика", "Текстуры", "Геймплей", "Персонажи", "Шейдеры", "Квесты"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "Rajdhani, sans-serif" }}>Описание</label>
              <textarea rows={4}
                className="w-full rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-all resize-none"
                style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
                placeholder="Расскажи о своём моде..." />
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "Rajdhani, sans-serif" }}>Цена в ₽ (0 = бесплатно)</label>
              <input type="number" min={0}
                className="w-full rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-all"
                style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)" }}
                placeholder="0" />
            </div>

            <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-[var(--neon-green)] transition-all cursor-pointer"
              style={{ transition: "all 0.2s" }}>
              <Icon name="Upload" size={32} className="text-white/20 mx-auto mb-3" />
              <div className="text-white/40 text-sm">Перетащи файл мода или <span className="neon-text">нажми для выбора</span></div>
              <div className="text-white/20 text-xs mt-1">.zip, .rar, .7z — до 500 МБ</div>
            </div>

            <button className="neon-btn-filled w-full py-3 rounded-lg text-base">
              Опубликовать мод
            </button>
          </div>
        </div>
      )}

      {/* PROFILE */}
      {page === "profile" && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-5 mb-8">
            <div className="w-20 h-20 rounded-full neon-border flex items-center justify-center"
              style={{ background: "#00ff8812" }}>
              <Icon name="User" size={36} className="neon-text" />
            </div>
            <div>
              <h2 className="font-bold text-2xl text-white" style={{ fontFamily: "Rajdhani, sans-serif" }}>Гость</h2>
              <div className="text-white/40 text-sm">Войди, чтобы получить доступ к загрузкам</div>
              <div className="flex gap-2 mt-3">
                <button className="neon-btn-filled px-5 py-1.5 rounded text-sm">Войти</button>
                <button className="neon-btn px-5 py-1.5 rounded text-sm">Регистрация</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Купленных модов", value: "0", icon: "ShoppingBag" },
              { label: "Скачиваний", value: "0", icon: "Download" },
              { label: "Опубликовано", value: "0", icon: "Upload" },
            ].map(s => (
              <div key={s.label} className="mod-card rounded-lg p-5 text-center">
                <Icon name={s.icon} size={24} className="neon-text mx-auto mb-2" />
                <div className="font-bold text-2xl text-white" style={{ fontFamily: "Rajdhani, sans-serif" }}>{s.value}</div>
                <div className="text-white/40 text-sm">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mod-card rounded-lg p-6">
            <h3 className="font-bold text-lg text-white mb-4 uppercase tracking-wider" style={{ fontFamily: "Rajdhani, sans-serif" }}>Мои покупки</h3>
            <div className="text-white/30 text-center py-8">
              <Icon name="Package" size={40} className="mx-auto mb-3 opacity-30" />
              <div>Список покупок появится после входа</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white/30 tracking-widest text-sm" style={{ fontFamily: "Rajdhani, sans-serif" }}>
            MOD<span className="neon-text">VAULT</span> © 2025
          </div>
          <div className="flex gap-6">
            {["О проекте", "Правила", "Поддержка", "Для авторов"].map(l => (
              <span key={l} className="text-white/30 text-xs hover:text-white/60 cursor-pointer transition-colors uppercase tracking-wide"
                style={{ fontFamily: "Rajdhani, sans-serif" }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </footer>

      {/* PAYMENT MODAL */}
      {paymentMod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="rounded-xl w-full max-w-md p-6 relative neon-border"
            style={{ background: "var(--bg-card)" }}>
            <button className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
              onClick={() => { setPaymentMod(null); setPaymentStep("info"); setUploadedFile(null); }}>
              <Icon name="X" size={20} />
            </button>

            {paymentStep === "info" && (
              <>
                <div className="text-xs tracking-widest neon-text mb-4" style={{ fontFamily: "Rajdhani, sans-serif" }}>◈ ОПЛАТА</div>
                <h3 className="font-bold text-xl text-white mb-1" style={{ fontFamily: "Rajdhani, sans-serif" }}>{paymentMod.title}</h3>
                <div className="font-bold text-3xl neon-pink-text mb-6" style={{ fontFamily: "Rajdhani, sans-serif" }}>{paymentMod.price} ₽</div>

                <div className="rounded-lg p-4 mb-6 text-sm text-white/70"
                  style={{ background: "#00ff8808", border: "1px solid #00ff8820" }}>
                  <div className="font-bold text-white mb-2 uppercase tracking-wide text-xs" style={{ fontFamily: "Rajdhani, sans-serif" }}>Реквизиты для перевода:</div>
                  <div className="font-mono neon-text text-lg tracking-wider">+7 (999) 123-45-67</div>
                  <div className="text-white/40 text-xs mt-1">Т-Банк · Иван И.</div>
                </div>

                <ol className="space-y-2 text-sm text-white/60 mb-6">
                  {[
                    "Переведи точную сумму на указанные реквизиты",
                    "Сделай скриншот подтверждения перевода",
                    "Загрузи скриншот — ИИ проверит его за 30–60 сек",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="neon-text font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                <button className="neon-btn-pink w-full py-3 rounded-lg" onClick={() => setPaymentStep("upload")}>
                  Я перевёл — загрузить скриншот
                </button>
              </>
            )}

            {paymentStep === "upload" && (
              <>
                <div className="text-xs tracking-widest neon-text mb-4" style={{ fontFamily: "Rajdhani, sans-serif" }}>◈ ЗАГРУЗКА СКРИНШОТА</div>
                <h3 className="font-bold text-xl text-white mb-6" style={{ fontFamily: "Rajdhani, sans-serif" }}>Подтверди оплату</h3>

                <label className="block border-2 border-dashed border-white/15 hover:border-[var(--neon-green)] rounded-lg p-8 text-center cursor-pointer transition-all mb-6"
                  style={{ transition: "all 0.2s" }}>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <Icon name="ImagePlus" size={40} className="text-white/20 mx-auto mb-3" />
                  {uploadedFile ? (
                    <div className="neon-text font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>{uploadedFile} ✓</div>
                  ) : (
                    <>
                      <div className="text-white/40 text-sm">Нажми для выбора скриншота</div>
                      <div className="text-white/20 text-xs mt-1">PNG, JPG, WEBP</div>
                    </>
                  )}
                </label>

                <button
                  className={`w-full py-3 rounded-lg ${uploadedFile ? "neon-btn-filled" : "neon-btn"} transition-all`}
                  style={{ opacity: uploadedFile ? 1 : 0.4, cursor: uploadedFile ? "pointer" : "not-allowed" }}
                  disabled={!uploadedFile}
                  onClick={handleCheckPayment}
                >
                  Отправить на проверку ИИ
                </button>
              </>
            )}

            {paymentStep === "checking" && (
              <div className="text-center py-8">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="w-16 h-16 rounded-full border-2 border-[var(--neon-green)] border-t-transparent animate-spin absolute inset-0"
                    style={{ boxShadow: "0 0 16px #00ff8840" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon name="Cpu" size={22} className="neon-text" />
                  </div>
                </div>
                <div className="font-bold text-xl text-white mb-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>ИИ проверяет оплату</div>
                <div className="text-white/40 text-sm mb-1">Анализируем скриншот перевода...</div>
                <div className="text-white/20 text-xs mb-6">Обычно занимает 30–60 секунд</div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "#00ff8820" }}>
                  <div className="h-full rounded-full animate-pulse" style={{ width: "70%", background: "var(--neon-green)", boxShadow: "0 0 8px #00ff88" }} />
                </div>
              </div>
            )}

            {paymentStep === "done" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full neon-border mx-auto mb-6 flex items-center justify-center"
                  style={{ background: "#00ff8815", boxShadow: "0 0 24px #00ff8840" }}>
                  <Icon name="CheckCheck" size={32} className="neon-text" />
                </div>
                <div className="font-bold text-2xl text-white mb-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>Оплата подтверждена!</div>
                <div className="text-white/50 text-sm mb-8">{paymentMod.title} теперь доступен для скачивания</div>
                <button className="neon-btn-filled w-full py-3 rounded-lg flex items-center justify-center gap-2"
                  onClick={() => { setPaymentMod(null); setPaymentStep("info"); setUploadedFile(null); }}>
                  <Icon name="Download" size={18} />
                  Скачать мод
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModCard({ mod, onBuy }: { mod: typeof MODS[0]; onBuy: () => void }) {
  return (
    <div className="mod-card rounded-xl overflow-hidden cursor-pointer">
      <div className="relative h-44 overflow-hidden">
        <img src={mod.img} alt={mod.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-0.5 rounded text-xs ${mod.price === 0 ? "tag-free" : "tag-paid"}`}>
            {mod.price === 0 ? "БЕСПЛАТНО" : `${mod.price} ₽`}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded px-2 py-0.5"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <Icon name="Star" size={11} className="text-yellow-400" />
          <span className="text-white text-xs font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>{mod.rating}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="text-white/30 text-xs tracking-widest uppercase mb-1" style={{ fontFamily: "Rajdhani, sans-serif" }}>{mod.game}</div>
        <h3 className="font-bold text-white text-lg leading-tight mb-3" style={{ fontFamily: "Rajdhani, sans-serif" }}>{mod.title}</h3>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {mod.tags.map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded text-white/40"
              style={{ background: "rgba(255,255,255,0.05)", fontFamily: "Rajdhani, sans-serif" }}>{t}</span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-white/30 text-xs">
            <Icon name="Download" size={12} />
            <span style={{ fontFamily: "Rajdhani, sans-serif" }}>{(mod.downloads / 1000).toFixed(1)}k</span>
          </div>
          <button
            className={`px-4 py-1.5 rounded text-sm ${mod.price === 0 ? "neon-btn-filled" : "neon-btn-pink"}`}
            onClick={e => { e.stopPropagation(); onBuy(); }}
          >
            {mod.price === 0 ? "Скачать" : "Купить"}
          </button>
        </div>
      </div>
    </div>
  );
}
