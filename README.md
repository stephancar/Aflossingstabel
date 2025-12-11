# Steefware Hypotheek Simulator

Moderne React/Vite + Tailwind calculator (NL/EN) om hypotheken te simuleren met annuïtaire berekening, CAP/FLOOR (variabel), maand- en jaaroverzichten, CSV-export en lichte Steefware-branding.

## Local development
```bash
npm install
npm run dev
```
Open de URL die Vite toont (standaard `http://localhost:5173`).

## Build
```bash
npm run build
```
Output staat in `dist/` (niet gecommit). Gebruik `npm run preview` om de productiebuild lokaal te testen.

## Deployment (GitHub Pages)
Workflow: `.github/workflows/deploy.yml` bouwt en publiceert de `dist/`-artifact naar Pages op pushes naar `main`.
