// snake-colors.js — edit here to change colors for BOTH SVG and interactive HTML
const SNAKE_COLORS = {
  // Contribution grid
  empty:  '#161b22',
  border: '#21262d',
  levels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],

  // Snake
  head:        '#4caf50',   // head fill
  headBorder:  '#2e7d32',   // head border
  bodyHead:    [20, 150],   // rgb tail→head: rgb(20, bodyTail → bodyHead, same)
  bodyTail:    [20, 90],
  bodyBorder:  '#145214',
  eye:         '#0d1117',
  tongue:      '#ef233c',
};

// Node.js export
if (typeof module !== 'undefined') module.exports = SNAKE_COLORS;
