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

function setup() {
  createCanvas(800, 400);
  
  leftPaddleY = height / 2 - paddleHeight / 2;
  rightPaddleY = height / 2 - paddleHeight / 2;
  
  resetBall();
}

function draw() {
  background(0);
  
  handleInput();
  moveBall();
  checkCollisions();
  
  drawCenterLine();
  drawPaddles();
  drawBall();
  drawScore();
}

function handleInput() {
  // Left paddle (W / S)
  if (keyIsDown(87)) { // W
    leftPaddleY -= paddleSpeed;
  }
  if (keyIsDown(83)) { // S
    leftPaddleY += paddleSpeed;
  }

  // Right paddle (Arrow keys)
  if (keyIsDown(UP_ARROW)) {
    rightPaddleY -= paddleSpeed;
  }
  if (keyIsDown(DOWN_ARROW)) {
    rightPaddleY += paddleSpeed;
  }

  // Keep paddles inside canvas
  leftPaddleY = constrain(leftPaddleY, 0, height - paddleHeight);
  rightPaddleY = constrain(rightPaddleY, 0, height - paddleHeight);
}

function moveBall() {
  ballX += ballSpeedX;
  ballY += ballSpeedY;

  // Top & bottom wall bounce
  if (ballY <= 0 || ballY >= height - ballSize) {
    ballSpeedY *= -1;
  }

  // Score check
  if (ballX < 0) {
    rightScore++;
    resetBall();
  }
  if (ballX > width) {
    leftScore++;
    resetBall();
  }
}

function collideBallWithPaddle(ballSpeedX, ballSpeedY, paddleSpeedY) {
  // --- Reflect X ---
  let newSpeedX = -ballSpeedX;

  // --- Influence Y based on paddle movement ---
  // Paddle motion transfers some momentum to the ball
  let paddleInfluence = paddleSpeedY * 0.4;
  let newSpeedY = ballSpeedY + paddleInfluence;

  // --- Randomness: slight unpredictable nudge ---
  let jitter = random(-0.6, 0.6);
  newSpeedY += jitter;

  // --- Speed cap to keep game playable ---
  newSpeedY = constrain(newSpeedY, -9, 9);

  // --- Slightly increase ball speed over time (optional) ---
  let speedBoost = 1.03;
  newSpeedX *= speedBoost;

  return { x: newSpeedX, y: newSpeedY };
}

function checkCollisions() {
  // Left paddle
  if (
    ballX <= paddleWidth &&
    ballY + ballSize >= leftPaddleY &&
    ballY <= leftPaddleY + paddleHeight
  ) {
    var newSpeed = pongCollision(0, 0, 0, 0)
    ballX = paddleWidth; // prevent sticking
  }

  // Right paddle
  if (
    ballX + ballSize >= width - paddleWidth &&
    ballY + ballSize >= rightPaddleY &&
    ballY <= rightPaddleY + paddleHeight
  ) {
    ballSpeedX *= -1;
    ballX = width - paddleWidth - ballSize;
  }
}

function drawPaddles() {
  fill(255);
  rect(0, leftPaddleY, paddleWidth, paddleHeight);
  rect(width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);
}

function drawBall() {
  rect(ballX, ballY, ballSize, ballSize);
}

function drawCenterLine() {
  stroke(255);
  for (let y = 0; y < height; y += 20) {
    line(width / 2, y, width / 2, y + 10);
  }
  noStroke();
}

function drawScore() {
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(255);
  text(leftScore, width / 4, 40);
  text(rightScore, width * 3 / 4, 40);
}

function resetBall() {
  ballX = width / 2;
  ballY = height / 2;
  
  // Randomize direction
  ballSpeedX = random([-5, 5]);
  ballSpeedY = random(-4, 4);
}
