# T-Skill Frontend (from Figma Make)

## Run locally (Figma / Cursor workflow)

1. In Cursor: **File → Open Folder** → select this `frontend` folder  
   (or open the whole `T-Skill App` repo and use the integrated terminal)

2. Install dependencies:

   ```bash
   pnpm install
   ```

   If `pnpm` is not installed:

   ```bash
   npm install -g pnpm
   # or use: npm install
   ```

3. Start the dev server:

   ```bash
   pnpm dev
   ```

4. Open http://localhost:5173 in your browser.

## Note about `T-Skill App.make`

The `.make` file in the parent folder is a **Figma project backup**, not the runnable export.
If Figma offers **Export code** / **Download project**, use that ZIP and replace this folder,
or copy its files into `frontend/`.

This `frontend/` folder was built from your Make chat export so you can follow the same workflow.

## Backend

Start the Python API from the project root (see main README):

```bash
uvicorn src.api:app --reload --port 8000
```

Vite proxies `/api` → `http://localhost:8000`.
