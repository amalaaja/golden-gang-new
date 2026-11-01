# Golden Gang Syndicate App

A Next.js (App Router) web application for syndicate network asset management, ledger recording, and internal syndicate commerce.

## Structure
- `app/` - Next.js App Router pages and layouts
  - `admin/` - Member authorization & role management
  - `components/` - Shared UI components (Sidebar, Navbar, Guards)
  - `items/` - Inventory assets view
  - `kelola_barang/` - Master asset item management
  - `kelola_shop/` - Internal shop inventory & pricing settings
  - `login/` - Network access submission
  - `profile/` - Member account profile
  - `riwayat/` - Audit & transaction history logs
  - `shop/` - Syndicate internal marketplace
  - `transaksi/` - Manual ledger deposits & withdrawals
- `lib/` - Firebase configurations and Gang Context Provider
- `public/` - Static assets

## Getting Started
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).
