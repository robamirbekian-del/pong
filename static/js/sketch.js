let paddleWidth = 12;
let paddleHeight = 90;
let paddleSpeed = 7;

let leftPaddleY;
let rightPaddleY;

let ballX, ballY;
let ballSpeedX = 5;
let ballSpeedY = 4;
let ballSize = 14;

let leftScore = 0;
let rightScore = 0;
let highScore = 0;

let p1Scored = 0;
let p1Missed = 0;
let p2Scored = 0;
let p2Missed = 0;

// Level
let currentLevel = 1;

// Middle paddle (level 2)
let midPaddleY;
let midPaddleDir = 1; // 1 = down, -1 = up
const midPaddleSpeed = 3;
const midPaddleWidth = 12;
const midPaddleHeight = 80;

// Skins
const SKINS = [
  { name: 'Classic', color: [255, 255, 255], glow: null },
  { name: 'Cyan',    color: [0,   245, 255], glow: [0,   245, 255] },
  { name: 'Magenta', color: [255,   0, 200], glow: [255,   0, 200] },
  { name: 'Yellow',  color: [245, 230,  66], glow: [245, 230,  66] },
  { name: 'Green',   color: [ 76, 255, 145], glow: [ 76, 255, 145] },
  { name: 'Red',     color: [255,  76,  76], glow: [255,  76,  76] },
  { name: 'Orange',  color: [255, 165,   0], glow: [255, 165,   0] },
  { name: 'Ghost',   color: [255, 255, 255], glow: null, ghost: true },
];

let p1SkinIndex = 0;
let p2SkinIndex = 0;

function setSkin(player, index) {
  if (player === 1) p1SkinIndex = index;
  else              p2SkinIndex = index;
}

function setLevel(level) {
  currentLevel = level;
  if (level === 2) {
    midPaddleY = height / 2 - midPaddleHeight / 2;
    midPaddleDir = 1;
  }
}

function setup() {
  let canvas = createCanvas(800, 400);
  canvas.parent('game-container');

  window.addEventListener('keydown', function(e) {
    if ([37, 38, 39, 40].includes(e.keyCode)) e.preventDefault();
  });

  leftPaddleY  = height / 2 - paddleHeight / 2;
  rightPaddleY = height / 2 - paddleHeight / 2;
  midPaddleY   = height / 2 - midPaddleHeight / 2;

  resetBall();
  fetchHighScore();
}

function draw() {
  background(0);

  handleInput();
  if (currentLevel === 2) moveMidPaddle();
  moveBall();
  checkCollisions();

  drawCenterLine();
  if (currentLevel === 2) drawMidPaddle();
  drawPaddles();
  drawBall();
  drawScore();
}

let leftPaddleSpeed  = 0;
let rightPaddleSpeed = 0;

function handleInput() {
  leftPaddleSpeed  = 0;
  rightPaddleSpeed = 0;

  if (keyIsDown(87))         { leftPaddleY  -= paddleSpeed; leftPaddleSpeed  = -paddleSpeed; }
  if (keyIsDown(83))         { leftPaddleY  += paddleSpeed; leftPaddleSpeed  =  paddleSpeed; }
  if (keyIsDown(UP_ARROW))   { rightPaddleY -= paddleSpeed; rightPaddleSpeed = -paddleSpeed; }
  if (keyIsDown(DOWN_ARROW)) { rightPaddleY += paddleSpeed; rightPaddleSpeed =  paddleSpeed; }

  leftPaddleY  = constrain(leftPaddleY,  0, height - paddleHeight);
  rightPaddleY = constrain(rightPaddleY, 0, height - paddleHeight);
}

function moveMidPaddle() {
  midPaddleY += midPaddleSpeed * midPaddleDir;
  if (midPaddleY <= 0)                          { midPaddleY = 0;                          midPaddleDir =  1; }
  if (midPaddleY >= height - midPaddleHeight)   { midPaddleY = height - midPaddleHeight;   midPaddleDir = -1; }
}

function fetchHighScore() {
  fetch('/highscore')
    .then(res => res.json())
    .then(data => {
      highScore = data.highScore;
      document.getElementById('high-score-value').textContent = highScore;
    });
}

function updateHighScore() {
  let currentBest = max(leftScore, rightScore);
  if (currentBest > highScore) {
    fetch('/highscore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: currentBest })
    })
      .then(res => res.json())
      .then(data => {
        highScore = data.highScore;
        document.getElementById('high-score-value').textContent = highScore;
      });
  }
}

function updateStats() {
  let total = p1Scored + p1Missed;
  function pct(n) { return total === 0 ? 0 : Math.round((n / total) * 100); }
  let p1SP = pct(p1Scored), p1MP = pct(p1Missed);
  let p2SP = pct(p2Scored), p2MP = pct(p2Missed);
  document.getElementById('p1-score-rate').textContent = p1SP + '%';
  document.getElementById('p1-miss-rate').textContent  = p1MP + '%';
  document.getElementById('p2-score-rate').textContent = p2SP + '%';
  document.getElementById('p2-miss-rate').textContent  = p2MP + '%';
  document.getElementById('p1-score-bar').style.width  = p1SP + '%';
  document.getElementById('p1-miss-bar').style.width   = p1MP + '%';
  document.getElementById('p2-score-bar').style.width  = p2SP + '%';
  document.getElementById('p2-miss-bar').style.width   = p2MP + '%';
}

function moveBall() {
  ballX += ballSpeedX;
  ballY += ballSpeedY;

  if (ballY <= 0 || ballY >= height - ballSize) ballSpeedY *= -1;

  if (ballX < 0) {
    rightScore++; p1Missed++; p2Scored++;
    updateHighScore(); updateStats(); resetBall();
  }
  if (ballX > width) {
    leftScore++; p2Missed++; p1Scored++;
    updateHighScore(); updateStats(); resetBall();
  }
}

function collideBallWithPaddle(bsx, bsy, paddleSpeedY) {
  let nx = -bsx * 1.03;
  let ny = constrain(bsy + paddleSpeedY * 0.4 + random(-0.6, 0.6), -9, 9);
  return { x: nx, y: ny };
}

function checkCollisions() {
  // Left paddle
  if (ballX <= paddleWidth &&
      ballY + ballSize >= leftPaddleY &&
      ballY <= leftPaddleY + paddleHeight) {
    let r = collideBallWithPaddle(ballSpeedX, ballSpeedY, leftPaddleSpeed);
    ballSpeedX = r.x; ballSpeedY = r.y; ballX = paddleWidth;
  }

  // Right paddle
  if (ballX + ballSize >= width - paddleWidth &&
      ballY + ballSize >= rightPaddleY &&
      ballY <= rightPaddleY + paddleHeight) {
    let r = collideBallWithPaddle(ballSpeedX, ballSpeedY, rightPaddleSpeed);
    ballSpeedX = r.x; ballSpeedY = r.y; ballX = width - paddleWidth - ballSize;
  }

  // Middle paddle (level 2) — ball bounces off either face
  if (currentLevel === 2) {
    let midX = width / 2 - midPaddleWidth / 2;

    // Ball moving right, hitting left face of mid paddle
    if (ballSpeedX > 0 &&
        ballX + ballSize >= midX &&
        ballX + ballSize <= midX + midPaddleWidth + abs(ballSpeedX) &&
        ballY + ballSize >= midPaddleY &&
        ballY <= midPaddleY + midPaddleHeight) {
      let r = collideBallWithPaddle(ballSpeedX, ballSpeedY, midPaddleSpeed * midPaddleDir);
      ballSpeedX = r.x; ballSpeedY = r.y;
      ballX = midX - ballSize;
    }

    // Ball moving left, hitting right face of mid paddle
    if (ballSpeedX < 0 &&
        ballX <= midX + midPaddleWidth &&
        ballX >= midX - abs(ballSpeedX) &&
        ballY + ballSize >= midPaddleY &&
        ballY <= midPaddleY + midPaddleHeight) {
      let r = collideBallWithPaddle(ballSpeedX, ballSpeedY, midPaddleSpeed * midPaddleDir);
      ballSpeedX = r.x; ballSpeedY = r.y;
      ballX = midX + midPaddleWidth;
    }
  }
}

function applyPaddleSkin(skin) {
  if (skin.ghost) {
    fill(255, 255, 255, 80);
  } else {
    fill(skin.color[0], skin.color[1], skin.color[2]);
    if (skin.glow) {
      drawingContext.shadowBlur  = 18;
      drawingContext.shadowColor = `rgb(${skin.glow[0]},${skin.glow[1]},${skin.glow[2]})`;
    }
  }
}

function clearGlow() {
  drawingContext.shadowBlur  = 0;
  drawingContext.shadowColor = 'transparent';
}

function drawPaddles() {
  noStroke();
  applyPaddleSkin(SKINS[p1SkinIndex]);
  rect(0, leftPaddleY, paddleWidth, paddleHeight);
  clearGlow();

  applyPaddleSkin(SKINS[p2SkinIndex]);
  rect(width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);
  clearGlow();
}

function drawMidPaddle() {
  noStroke();
  // Pulsing red/orange glow for the obstacle paddle
  let pulse = (sin(frameCount * 0.08) + 1) / 2; // 0..1
  let r = lerp(220, 255, pulse);
  let g = lerp(50,  120, pulse);
  fill(r, g, 30);
  drawingContext.shadowBlur  = 20;
  drawingContext.shadowColor = `rgb(${floor(r)},${floor(g)},30)`;
  rect(width / 2 - midPaddleWidth / 2, midPaddleY, midPaddleWidth, midPaddleHeight);
  clearGlow();
}

function drawBall() {
  noStroke();
  fill(255);
  rect(ballX, ballY, ballSize, ballSize);
}

function drawCenterLine() {
  // In level 2 hide the center line since there's a paddle there
  if (currentLevel === 2) return;
  stroke(255);
  for (let y = 0; y < height; y += 20) {
    line(width / 2, y, width / 2, y + 10);
  }
  noStroke();
}

function drawScore() {
  textAlign(CENTER, CENTER);
  textSize(32);
  let p1c = SKINS[p1SkinIndex].color;
  let p2c = SKINS[p2SkinIndex].color;
  fill(p1c[0], p1c[1], p1c[2]);
  text(leftScore,  width / 4,     40);
  fill(p2c[0], p2c[1], p2c[2]);
  text(rightScore, width * 3 / 4, 40);
}

function resetBall() {
  ballX = width / 2;
  ballY = height / 2;
  ballSpeedX = random([-5, 5]);
  ballSpeedY = random(1.5, 4) * random([-1, 1]);
}