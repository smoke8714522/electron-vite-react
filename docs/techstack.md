## Tech Stack Recommendation

### Frontend  
**Choice:** React + Vite + Material UI + Zustand  
**Why this?**  
- **React**: Huge ecosystem, component‑driven architecture, excellent AI‑assisted tooling.  
- **Vite**: Ultra‑fast dev server and builds with minimal config.  
- **Material UI**: Ready‑made, accessible components and theming out of the box.  
- **Zustand**: Lightweight, provider‑less global state management; selective subscriptions minimize re‑renders.  
**Alternatives considered:**  
- **Chakra UI** (simpler API but smaller community)  
- **Ant Design** (more components but heavier CSS bundle)  
- **Vue + Vuetify** (good UI library but fewer Electron/Vite examples)  
- **Redux** (powerful but more boilerplate)  
- **React Context** (built‑in but can incur unnecessary re‑renders)  
**Community & Resources:**  
- React docs: https://reactjs.org  
- Vite docs: https://vitejs.dev  
- MUI docs: https://mui.com  
- Zustand docs: https://github.com/pmndrs/zustand  
- Search keywords: “Electron React Vite tutorial”, “Material UI Electron”, “Zustand React state”  

### Backend  
**Choice:** Electron (Node.js + TypeScript)  
**Why this?**  
- **Electron**: Mature desktop runtime, full Node API access, rich community plugins.  
- **TypeScript**: Static typing catches errors early, great IDE support.  
**Alternatives considered:**  
- **Tauri (Rust)**: Much smaller binaries & better security but steeper Rust learning curve.  
- **NW.js**: Similar to Electron but with a smaller ecosystem.  
- **Neutralino.js**: Lightweight, but limited third‑party modules.  
**Community & Resources:**  
- Electron docs: https://www.electronjs.org  
- TypeScript docs: https://www.typescriptlang.org  
- Search keywords: “Electron TypeScript starter”, “Electron boilerplate TS”  

### Database  
**Choice:** SQLite via better‑sqlite3 with FTS5  
**Why this?**  
- **SQLite**: Zero‑config, file‑based DB that’s fast on local disks.  
- **better‑sqlite3**: Synchronous API, easy migrations, works seamlessly in Electron’s main process.  
- **FTS5**: Built‑in full‑text search extension for rapid metadata queries.  
**Alternatives considered:**  
- **LokiJS**: In‑memory DB with persistence but limited query power.  
- **IndexedDB (Dexie.js)**: Browser‑only and not ideal for main‑process logic.  
- **NeDB**: Less maintained, slower on large datasets.  
**Community & Resources:**  
- SQLite: https://www.sqlite.org  
- better‑sqlite3: https://github.com/WiseLibs/better-sqlite3  
- Search keywords: “SQLite FTS5 Electron”, “better-sqlite3 tutorial”  

### Deployment & Updates  
**Choice:** electron‑builder + GitHub Releases autoUpdater  
**Why this?**  
- **electron‑builder**: One tool for NSIS installers, code signing, cross‑platform packaging.  
- **autoUpdater**: Seamless in‑app updates via GitHub Releases with minimal setup.  
**Alternatives considered:**  
- **Electron Forge**: Easier to get started but fewer packaging options.  
- **electron-packager** + **update-electron-app**: More manual scripting required.  
**Community & Resources:**  
- electron‑builder: https://www.electron.build  
- autoUpdater guide: https://www.electronjs.org/docs/latest/api/auto-updater  
- Search keywords: “electron-builder setup”, “Electron autoUpdater GitHub”  

### Starter Template  
**Choice:** [electron-vite/electron-vite-react](https://github.com/electron-vite/electron-vite-react)  
**Why this?**  
- **Popularity & Maintenance**: 2.1 k stars, active commits, official Electron‑Vite support.  
- **Ready for TS & Vite**: Built‑in React + Vite setup, ESM modules, HMR, testing scaffold.  
- **Easy MUI Integration**: Simply install `@mui/material` and theming boilerplate.  
**Get Started:**  
```bash
# scaffold a new project
npm create electron-vite@latest my-app -- --template react
cd my-app
# add Material UI & Zustand
npm install @mui/material @emotion/react @emotion/styled zustand
# run in dev
npm run dev
