## Goal
Installed app (desktop + mobile PWA) e ekta **Back button** add kora — jeta browser er moto history navigation dei, karon installed window e default back button thake na.

## Approach

**Hybrid: Window Controls Overlay (desktop) + In-app floating Back button (mobile/fallback)**

### 1. Manifest update (`public/manifest.webmanifest`)
- `display_override: ["window-controls-overlay", "standalone"]` add kora
- `display: "standalone"` rakha (fallback)

Eta enable korle desktop installed app er title bar er pasher khali jaiga te amra custom UI bosate parbo.

### 2. `<PWABackButton />` component (new)
`src/components/pwa-back-button.tsx` — ekta smart component je:

- **Detect kore** app installed/standalone mode e cholche kina:
  - `window.matchMedia('(display-mode: standalone)').matches`
  - `window.matchMedia('(display-mode: window-controls-overlay)').matches`
  - `navigator.standalone` (iOS)
- Jodi installed → button render kore. Browser tab e (normal web) → kichu render kore na (karon browser er nijer back ace).
- **Desktop (WCO mode)**: title-bar overlay area te bosbe — `env(titlebar-area-x)` / `titlebar-area-height` CSS env vars use kore, `-webkit-app-region: no-drag` set kore clickable.
- **Mobile/standalone**: top-left e ekta small floating circular button (safe-area inset respect kore).
- Click → `router.history.back()` (TanStack Router) call korbe. History empty hole `/app/dashboard` e fallback navigate.
- Disabled state: jodi history length ≤ 1, button dim/disabled dekhabe.

### 3. Mount globally
`src/routes/__root.tsx` e `<PWABackButton />` mount kora (Outlet er pashe), jate sob route e available thake. Ad-free / auth route gulor moto admin panel e o thakbe — back navigation universal.

### 4. Styling
- Glassmorphism button matching existing theme (primary color border, blur bg)
- Size: 32px desktop overlay e, 40px mobile floating
- z-index high so always on top
- Subtle hover + active animation (Framer Motion already in project)

### 5. CSS additions (`src/styles.css`)
- `.titlebar-safe` utility for `env(titlebar-area-*)` positioning
- Mobile floating position with `env(safe-area-inset-top)`

## Out of scope
- Forward button (user only chaiche back)
- Refresh/Home buttons
- Native window minimize/close controls (browser handles)
- Service worker / offline changes (already configured)

## What user sees
- **Browser tab e**: kono change nei (browser er own back button ace).
- **Desktop installed app**: title bar er left side e ekta small back arrow button.
- **Mobile installed (Add to Home Screen)**: top-left corner e floating back button, YouTube app er moto.

## Caveat
Installed users der manifest update peyte app reinstall ba browser refresh lagte pare (iOS/Android manifest cache kore). Notun installers shathe shathe peye jabe.