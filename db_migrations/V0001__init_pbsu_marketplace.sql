CREATE TABLE t_p77182784_proton_mods_marketpl.users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p77182784_proton_mods_marketpl.mods (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  game VARCHAR(100) DEFAULT 'PBSU',
  category VARCHAR(100),
  price INTEGER DEFAULT 0,
  rating NUMERIC(3,1) DEFAULT 5.0,
  downloads INTEGER DEFAULT 0,
  file_url TEXT,
  file_name VARCHAR(255),
  cover_url TEXT,
  author_id INTEGER REFERENCES t_p77182784_proton_mods_marketpl.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p77182784_proton_mods_marketpl.orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES t_p77182784_proton_mods_marketpl.users(id),
  mod_id INTEGER REFERENCES t_p77182784_proton_mods_marketpl.mods(id),
  payment_method VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  screenshot_url TEXT,
  ai_verdict TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p77182784_proton_mods_marketpl.sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES t_p77182784_proton_mods_marketpl.users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

INSERT INTO t_p77182784_proton_mods_marketpl.mods (title, description, game, category, price, rating, downloads, cover_url, file_url, file_name) VALUES
('PBSU Realbus HD Pack', 'Полная переработка текстур автобусов в 4K. Включает 12 моделей с детализированным интерьером и экстерьером.', 'PBSU', 'Текстуры', 0, 4.8, 14200, 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&q=80', NULL, 'pbsu_realbus_hd.zip'),
('City Route 88 — Москва', 'Новый маршрут по центру Москвы с 34 остановками, пассажирами и дорожной разметкой.', 'PBSU', 'Маршруты', 199, 4.9, 5600, 'https://images.unsplash.com/photo-1513326738677-b964603b136d?w=600&q=80', NULL, 'city_route_88_moscow.zip'),
('Neon Night Map — Cyberpunk City', 'Ночная карта в стиле киберпанк с неоновой подсветкой, дождём и трафиком.', 'PBSU', 'Карты', 349, 5.0, 2100, 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80', NULL, 'neon_night_cyberpunk.zip'),
('Sound Pack Ultra — Real Engines', 'Реалистичные звуки двигателей, пассажиров и окружения. 48 кГц, Dolby.', 'PBSU', 'Звуки', 0, 4.7, 31000, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', NULL, 'sound_pack_ultra.zip'),
('Winter Minsk Routes x5', 'Пять зимних маршрутов по Минску: снег, лёд, метель и реальные названия улиц.', 'PBSU', 'Маршруты', 249, 4.6, 3800, 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&q=80', NULL, 'winter_minsk_routes.zip'),
('Traffic AI Overhaul v2', 'Полная переработка ИИ трафика: умные пешеходы, реалистичные пробки, аварии.', 'PBSU', 'Геймплей', 299, 4.9, 7200, 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&q=80', NULL, 'traffic_ai_overhaul_v2.zip');
