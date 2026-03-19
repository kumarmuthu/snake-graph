// generate-snake.js
// Run: node generate-snake.js <username>
// Outputs: snake-dark.svg
// Requires: GITHUB_TOKEN env variable (automatically available in GitHub Actions)

const https = require('https');
const fs    = require('fs');

const username = process.argv[2] || 'kumarmuthu';
const COLS = 53, ROWS = 7, CELL = 13, GAP = 3, STEP = CELL + GAP;
const W = COLS * STEP - GAP;
const H = ROWS * STEP - GAP;
const SNAKE_LEN = 5;

// ── Edit snake colors here ─────────────────────────────────────────
const SNAKE_COLORS = {
  empty:      '#161b22',
  border:     '#21262d',
  levels:     ['#161b22','#0e4429','#006d32','#26a641','#39d353'],
  head:       '#4caf50',
  headBorder: '#2e7d32',
  bodyHead:   [20, 150],
  bodyTail:   [20, 90],
  bodyBorder: '#145214',
  eye:        '#0d1117',
  tongue:     '#ef233c',
};
// ──────────────────────────────────────────────────────────────────
const COLORS = {
  empty:  SNAKE_COLORS.empty,
  border: SNAKE_COLORS.border,
  levels: SNAKE_COLORS.levels,
  head:   SNAKE_COLORS.head,
  tongue: SNAKE_COLORS.tongue,
  eye:    SNAKE_COLORS.eye,
};

// ── GitHub GraphQL API → flat contributions array ─────────────────
// Maps GitHub's contributionLevel string → numeric level 0–4
// (same values that jogruber returns as entry.level)
const LEVEL_MAP = {
  NONE:             0,
  FIRST_QUARTILE:   1,
  SECOND_QUARTILE:  2,
  THIRD_QUARTILE:   3,
  FOURTH_QUARTILE:  4,
};

function fetchContributions(user) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN env variable is required. Add it to your workflow env: block.');
  }

  const query = JSON.stringify({
    query: `{
      user(login: "${user}") {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionLevel
                contributionCount
                date
              }
            }
          }
        }
      }
    }`
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path:     '/graphql',
      method:   'POST',
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(query),
        'User-Agent':    'snake-graph-generator',
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errors) { reject(new Error(JSON.stringify(json.errors))); return; }
          const cal = json.data.user.contributionsCollection.contributionCalendar;
          console.log(`✅ Total contributions from GitHub: ${cal.totalContributions}`);

          // ── Flatten weeks → same shape as jogruber's contributions array ──
          // { date, level, count }  so fillGridFromData works identically to index.html
          const flat = [];
          cal.weeks.forEach(week => {
            week.contributionDays.forEach(day => {
              flat.push({
                date:  day.date,
                level: LEVEL_MAP[day.contributionLevel] ?? 0,
                count: day.contributionCount,
              });
            });
          });

          resolve(flat);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(query);
    req.end();
  });
}

// ── EXACT COPY of fillGridFromData from index.html ─────────────────
// Do NOT change this logic — it must stay in sync with index.html
// so the SVG and the canvas always show the same grid.
function buildGrid(contributions) {
  const grid = [];
  for (let c = 0; c < COLS; c++) { grid[c] = []; for (let r = 0; r < ROWS; r++) grid[c][r] = 0; }

  const total    = contributions.length;
  const slice    = contributions.slice(Math.max(0, total - COLS * ROWS));
  const firstDow = new Date(slice[0].date).getDay();   // 0=Sun … 6=Sat

  slice.forEach((entry, idx) => {
    const col = Math.floor((idx + firstDow) / ROWS);
    const row = (idx + firstDow) % ROWS;
    if (col < COLS && row < ROWS) {
      grid[col][row] = entry.level;                    // 0–4, same as index.html
    }
  });

  return grid;
}
// ──────────────────────────────────────────────────────────────────

function buildPath() {
  let seed = 42;
  function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function shuffle(a) {
    for (let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  const total=COLS*ROWS, vis=new Uint8Array(total), result=[];
  let c=0, r=0;
  while(result.length<total){
    vis[c*ROWS+r]=1; result.push([c,r]);
    const dirs=shuffle([...DIRS]); let moved=false;
    for(const[dc,dr]of dirs){const nc=c+dc,nr=r+dr;if(nc>=0&&nc<COLS&&nr>=0&&nr<ROWS&&!vis[nc*ROWS+nr]){c=nc;r=nr;moved=true;break;}}
    if(!moved){
      const q=[[c,r]],seen=new Uint8Array(total);seen[c*ROWS+r]=1;let found=false;
      while(q.length){
        const[qc,qr]=q.shift();
        for(const[dc,dr]of DIRS){
          const nc=qc+dc,nr2=qr+dr;
          if(nc>=0&&nc<COLS&&nr2>=0&&nr2<ROWS){
            const k=nc*ROWS+nr2;
            if(!seen[k]){seen[k]=1;if(!vis[k]){c=nc;r=nr2;found=true;break;}q.push([nc,nr2]);}
          }
        }
        if(found)break;
      }
      if(!found)break;
    }
  }
  return result;
}

async function main() {
  console.log(`Fetching contributions for ${username} via GitHub GraphQL API...`);
  let grid;
  try {
    const contributions = await fetchContributions(username);
    grid = buildGrid(contributions);
    console.log('✅ Grid built — matches index.html layout exactly.');
  } catch(e) {
    console.error('❌ Failed to fetch contributions:', e.message);
    process.exit(1);
  }

  const path = buildPath();
  const frameDur = 0.12;
  const totalFrames = path.length + SNAKE_LEN + 10;
  const totalDur = (totalFrames * frameDur).toFixed(3);

  const eatenAt = {};
  for (let i=0; i<path.length; i++) {
    const [c,r] = path[i];
    const key = `${c},${r}`;
    if (eatenAt[key] === undefined && grid[c][r] > 0) eatenAt[key] = i;
  }

  let svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:hidden">`);
  svg.push(`<defs><clipPath id="board"><rect width="${W}" height="${H}"/></clipPath></defs>`);
  svg.push(`<rect width="${W}" height="${H}" fill="${COLORS.empty}"/>`);
  svg.push(`<g clip-path="url(#board)">`);

  for (let c=0;c<COLS;c++) for (let r=0;r<ROWS;r++) {
    const key = `${c},${r}`;
    const lvl = grid[c][r];
    const fill = COLORS.levels[lvl] || COLORS.empty;
    const x=c*STEP, y=r*STEP;
    svg.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${COLORS.border}"/>`);
    if (eatenAt[key] !== undefined) {
      const eatTime = (eatenAt[key] * frameDur / parseFloat(totalDur)).toFixed(4);
      svg.push(`<rect x="${x+1}" y="${y+1}" width="${CELL-2}" height="${CELL-2}" rx="1.5" fill="${fill}">
        <animate attributeName="fill" values="${fill};${COLORS.border}" keyTimes="0;${eatTime}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
      </rect>`);
    } else {
      svg.push(`<rect x="${x+1}" y="${y+1}" width="${CELL-2}" height="${CELL-2}" rx="1.5" fill="${fill}"/>`);
    }
  }

  const keyTimes = path.map((_,i) => (i * frameDur / totalDur).toFixed(4)).join(';');
  const hx = path.map(([c])=> c*STEP).join(';');
  const hy = path.map(([,r])=> r*STEP).join(';');

  for (let seg=1; seg<=SNAKE_LEN; seg++) {
    const bx = path.map((_,i) => i < seg ? -20 : path[i-seg][0]*STEP+1).join(';');
    const by = path.map((_,i) => i < seg ? -20 : path[i-seg][1]*STEP+1).join(';');
    const g  = Math.round(SNAKE_COLORS.bodyHead[1] - (seg/SNAKE_LEN)*(SNAKE_COLORS.bodyHead[1]-SNAKE_COLORS.bodyTail[1]));
    svg.push(`<rect width="${CELL-2}" height="${CELL-2}" rx="1.5" fill="rgb(${SNAKE_COLORS.bodyHead[0]},${g},${g})" x="-20" y="-20">
      <animate attributeName="x" values="${bx}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
      <animate attributeName="y" values="${by}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
    </rect>`);
  }

  svg.push(`<rect width="${CELL}" height="${CELL}" rx="2" fill="${COLORS.head}" x="${path[0][0]*STEP}" y="${path[0][1]*STEP}">
    <animate attributeName="x" values="${hx}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
    <animate attributeName="y" values="${hy}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
  </rect>`);

  const ex = path.map(([c])=> c*STEP+CELL/2+4).join(';');
  const ey = path.map(([,r])=> r*STEP+CELL/2-2).join(';');
  svg.push(`<circle r="1.5" fill="${COLORS.eye}" cx="${path[0][0]*STEP+CELL/2+4}" cy="${path[0][1]*STEP+CELL/2-2}">
    <animate attributeName="cx" values="${ex}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
    <animate attributeName="cy" values="${ey}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
  </circle>`);

  svg.push(`</g>`);
  svg.push(`</svg>`);

  const out = svg.join('\n');
  fs.writeFileSync('snake-dark.svg', out);
  console.log(`✅ snake-dark.svg generated (${(out.length/1024).toFixed(1)} KB)`);
}

main().catch(console.error);function buildGrid(weeks) {
  // Fill a clean COLS×ROWS grid with zeros
  const grid = Array.from({ length: COLS }, () => new Array(ROWS).fill(0));

  // Use the last COLS weeks (GitHub may return slightly more than 53)
  const slicedWeeks = weeks.slice(-COLS);

  slicedWeeks.forEach((week, colIdx) => {
    week.contributionDays.forEach(day => {
      // GitHub weeks always start Sunday; getDay() returns 0=Sun…6=Sat
      const row = new Date(day.date).getDay();
      grid[colIdx][row] = LEVEL_MAP[day.contributionLevel] ?? 0;
    });
  });

  return grid;
}
// ──────────────────────────────────────────────────────────────────

function buildPath() {
  let seed = 42;
  function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function shuffle(a) {
    for (let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  const total=COLS*ROWS, vis=new Uint8Array(total), result=[];
  let c=0, r=0;
  while(result.length<total){
    vis[c*ROWS+r]=1; result.push([c,r]);
    const dirs=shuffle([...DIRS]); let moved=false;
    for(const[dc,dr]of dirs){const nc=c+dc,nr=r+dr;if(nc>=0&&nc<COLS&&nr>=0&&nr<ROWS&&!vis[nc*ROWS+nr]){c=nc;r=nr;moved=true;break;}}
    if(!moved){
      const q=[[c,r]],seen=new Uint8Array(total);seen[c*ROWS+r]=1;let found=false;
      while(q.length){
        const[qc,qr]=q.shift();
        for(const[dc,dr]of DIRS){
          const nc=qc+dc,nr2=qr+dr;
          if(nc>=0&&nc<COLS&&nr2>=0&&nr2<ROWS){
            const k=nc*ROWS+nr2;
            if(!seen[k]){seen[k]=1;if(!vis[k]){c=nc;r=nr2;found=true;break;}q.push([nc,nr2]);}
          }
        }
        if(found)break;
      }
      if(!found)break;
    }
  }
  return result;
}

async function main() {
  console.log(`Fetching contributions for ${username} via GitHub GraphQL API...`);
  let grid;
  try {
    const weeks = await fetchContributions(username);
    grid = buildGrid(weeks);
    console.log('✅ Grid built from official GitHub data.');
  } catch(e) {
    // Hard fail — never silently fall back to random data
    console.error('❌ Failed to fetch contributions:', e.message);
    process.exit(1);
  }

  const path = buildPath();
  const frameDur = 0.12;
  const totalFrames = path.length + SNAKE_LEN + 10;
  const totalDur = (totalFrames * frameDur).toFixed(3);

  const eatenAt = {};
  for (let i=0; i<path.length; i++) {
    const [c,r] = path[i];
    const key = `${c},${r}`;
    if (eatenAt[key] === undefined && grid[c][r] > 0) eatenAt[key] = i;
  }

  let svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:hidden">`);
  svg.push(`<defs><clipPath id="board"><rect width="${W}" height="${H}"/></clipPath></defs>`);
  svg.push(`<rect width="${W}" height="${H}" fill="${COLORS.empty}"/>`);
  svg.push(`<g clip-path="url(#board)">`);

  for (let c=0;c<COLS;c++) for (let r=0;r<ROWS;r++) {
    const key = `${c},${r}`;
    const lvl = grid[c][r];
    const fill = COLORS.levels[lvl] || COLORS.empty;
    const x=c*STEP, y=r*STEP;
    svg.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${COLORS.border}"/>`);
    if (eatenAt[key] !== undefined) {
      const eatTime = (eatenAt[key] * frameDur / parseFloat(totalDur)).toFixed(4);
      svg.push(`<rect x="${x+1}" y="${y+1}" width="${CELL-2}" height="${CELL-2}" rx="1.5" fill="${fill}">
        <animate attributeName="fill" values="${fill};${COLORS.border}" keyTimes="0;${eatTime}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
      </rect>`);
    } else {
      svg.push(`<rect x="${x+1}" y="${y+1}" width="${CELL-2}" height="${CELL-2}" rx="1.5" fill="${fill}"/>`);
    }
  }

  const keyTimes = path.map((_,i) => (i * frameDur / totalDur).toFixed(4)).join(';');
  const hx = path.map(([c])=> c*STEP).join(';');
  const hy = path.map(([,r])=> r*STEP).join(';');

  for (let seg=1; seg<=SNAKE_LEN; seg++) {
    const bx = path.map((_,i) => i < seg ? -20 : path[i-seg][0]*STEP+1).join(';');
    const by = path.map((_,i) => i < seg ? -20 : path[i-seg][1]*STEP+1).join(';');
    const g  = Math.round(SNAKE_COLORS.bodyHead[1] - (seg/SNAKE_LEN)*(SNAKE_COLORS.bodyHead[1]-SNAKE_COLORS.bodyTail[1]));
    svg.push(`<rect width="${CELL-2}" height="${CELL-2}" rx="1.5" fill="rgb(${SNAKE_COLORS.bodyHead[0]},${g},${g})" x="-20" y="-20">
      <animate attributeName="x" values="${bx}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
      <animate attributeName="y" values="${by}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
    </rect>`);
  }

  svg.push(`<rect width="${CELL}" height="${CELL}" rx="2" fill="${COLORS.head}" x="${path[0][0]*STEP}" y="${path[0][1]*STEP}">
    <animate attributeName="x" values="${hx}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
    <animate attributeName="y" values="${hy}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
  </rect>`);

  const ex = path.map(([c])=> c*STEP+CELL/2+4).join(';');
  const ey = path.map(([,r])=> r*STEP+CELL/2-2).join(';');
  svg.push(`<circle r="1.5" fill="${COLORS.eye}" cx="${path[0][0]*STEP+CELL/2+4}" cy="${path[0][1]*STEP+CELL/2-2}">
    <animate attributeName="cx" values="${ex}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
    <animate attributeName="cy" values="${ey}" keyTimes="${keyTimes}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
  </circle>`);

  svg.push(`</g>`);
  svg.push(`</svg>`);

  const out = svg.join('\n');
  fs.writeFileSync('snake-dark.svg', out);
  console.log(`✅ snake-dark.svg generated (${(out.length/1024).toFixed(1)} KB)`);
}

main().catch(console.error);
