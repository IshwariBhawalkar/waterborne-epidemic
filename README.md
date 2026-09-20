<div align="center">

# Waterborne Epidemics
### An interactive web presentation by Ishwari Bhawalkar

[![Live Site](https://img.shields.io/badge/Live%20Site-waterborne--epidemic.pages.dev-blue?style=for-the-badge&logo=cloudflare)](https://waterborne-epidemic.pages.dev)
[![Backend](https://img.shields.io/badge/API-Render%20FastAPI-009688?style=for-the-badge&logo=fastapi)](https://waterborne-epidemic.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-IshwariBhawalkar-181717?style=for-the-badge&logo=github)](https://github.com/IshwariBhawalkar/waterborne-epidemic)

[![HTML](https://img.shields.io/badge/Frontend-HTML%20%2F%20CSS%20%2F%20JS-orange?style=flat-square)](https://waterborne-epidemic.pages.dev)
[![Python](https://img.shields.io/badge/Backend-Python%203.11-3776AB?style=flat-square&logo=python)](https://waterborne-epidemic.onrender.com)
[![Deployed on](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflare)](https://pages.cloudflare.com/)
[![API on](https://img.shields.io/badge/API%20on-Render-46E3B7?style=flat-square)](https://render.com)
[![Data](https://img.shields.io/badge/Data-WHO%202023-005EB8?style=flat-square)](https://www.who.int/data/gho)

</div>

---

Waterborne disease kills roughly 2 million people every year. That number sits in a WHO report and most people scroll past it. This project is an attempt to make that number impossible to ignore.

It is a full-length interactive presentation built around two real outbreaks. The 1854 Broad Street cholera outbreak in London, which killed 616 people in 11 days and effectively invented the field of epidemiology. And the 2000 Walkerton E. coli outbreak in Ontario, where a small Canadian town lost 7 people and 2,300 got sick because a utility operator delayed a public advisory by four days. Both outbreaks are reconstructed with real data, real timelines, and interactive tools you can actually use.

The site has a live contamination spread simulator, an animated rebuild of John Snow's original 1854 death map, animated WHO stat counters, a Chart.js mortality breakdown, and a five-question quiz that posts to a live backend.

---

## Table of Contents

- [What you see on the site](#what-you-see-on-the-site)
- [How it actually works](#how-it-actually-works)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Deploying](#deploying)
- [Data sources and accuracy](#data-sources-and-accuracy)
- [Technical notes](#technical-notes)

---

## What you see on the site

### Hero section

The first thing you land on is a full-viewport black screen with a particle network animation running behind the headline. The particles and the connecting lines are drawn entirely on a `<canvas>` element using the HTML5 Canvas 2D API. Each particle has its own velocity vector; when two particles come within 120px of each other a line draws between them. Nothing is pre-rendered or looping a GIF — it is all calculated per frame with `requestAnimationFrame`.

Top-right corner has the live deaths counter. It shows estimated waterborne disease deaths since midnight. The number is calculated in real time every second:

```
deaths per second = 2,000,000 / 365 / 24 / 3600
deaths today      = deaths per second × seconds elapsed since midnight (local time)
```

It is not a live data feed from any external API. It is WHO's annual estimate of 2 million deaths per year, expressed as a rate applied to the current time. The number you see is accurate as an estimate. The point is to make a statistic feel real rather than abstract.

The navbar shows "Crisis Active" with a blinking amber dot. That is CSS — a `@keyframes` animation on `opacity` cycling between 1 and 0.3 on a 1.2s loop.

---

### Overview section

A quick framing of what waterborne diseases are: pathogens (bacteria, viruses, protozoa) that enter water supplies through contamination. Three animated counters load when you scroll to this section using `IntersectionObserver`. The numbers are from WHO Global Burden of Disease 2023 estimates:

- **2,000,000** deaths from waterborne disease annually
- **785,000,000** people without access to clean drinking water
- **2,000,000,000** people using water contaminated with faecal matter

The counters use a cubic ease-out function so they feel weighty rather than linear:

```js
const ease = 1 - Math.pow(1 - progress, 3);
currentValue = Math.round(ease * target);
```

---

### Contamination Simulator

The simulator is a cellular automaton built on a `<canvas>` element 640px wide by 400px tall. The grid is 64 columns by 40 rows, so each cell is 10x10px.

Every cell in the grid has one of four states:

| State | Colour | What it means |
|---|---|---|
| CLEAN | Teal (#00e5c8) | Safe water |
| INFECTED | Red (#ff2d55) | Contaminated |
| TREATING | Amber (#ffcc00) | Chlorination active |
| ISOLATED | Dark grey | Quarantined cell |

**How the spread works:**

Each simulation tick (every 120ms), every INFECTED cell has an 18% probability of infecting each of its four neighbours (up, down, left, right) if that neighbour is currently CLEAN. The simulation runs with `setInterval`. This 18% rate is not arbitrary — it is a rough analogue for how pathogens spread through a connected water distribution system where not every pipe junction leads to contamination.

**The buttons:**

- **Add Source** — drops a new INFECTED cell at a random point in the grid
- **Chlorinate** — sets all INFECTED cells to TREATING state. TREATING cells do not spread and gradually recover to CLEAN over several ticks
- **Reset** — clears the entire grid back to CLEAN

The sim is intentionally simplified — it does not model pressure differentials, pipe topology, or pathogen concentration decay. It is a demonstration, not an epidemiological model.

---

### Case Study 1 — Broad Street Pump, London 1854

The Soho neighbourhood of London in August 1854 had a major cholera outbreak. 616 people died in 11 days. A physician named John Snow noticed that deaths were concentrated in a very small area and not distributed across the wider neighbourhood. He went door to door and mapped every death he could find by address.

What he found was a tight cluster around a public water pump on Broad Street. Workers at a nearby brewery were mostly unaffected — they drank beer, not pump water. The workhouse down the street had almost no deaths — they had their own well. Snow used this pattern to argue the pump was the source. He convinced local authorities to remove the handle from the pump. New cases dropped sharply.

Later investigation found a cesspit three feet from the pump had been leaking sewage-contaminated water into the water supply. The pathogen was Vibrio cholerae.

This case study section on the site has a full timeline, a data panel with the key numbers (616 deaths, 11 days to peak, location), and feeds into the Snow's Map section below.

---

### John Snow's Dot Map, Rebuilt

This is the most technically detailed section of the site. Snow's original 1854 fieldwork plotted 578 individual deaths on a street map of the Soho neighbourhood. The site rebuilds this on canvas.

The map background is drawn with the `<canvas>` 2D API: streets are drawn as lines, labelled with the actual street names from 1854 (Broad Street, now Broadwick Street; Oxford Street; Poland Street; Wardour Street; Regent Street). The Broad Street pump is marked with a yellow circle and a "PUMP" label.

The deaths are plotted as animated red circles, revealed one at a time in sequence, sorted by distance from the pump. The animation gives you the same visual discovery Snow had when he laid his data out on paper: the cluster forms before your eyes.

Totals shown live as the animation runs (e.g. "178 / 578"). Each death marker is interactive — clicking any cluster shows information about that data point.

The animation uses `requestAnimationFrame` with a 30ms delay between each dot so the reveal is fast but readable.

---

### Case Study 2 — Walkerton, Ontario 2000

May 2000. Heavy rain in rural Ontario washed cattle manure from a nearby farm into Well 5, one of the town of Walkerton's water supply wells. The well was not adequately protected against surface runoff and the chlorination system was under-maintained.

The Walkerton Public Utilities Commission knew something was wrong before the public did. Water samples sent to a lab on May 15 came back positive for E. coli and fecal coliforms. The utility did not notify the local health unit for another four days. By the time a boil-water advisory went out on May 21, people were already sick.

Final toll: 7 dead, 2,300 ill out of a town of 4,800, several people with permanent kidney damage. The subsequent O'Connor Inquiry found failures at the utility, the province, and in the regulatory framework that had been stripped back through budget cuts during the 1990s.

The site covers the timeline of the delay, the pathogens involved (E. coli O157:H7 and Campylobacter jejuni), the source, and the regulatory failures.

---

### Global Impact section

Four animated stat counters (same cubic ease-out animation as the overview) plus a Chart.js bar chart. The chart shows estimated annual deaths by waterborne disease category according to WHO 2023 GBD estimates.

The counters:

| Stat | Value | Source |
|---|---|---|
| People killed by waterborne disease each year | 2,000,000 | WHO GBD 2023 |
| Children under 5 dying daily from diarrhoeal disease | 1,400 | WHO GBD 2023 |
| People without access to clean drinking water | 785,000,000 | WHO GBD 2023 |
| People using water contaminated with faecal matter | 2,000,000,000 | WHO GBD 2023 |

The Chart.js chart uses `chart.umd.min.js` loaded from `cdnjs.cloudflare.com`. The data is hardcoded from WHO 2023 estimates, not pulled from a live API.

---

### Quiz

Five questions drawn from the case study content. No trick questions. Examples:

- What key observation did John Snow make that pointed to the Broad Street pump?
- How many days elapsed before Walkerton issued a public boil-water advisory?
- What pathogens were responsible for the Walkerton outbreak?

When you finish, the frontend sends a `POST /api/quiz/submit` request to the Render backend with your score and total. The backend returns a result message:

| Score | Message |
|---|---|
| 100% | Perfect score. Outstanding. |
| 80% or above | Strong result. |
| 60% or above | Good effort. |
| Below 60% | Worth another read-through. |

The backend stores all submissions in memory and tracks aggregate stats accessible at `GET /api/stats`.

---

### Prevention section

Cards covering what actually reduces waterborne disease burden: water treatment infrastructure, proper sanitation systems, surveillance and early warning, and emergency response protocols. Context from both case studies is woven in.

---

## How it actually works

### Frontend

Zero frameworks. No React, no Vue, no build step. Plain HTML, CSS, and JavaScript. This was intentional for a Cloudflare Pages deployment where a build step is unnecessary overhead and vanilla JS is more than capable.

Key JavaScript systems in `script.js`:

**Particle hero canvas** — an IIFE (`initHeroCanvas()`) that initialises an array of particle objects, each with x/y position, velocity, and opacity. The `animate()` loop clears the canvas and redraws everything each frame. Line thickness between particles scales with proximity.

**Scroll reveal** — a single `IntersectionObserver` watches every element with the class `.r`. When a `.r` element enters the viewport (threshold: 10%), the class `.show` is added. CSS handles the transition: opacity from 0 to 1, translateY from 32px to 0, over 0.6s with `cubic-bezier(0.16, 1, 0.3, 1)`.

**Animated counters** — another `IntersectionObserver` triggers when a `.counter` element enters the viewport. The target value comes from `data-target` on the element. The counter runs for 2000ms using `requestAnimationFrame` with the cubic ease-out formula.

**Contamination simulator** — described above. State is kept in a flat typed array (`Uint8Array`) for performance. The grid is redrawn every tick by iterating the array and calling `fillRect` for each cell.

**Snow's map** — canvas 2D drawing. Street lines are hardcoded coordinates mapped to the canvas viewport. Death positions are from Snow's original data approximated to the grid. Animated with a `setInterval` that reveals one dot every 30ms.

**Quiz** — five question objects with text, answer options (A/B/C/D), and the correct answer index. Navigation between questions is handled in JS. On completion, `fetch()` sends a JSON body to the backend.

**Live counter** — `setInterval` runs every 1000ms. On each tick, it calculates seconds since midnight and multiplies by `2_000_000 / 365 / 24 / 3600`.

### Backend

FastAPI application in `backend/main.py`. Deployed on Render's free tier.

**Endpoints:**

```
GET  /                   Project info and endpoint listing
GET  /api/health         Uptime check — returns current UTC timestamp
POST /api/quiz/submit    Accepts { score, total } — returns result message
GET  /api/stats          Returns aggregate quiz data and WHO global statistics
```

**`POST /api/quiz/submit` request body:**
```json
{
  "score": 4,
  "total": 5
}
```

**`POST /api/quiz/submit` response:**
```json
{
  "received": true,
  "score": 4,
  "total": 5,
  "percentage": 80.0,
  "message": "Strong result."
}
```

**`GET /api/stats` response:**
```json
{
  "quiz": {
    "total_submissions": 12,
    "average_score_percent": 72.5
  },
  "global_waterborne_facts": {
    "annual_deaths_estimate": 2000000,
    "children_under5_daily": 1400,
    "people_without_clean_water": 785000000,
    "people_using_contaminated": 2000000000,
    "source": "WHO Global Burden of Disease, 2023"
  },
  "case_studies": {
    "broad_street_1854": {
      "deaths": 616,
      "days_to_peak": 11,
      "pathogen": "Vibrio cholerae",
      "location": "Soho, London, England"
    },
    "walkerton_2000": {
      "deaths": 7,
      "illnesses": 2300,
      "pathogen": "E. coli O157:H7 and Campylobacter jejuni",
      "location": "Walkerton, Ontario, Canada",
      "days_delay_in_advisory": 4
    }
  }
}
```

Submissions are stored in an in-memory Python list (`quiz_submissions: list[dict]`). This means the data resets each time Render restarts the service (which happens on the free tier after inactivity). For a persistent store you would swap this for a database.

CORS is locked to the production frontend URL — no wildcard. The `allow_origins` list in `main.py` includes `https://waterborne-epidemic.pages.dev` and `http://localhost:3000` for local development.

---

## Project structure

```
waterborne-epidemic/
├── frontend/
│   ├── index.html          All sections — navbar through footer
│   ├── style.css           Full stylesheet (CSS custom properties, dark theme, responsive)
│   └── script.js           All JS — canvas animations, simulator, map, quiz, counters
│
├── backend/
│   ├── main.py             FastAPI application with all routes
│   ├── requirements.txt    Python dependencies
│   ├── Procfile            Start command for Render
│   └── runtime.txt         Python version pin (3.11.9)
│
├── .gitignore
└── README.md
```

No build tool. No package.json. No node_modules. The frontend is three files.

---

## Running locally

### Frontend

Open `frontend/index.html` directly in Chrome or Firefox. Everything works without a server except the quiz backend calls, which will fail if the backend is not running.

For hot reload during development:

```bash
cd frontend
npx serve .
```

Or use VS Code with the Live Server extension.

### Backend

Requires Python 3.10 or higher (3.11 recommended).

```bash
cd backend
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`. Swagger UI auto-generated docs are at `http://localhost:8000/docs`.

To point the frontend at your local backend during development, update `API_BASE` at the top of `script.js`:

```js
const API_BASE = 'http://localhost:8000';
```

Remember to change it back before pushing.

---

## Deploying

### Push to GitHub

If you have not initialised the repo yet:

```bash
cd waterborne-epidemic
git init
git config user.name "Ishwari Bhawalkar"
git config user.email "your@email.com"
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/IshwariBhawalkar/waterborne-epidemic.git
git push -u origin main
```

For subsequent changes:

```bash
git add .
git commit -m "Your message here"
git push origin main
```

Both Cloudflare Pages and Render are connected to this repo and redeploy automatically on every push to `main`.

### Cloudflare Pages (frontend)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Workers & Pages > Create application > Pages > Connect to Git
3. Select the `waterborne-epidemic` repository
4. Build settings:
   - Build command: leave blank
   - Build output directory: `frontend`
5. Save and Deploy

Every push to `main` triggers an automatic deployment. The free tier covers unlimited deployments and bandwidth for personal projects.

### Render (backend)

1. Go to [render.com](https://render.com) and create a free account
2. New > Web Service > Connect GitHub repo
3. Settings:
   - Root directory: `backend`
   - Runtime: Python 3
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Instance type: Free
4. Create Web Service

Render will give you a URL. Put that URL into `API_BASE` in `script.js`, push, and Cloudflare will redeploy the frontend.

**Note on Render free tier:** The service spins down after 15 minutes of inactivity. The first request after a sleep period takes 30-50 seconds to respond. This is a Render free tier limitation. The quiz just takes a moment to respond on a cold start.

---

## Data sources and accuracy

Every number on this site has a source.

| Data point | Source |
|---|---|
| 2,000,000 annual deaths from waterborne disease | WHO Global Burden of Disease 2023 |
| 1,400 children under 5 dying daily from diarrhoeal disease | WHO GBD 2023 |
| 785,000,000 people without clean water | WHO/UNICEF JMP 2023 |
| 2,000,000,000 people using contaminated water | WHO GBD 2023 |
| 616 deaths — Broad Street outbreak 1854 | Snow, J. (1855). *On the Mode of Communication of Cholera*, 2nd ed. Churchill, London. |
| 578 deaths plotted in Snow's original map | Same primary source. Fieldwork records via John Snow Society. |
| 7 deaths, 2,300 ill — Walkerton 2000 | O'Connor, D.R. (2002). *Report of the Walkerton Inquiry*, Parts 1 & 2. Ontario Ministry of the Attorney General. |
| 4-day delay in boil-water advisory — Walkerton | O'Connor Inquiry, Part 1, Chapter 3 |

The live deaths counter is a rate-based estimate, not a live data feed. It is labeled as such on the site.

---

## Technical notes

**Why no framework?**

The entire frontend is three files. Adding a framework like React would mean a build pipeline, a `node_modules` folder, and a bundler, none of which are needed when the UI is a single-page presentation. Vanilla JS does everything here without the overhead.

**Why FastAPI over Flask or Express?**

Pydantic models give automatic request validation and a free Swagger UI at `/docs`. For a small API with two or three routes, FastAPI is low-effort and deploys cleanly on Render.

**Why Cloudflare Pages over Netlify or Vercel?**

No build required for a vanilla HTML project means Cloudflare Pages is effectively instant to configure. The free tier has no monthly bandwidth limits for static files, which matters if this gets any traffic.

**pydantic version note:**

`requirements.txt` pins `pydantic>=2.10.0`. Earlier versions of pydantic-core (around 2.18.x) do not have pre-built wheels for Python 3.14, which causes Render builds to fail while trying to compile Rust. Pinning to 2.10.0+ ensures a pre-built wheel is available and the build takes seconds.

---

## Acknowledgements

John Snow, whose 1854 fieldwork under genuinely hostile conditions (the medical establishment at the time rejected the germ theory of disease entirely) gave us the foundation of modern epidemiology.

The families in Walkerton who lost people, and who gave detailed testimony to the O'Connor Inquiry that made the public record of what happened so thorough.

---

*Ishwari Bhawalkar — 2026*
