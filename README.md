# Ampera Kasir — Sistem Laporan Kasir Digital

Sistem laporan harian kasir untuk 7 cabang Ampera Raya menggunakan Telegram Mini App, Express API, dan Supabase.

## Stack

| Layer | Teknologi | Platform |
|-------|-----------|----------|
| Mini App (Form) | React + Vite | Railway |
| Backend API | Node.js + Express | Railway |
| Telegram Bot | Telegraf.js | Railway |
| Database | PostgreSQL | Supabase |
| File Storage (PDF) | Supabase Storage | Supabase |
| Dashboard Admin | React + Vite | Vercel |

## Struktur Folder

```
ampera-kasir/
├── apps/
│   ├── api/          ← Backend Express + PDF generator
│   ├── bot/          ← Telegram Bot (Telegraf.js)
│   ├── miniapp/      ← Form kasir (React + Vite)
│   └── dashboard/    ← Admin dashboard (React + Vite)
├── packages/
│   └── shared/       ← Types & utilities dikongsi
├── docs/
│   └── supabase_schema.sql
└── .env.example
```

---

## Setup — Langkah demi Langkah

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/ampera-kasir.git
cd ampera-kasir
npm install
```

### 2. Setup Supabase

1. Pergi ke [supabase.com](https://supabase.com) → New Project
2. Pergi ke **SQL Editor** → New Query
3. Copy semua isi `docs/supabase_schema.sql` → Run
4. Pergi ke **Project Settings → API**, copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (jangan dedahkan ke public!)

### 3. Setup .env

```bash
cp .env.example .env
# Edit .env dengan nilai sebenar:
nano .env
```

Isi semua nilai dalam `.env`:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
BOT_TOKEN=1234567890:AAF...
ADMIN_GROUP_ID=-1001234567890
API_PORT=3000
API_SECRET=buat-random-string-panjang
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 4. Buat Admin Pertama di Supabase

1. Supabase Dashboard → **Authentication → Users → Invite User**
2. Masukkan email admin
3. Copy UUID yang dijana
4. Pergi ke **SQL Editor**, jalankan:

```sql
INSERT INTO users (auth_id, name, telegram_id, branch_code, role)
VALUES (
  'UUID-DARI-LANGKAH-3',
  'Nama Admin',
  NULL,
  'HQ',
  'superadmin'
);
```

### 5. Run Development (Local)

```bash
# Terminal 1 — API
npm run dev:api

# Terminal 2 — Mini App
npm run dev:miniapp

# Terminal 3 — Bot (selepas Bot siap)
npm run dev:bot
```

### 6. Expose Bot ke Internet (untuk test Telegram webhook)

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000

# Copy URL yang dijana, contoh: https://abc123.ngrok-free.app
# Set dalam .env:
BOT_WEBHOOK_URL=https://abc123.ngrok-free.app/webhook
```

---

## Deploy ke Railway

### API + Mini App + Bot

1. Push ke GitHub
2. Railway Dashboard → New Project → Deploy from GitHub
3. Tambah semua environment variables dari `.env` (kecuali `VITE_*` — itu untuk Vercel)
4. Railway akan auto-deploy setiap kali ada `git push` ke `main`

> **Tip:** Untuk elakkan build lama, Railway guna build cache secara automatik. Pastikan `node_modules` ada dalam `.gitignore`.

### Dashboard Admin (Vercel)

```bash
cd apps/dashboard
vercel --prod
# Set environment variables VITE_* dalam Vercel dashboard
```

---

## Tambah Kasir Baru

Via API (atau nanti via Dashboard Admin UI):

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmad Kasir",
    "telegram_id": "123456789",
    "branch_code": "KW"
  }'
```

Kasir perlu share Telegram User ID mereka kepada admin. Cara kasir dapatkan ID mereka:
1. Buka Telegram → cari bot `@userinfobot`
2. Tekan /start → bot akan reply dengan Telegram ID

---

## Cabang

| Kod | Nama |
|-----|------|
| KW | Kota Warisan |
| KJ | Taman Putra Kajang |
| S13 | Shah Alam Seksyen 13 |
| S7 | Shah Alam Seksyen 7 |
| KLTS | Plaza KLTS |
| KD | Kota Damansara |
| TTDI | TTDI (dibuka Jun 2026) |
