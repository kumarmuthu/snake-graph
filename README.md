# 🐍 snake-graph

> **A self-hosted, interactive GitHub Contribution Snake** — no GitHub Actions, no third-party SVG service. Pure HTML +
> Canvas. Anyone can use it with their own username.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-3fb950?style=flat&logo=github)](https://kumarmuthu.github.io/snake-graph/)
[![Made With](https://img.shields.io/badge/Made%20With-HTML%20%2B%20Canvas-f9c74f?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Contributions API](https://img.shields.io/badge/Data-GitHub%20Contributions%20API-0e4429?style=flat)](https://github.com/grubersjoe/github-contributions-api)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat)](LICENSE)

---

## ✨ Features

| Feature                   | Details                                                                  |
|---------------------------|--------------------------------------------------------------------------|
| 🐍 Snake animation        | Greedy random walk — moves in all 4 directions, different path every run |
| 📊 Real contribution data | Fetches your actual GitHub contributions (no token needed)               |
| 🎨 GitHub dark theme      | Authentic green contribution colors matching GitHub's UI                 |
| 👤 Any username           | Enter any GitHub username to see their snake                             |
| ♻️ Auto-restart           | Loops forever with a new random path each cycle                          |
| 📦 Zero dependencies      | Single HTML file, no npm, no build step                                  |

---

## 🚀 Live Demo

👉 **[kumarmuthu.github.io/snake-graph](https://kumarmuthu.github.io/snake-graph/index.html)**

Type any GitHub username → press **Load** → watch the snake eat your contributions.

---

## 🛠️ Use It Yourself

### Option A — Use the hosted version

Just visit the live demo above and enter your username. Done.

### Option B — Host your own copy

```bash
# 1. Fork or clone this repo
git clone https://github.com/kumarmuthu/snake-graph.git

# 2. Enable GitHub Pages in Settings → Pages → Deploy from main branch

# 3. Visit https://<your-username>.github.io/snake-graph/
```

### Option C — Embed in your GitHub Profile README

Add a clickable link to your `README.md`:

```html
<!-- Snake Contribution Graph -->
<div>
    <h1 align="left"><strong>🐍 Snake Eating My Contributions</strong></h1>
    <a href="https://kumarmuthu.github.io/snake-graph/?user=YOUR_USERNAME" target="_blank">
        <img src="https://raw.githubusercontent.com/kumarmuthu/snake-graph/main/preview.png"
             alt="Snake Contribution Graph" width="800"/>
    </a>
    <br/>
    <sub>🐍 <a href="https://kumarmuthu.github.io/snake-graph/">Try it with your username →</a></sub>
</div>
```

> Replace `YOUR_USERNAME` with your GitHub username for a direct link.

---

## 🔌 How It Works

```
User enters GitHub username
        ↓
Fetch contributions from:
  https://github-contributions-api.jogruber.de/v4/<username>?y=last
        ↓
Map contribution levels (0–4) onto a 53×7 grid (1 year = 53 weeks)
        ↓
Build a greedy random walk path through all 371 cells
        ↓
Animate snake eating cells on HTML Canvas at 120ms/step
        ↓
Auto-restart with new random path after completion
```

**No GitHub token required.** Uses the free
public [github-contributions-api](https://github.com/grubersjoe/github-contributions-api)
by [@grubersjoe](https://github.com/grubersjoe).  
Falls back to randomised demo data if the username is not found.

---

## 📁 Project Structure

```
snake-graph/
├── index.html      ← entire app (single file, no dependencies)
├── preview.png     ← screenshot for README embed
└── README.md       ← this file
```

---

## 🎨 Customisation

Open `index.html` and tweak these constants at the top of the `<script>`:

```js
const SNAKE_LEN  = 5;    // snake body length (cells)
const FRAME_MS   = 120;  // animation speed (ms per step, higher = slower)
```

To change colors, edit the `COLORS` object:

```js
const COLORS = {
    l0: '#0e4429',   // lowest contribution level
    l1: '#006d32',
    l2: '#26a641',
    l3: '#39d353',   // highest contribution level
    tongue: '#ef233c',
};
```

---

## 🙏 Credits

- Contribution data — [github-contributions-api](https://github.com/grubersjoe/github-contributions-api)
  by [@grubersjoe](https://github.com/grubersjoe)
- Inspired by [platane/snk](https://github.com/platane/snk) (GitHub Actions version)
- Built from scratch with pure HTML Canvas — no external libraries

---

## 📄 License

MIT © [kumarmuthu](https://github.com/kumarmuthu)

---

<p align="center">
  Made with 🐍 by <a href="https://github.com/kumarmuthu">kumarmuthu</a>
</p>