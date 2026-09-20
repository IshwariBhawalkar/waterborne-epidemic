# Waterborne Epidemics — Interactive Presentation

An interactive web presentation on waterborne disease outbreaks, built as an educational project. Two landmark case studies — the 1854 Broad Street cholera outbreak in London and the 2000 Walkerton E. coli outbreak in Ontario — form the backbone of the piece, with interactive visualisations, a live contamination simulator, and a reconstructed version of John Snow's original death map.

---

## What's in it

**Frontend** (Cloudflare Pages)
- Full-page interactive presentation in plain HTML, CSS, and JavaScript
- Animated particle network hero with a live deaths-per-day counter based on WHO annual estimates
- Interactive contamination spread simulator built as a cellular automaton. Click to introduce a contamination source and watch it spread through a water grid. Hit chlorinate to see treatment take effect.
- Reconstructed John Snow dot map: an animated canvas drawing of his 1854 Soho death data, with hover tooltips on individual markers and the pump source
- Scroll-reveal animations and animated stat counters throughout
- Five-question quiz that pulls from the case study content and posts scores to the backend
- Chart.js bar chart of global waterborne disease mortality estimates
- Fully responsive down to mobile

**Backend** (Render — FastAPI)
- `POST /api/quiz/submit` — receives quiz scores from the frontend
- `GET /api/stats` — returns aggregate quiz data and static global statistics
- `GET /api/health` — basic uptime check
- In-memory store (no database required at this scale)
- CORS configured for Cloudflare Pages deployment

---

## Project structure

```
waterborne-epidemic/
├── frontend/
│   ├── index.html      Main HTML — all sections
│   ├── style.css       All styles (dark water theme, responsive)
│   └── script.js       Canvas animations, simulator, map, quiz, counters
├── backend/
│   ├── main.py         FastAPI application
│   ├── requirements.txt
│   └── Procfile        For Render deployment
├── .gitignore
└── README.md
```

---

## Running locally

**Frontend**

Open `frontend/index.html` in any browser. If you want hot reload, use VS Code Live Server or:

```bash
cd frontend
npx serve .
```

**Backend**

You need Python 3.10 or higher.

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`. Open `http://localhost:8000/docs` to see the auto-generated Swagger UI.

Once the backend is running locally, update the `API_BASE` constant at the top of `frontend/script.js`:

```js
const API_BASE = 'http://localhost:8000';
```

---

## Deploying

### GitHub

Create a new repository at github.com under your account (IshwariBhawalkar), then:

```bash
cd waterborne-epidemic
git init
git config user.name "Ishwari Bhawalkar"
git config user.email "your@email.com"
git add .
git commit -m "Initial commit — waterborne epidemic interactive presentation"
git branch -M main
git remote add origin https://github.com/IshwariBhawalkar/waterborne-epidemic.git
git push -u origin main
```

### Cloudflare Pages (frontend)

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **Workers & Pages** > **Create application** > **Pages**
3. Connect your GitHub account and select the `waterborne-epidemic` repository
4. Set the build configuration:
   - **Build command**: leave empty (no build step needed)
   - **Build output directory**: `frontend`
5. Click **Save and Deploy**

Cloudflare will give you a `.pages.dev` URL. Every push to `main` triggers a new deployment automatically.

### Render (backend)

1. Go to [render.com](https://render.com) and sign up / log in
2. Click **New** > **Web Service**
3. Connect your GitHub account and select the `waterborne-epidemic` repository
4. Configure the service:
   - **Name**: waterborne-api (or whatever you like)
   - **Root directory**: `backend`
   - **Runtime**: Python 3
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance type**: Free
5. Click **Create Web Service**

Render will give you a URL like `https://waterborne-api.onrender.com`.

Once you have that URL, update `API_BASE` in `frontend/script.js`:

```js
const API_BASE = 'https://waterborne-api.onrender.com';
```

Commit and push that change. Cloudflare will redeploy the frontend automatically.

Also update the CORS `allow_origins` list in `backend/main.py` to include your Cloudflare Pages URL, then remove the `"*"` wildcard:

```python
allow_origins=[
    "https://your-site.pages.dev",
    "https://your-custom-domain.com",   # if you add one later
],
```

Push that change to trigger a Render redeploy.

---

## Data sources

- WHO Global Burden of Disease 2023 estimates — waterborne disease mortality
- Snow, J. (1855). *On the Mode of Communication of Cholera*, 2nd ed. Churchill, London. Available via PubMed Central.
- O'Connor, D.R. (2002). *Report of the Walkerton Inquiry*, Parts 1 and 2. Ontario Ministry of the Attorney General.
- Walkerton Clean Water Centre — case history documentation
- John Snow Society — historical records and the original Broad Street pump

---

## Notes on the live death counter

The counter on the hero section shows estimated deaths from waterborne disease since midnight local time. It is calculated from WHO's annual estimate of approximately 2,000,000 deaths per year, divided to a per-second rate. It is not a live data feed. It is a way of making an abstract statistic feel concrete.

---

*Ishwari Bhawalkar — 2026*
