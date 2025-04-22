## 7. Security Audit Checklist

### Potential Vulnerabilities
- **SQL Injection** via unparameterized queries  
- **IPC Channel Misuse** (calling non‑exposed or unsafe handlers)  
- **Path Traversal** in file operations outside `/vault`  
- **Thumbnail/Preview Injection** (malicious media exploiting ffmpeg/sharp)  
- **Outdated Dependencies** with known CVEs  

### Recommended Scans & Tools
- **Dependency Audits**:  
  - `npm audit` in CI  
  - Snyk CLI for scheduled scans  
- **Static Analysis**:  
  - ESLint with `eslint-plugin-security`  
  - GitHub CodeQL workflows  
- **Dynamic Testing**:  
  - Electron Fuzzer (e.g. [electron-fuzzer](https://github.com/BlackDoorDev/electron-fuzzer))  
  - IPC fuzz scripts to simulate malformed payloads  

### Remediation Steps
1. **Parameterized Queries**  
   - Always bind parameters in `better‑sqlite3` (no string concatenation).  
2. **IPC Hardening**  
   - `contextIsolation: true`, `enableRemoteModule: false`  
   - Whitelist & validate IPC payloads (IDs as integers, paths under `/vault`).  
3. **Path Validation**  
   - Normalize and enforce whitelisted base directory (`/vault`) for all FS ops.  
4. **Content Security Policy**  
   - Define strict CSP in `index.html` to block inline scripts and remote resources.  
5. **Dependency Management**  
   - Automate `npm audit fix` and Snyk scans weekly in CI.  
   - Pin critical deps and review changelogs before upgrades.  
6. **Code Signing & Updates**  
   - Sign Windows installer with trusted cert  
   - Verify update package signatures in `autoUpdater`  
