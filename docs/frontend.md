## 4. Frontend Guidelines

### Design System
- **Typography**  
  - Base font: 16px / 1rem (`body1`).  
  - Scale:  
    - **H1**: 2.125rem (34px)  
    - **H2**: 1.75rem (28px)  
    - **H3**: 1.5rem (24px)  
    - **H4**: 1.25rem (20px)  
    - **Body**: 1rem (16px)  
    - **Caption**: 0.875rem (14px)  
  - Line‑height: 1.5 for body text, 1.25 for headings.

- **Color Palette**  
  - **Primary**: `#1976d2` / `#115293`  
  - **Secondary**: `#dc004e` / `#9a0036`  
  - **Background**: `#fafafa` (light), `#121212` (dark)  
  - **Surface**: `#ffffff`, `#1e1e1e`  
  - **Text**: `#000000` (light), `#ffffff` (dark)  
  - **Accents**: Use MUI theme colors (success, warning, error, info).

- **Spacing**  
  - 8px grid (`theme.spacing(1)` = 8px)  
  - Use multiples: 8, 16, 24, 32px for margins & padding  
  - Maintain 16px gutter between cards and list items.

### Component Library & Patterns
- **Folder Structure**  
    /src  
    ├── components/       # Reusable UI components  
    │   ├── atoms/        # Buttons, Inputs, Icons  
    │   ├── molecules/    # FormField (label + input)  
    │   └── organisms/    # LibraryToolbar, AssetGrid  
    ├── containers/       # Stateful components, data fetching  
    ├── hooks/            # Custom hooks (e.g. useAssets)  
    ├── theme/            # MUI theme overrides & tokens  
    └── pages/            # Top-level views (LibraryView, Settings)  

- **Component Patterns**  
  - **Presentational vs Container**  
    - Presentational: Stateless, UI-only in `/components`  
    - Container: Stateful, data‑fetching in `/containers` or via hooks  

- **Props & State**  
  - Favor prop‑driven data flow; lift state up  
  - Use a lightweight state library (Zustand) for global filters  

- **Styling**  
  - Use MUI’s `sx` prop or `styled()` API  
  - Reference design tokens: `theme.palette`, `theme.typography`, `theme.spacing`

### Accessibility Considerations
- **Semantic HTML**  
  - Use proper landmarks: `<main>`, `<nav>`, `<button>`, `<header>`, `<aside>`  
  - Ensure form controls have associated `<label>` elements  

- **Keyboard Navigation**  
  - All interactive elements must be reachable via `Tab`  
  - Visible focus indicators (do not remove default outlines)  

- **ARIA & Screen Readers**  
  - Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on title  
  - Icon buttons: include `aria-label` describing the action  

- **Color Contrast**  
  - Maintain text contrast ≥4.5:1 for normal text, ≥3:1 for large text  
  - Test with tools like Lighthouse or axe  

- **Testing**  
  - Automate accessibility checks with `jest-axe` or `axe-core`  
  - Perform manual testing with NVDA and VoiceOver on key screens  

### IPC & Data Fetching
- Centralize IPC calls with a `useApi` hook (handles loading/errors)  
- Show MUI `<Skeleton>` loaders during fetch

### Performance
- Virtualize grids/lists using `react-window` for 10K+ assets  
- Lazy‑load thumbnails (`<img loading="lazy">`)

### Error Handling
- Wrap main views in React Error Boundaries  
- Display non‑blocking error banners with “Retry”

### Drag & Drop
- Support OS file drops into the library (`onDrop`)  
- Add right‑click context menu via Electron’s Menu API

### Dev Tooling
- ESLint & Prettier for consistent style  
- Enable source maps in dev for renderer & main processes
