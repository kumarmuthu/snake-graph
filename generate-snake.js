// generate-snake.js
// Run: node generate-snake.js <username>
// Outputs: snake-dark.svg

const https = require('https');
const fs    = require('fs');

const username = process.argv[2] || 'kumarmuthu';
const COLS = 53, ROWS = 7, CELL = 13, GAP = 3, STEP = CELL + GAP;
const W = COLS * STEP - GAP;
const H = ROWS * STEP - GAP;
const SNAKE_LEN = 5;

const COLORS = {
  empty: '#161b22', border: '#21262d',
  levels: ['#161b22','#0e4429','#006d32','#26a641','#39d353'],
  head: '#4caf50', body0: '#286228', body1: '#3a8c3a', tongue: '#ef233c', eye: '#0d1117'
};

function fetchContributions(user) {
  return new Promise((resolve, reject) => {
    const url = `https://github-contributions-api.jogruber.de/v4/${user}?y=last`;
    https.get(url, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data).contributions); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function buildGrid(contributions) {
  const grid = Array.from({length: COLS}, () => new Array(ROWS).fill(0));
  const total = contributions.length;
  const slice = contributions.slice(Math.max(0, total - COLS * ROWS));
  const firstDow = new Date(slice[0].date).getDay();
  slice.forEach((entry, idx) => {
    const col = Math.floor((idx + firstDow) / ROWS);
    const row = (idx + firstDow) % ROWS;
    if (col < COLS && row < ROWS) grid[col][row] = entry.level;
  });
  return grid;
}

// Greedy random walk path (seeded-style, deterministic shuffle via sin)
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
      while(q.length){const[qc,qr]=q.shift();for(const[dc,dr]of DIRS){const nc=qc+dc,nr2=qr+dr;if(nc>=0&&nc<COLS&&nr2>=0&&nr2<ROWS){const k=nc*ROWS+nr2;if(!seen[k]){seen[k]=1;if(!vis[k]){c=nc;r=nr2;found=true;break;}q.push([nc,nr2]);}}}if(found)break;}
      if(!found)break;
    }
  }
  return result;
}

function getDir(hc,hr,pc,pr){if(hc>pc)return'R';if(hc<pc)return'L';if(hr>pr)return'D';return'U';}

function cellRect(c, r, fill, rx=2) {
  const x=c*STEP, y=r*STEP;
  return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="${rx}" fill="${fill}"/>`;
}

async function main() {
  console.log(`Fetching contributions for ${username}...`);
  let grid;
  try {
    const contributions = await fetchContributions(username);
    grid = buildGrid(contributions);
    console.log('Contributions loaded.');
  } catch(e) {
    console.warn('API failed, using fake grid:', e.message);
    grid = Array.from({length:COLS},(_,c)=>Array.from({length:ROWS},(_,r)=>Math.floor(Math.random()*5)));
  }

  const path = buildPath();
  const totalFrames = path.length + SNAKE_LEN + 10;
  const frameDur = 0.12; // seconds per frame
  const totalDur = totalFrames * frameDur;

  // Pre-compute which frame each cell gets eaten
  const eatenAt = {}; // "c,r" -> frame index
  for (let i = 0; i < path.length; i++) {
    const [c,r] = path[i];
    const key = `${c},${r}`;
    if (!eatenAt[key] && grid[c][r] > 0) eatenAt[key] = i;
  }

  // Build SVG
  let svgParts = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  svgParts.push(`<style>
    .cell { }
  </style>`);

  // Background
  svgParts.push(`<rect width="${W}" height="${H}" fill="${COLORS.empty}"/>`);

  // Draw static grid cells with animate for eating
  for (let c=0;c<COLS;c++) for (let r=0;r<ROWS;r++) {
    const key = `${c},${r}`;
    const lvl = grid[c][r];
    const fillNormal = COLORS.levels[lvl];
    const x=c*STEP, y=r*STEP;

    if (eatenAt[key] !== undefined) {
      const eatFrame = eatenAt[key];
      const eatTime  = (eatFrame * frameDur).toFixed(3);
      // border rect
      svgParts.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${COLORS.border}"/>`);
      // inner rect that disappears when eaten
      svgParts.push(`<rect x="${x+1}" y="${y+1}" width="${CELL-2}" height="${CELL-2}" rx="1.5" fill="${fillNormal}">
        <animate attributeName="fill" values="${fillNormal};${fillNormal};${COLORS.border}" keyTimes="0;${(eatTime/totalDur).toFixed(4)};${Math.min((parseFloat(eatTime)/totalDur+0.001),1).toFixed(4)}" dur="${totalDur}s" repeatCount="indefinite"/>
      </rect>`);
    } else {
      svgParts.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${COLORS.border}"/>`);
      svgParts.push(`<rect x="${x+1}" y="${y+1}" width="${CELL-2}" height="${CELL-2}" rx="1.5" fill="${fillNormal}"/>`);
    }
  }

  // Snake: animate head position
  // Build keyTimes and x/y values for head
  const headXvals = [], headYvals = [], keyTimes = [];
  for (let i=0; i<=path.length; i++) {
    const idx = Math.min(i, path.length-1);
    const [c,r] = path[idx];
    headXvals.push(c*STEP);
    headYvals.push(r*STEP);
    keyTimes.push((i*frameDur/totalDur).toFixed(4));
  }

  // Head rect animation
  svgParts.push(`<rect id="head" width="${CELL}" height="${CELL}" rx="2" fill="${COLORS.head}">
    <animate attributeName="x" values="${headXvals.join(';')}" keyTimes="${keyTimes.join(';')}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
    <animate attributeName="y" values="${headYvals.join(';')}" keyTimes="${keyTimes.join(';')}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
  </rect>`);

  // Eye (small circle on head)
  svgParts.push(`<circle r="1.5" fill="${COLORS.eye}">
    <animate attributeName="cx" values="${headXvals.map(x=>x+CELL/2+4).join(';')}" keyTimes="${keyTimes.join(';')}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
    <animate attributeName="cy" values="${headYvals.map(y=>y+CELL/2-2).join(';')}" keyTimes="${keyTimes.join(';')}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
  </circle>`);

  // Body segments
  for (let seg=1; seg<=SNAKE_LEN; seg++) {
    const bx=[], by=[], bt=[];
    for (let i=0; i<=path.length; i++) {
      const idx = Math.max(0, Math.min(i-seg, path.length-1));
      const [c,r] = path[idx];
      bx.push(c*STEP+1); by.push(r*STEP+1);
      bt.push((i*frameDur/totalDur).toFixed(4));
    }
    const t = seg/SNAKE_LEN;
    const g = Math.round(98 - t*50);
    svgParts.push(`<rect width="${CELL-2}" height="${CELL-2}" rx="1.5" fill="rgb(20,${g},20)" opacity="${i<seg?0:1}">
      <animate attributeName="x" values="${bx.join(';')}" keyTimes="${bt.join(';')}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
      <animate attributeName="y" values="${by.join(';')}" keyTimes="${bt.join(';')}" dur="${totalDur}s" repeatCount="indefinite" calcMode="discrete"/>
    </rect>`);
  }

  svgParts.push(`</svg>`);

  const svgContent = svgParts.join('\n');
  fs.writeFileSync('snake-dark.svg', svgContent);
  console.log(`✅ snake-dark.svg generated (${(svgContent.length/1024).toFixed(1)} KB)`);
}

main().catch(console.error);
