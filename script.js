const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const gameOverScreen = document.getElementById('gameOverScreen');
const playAgainBtn = document.getElementById('playAgainBtn');
const newPlayerBtn = document.getElementById('newPlayerBtn');
const finalScore = document.getElementById('finalScore');
const shootSound = document.getElementById('shootSound');
const hitSound = document.getElementById('hitSound');

const nameScreen = document.getElementById('nameScreen');
const gameHUD = document.getElementById('gameHUD');
const startGameBtn = document.getElementById('startGameBtn');
const playerNameInput = document.getElementById('playerNameInput');

let playerName = "Player";

// Canvas setup
canvas.width = window.innerWidth * 0.8;
canvas.height = window.innerHeight * 0.6;

// Game variables
let arrowX, arrowY, isShooting, targetX, targetY, score, level;
let arrowVX = 0;
let particles = [];
let targetSpeed = 2;
let targetDirection = 1;
let targetRadius = 30;
let misses = 0;
const maxMisses = 3;
let appreciation = "";

// Leaderboard management
function getLeaderboard() {
  return JSON.parse(localStorage.getItem('bowArrowLeaderboard')) || {};
}

function saveLeaderboard(leaderboard) {
  localStorage.setItem('bowArrowLeaderboard', JSON.stringify(leaderboard));
}

function updateLeaderboard(name, score) {
  let leaderboard = getLeaderboard();
  if (!leaderboard[name] || score > leaderboard[name]) {
    leaderboard[name] = score; // Update player's best score
  }
  saveLeaderboard(leaderboard);
  return leaderboard;
}

function showLeaderboard() {
  const leaderboardEl = document.getElementById('leaderboard');
  leaderboardEl.innerHTML = '';
  const leaderboard = getLeaderboard();

  // Sort by highest score
  const sorted = Object.entries(leaderboard)
    .sort((a,b) => b[1]-a[1])
    .slice(0,5);

  sorted.forEach(([name,score]) => {
    const li = document.createElement('li');
    li.textContent = `${name}: ${score}`;
    leaderboardEl.appendChild(li);
  });
}

// Background images
const bgImages = [];
const bgSources = ['bg1.png', 'bg2.png', 'bg3.png']; 
let bgLoaded = 0;

bgSources.forEach((src, i) => {
  const img = new Image();
  img.src = src;
  img.onload = () => bgLoaded++;
  img.onerror = () => console.log(`❌ Could not load ${src}`);
  bgImages[i] = img;
});

let highScore = 0;

function initGame() {
  arrowX = 50;
  arrowY = canvas.height / 2;
  isShooting = false;
  score = 0;
  level = 1;
  targetX = canvas.width - 100;
  targetY = Math.random() * (canvas.height - 100) + 50;
  targetSpeed = 2;
  targetRadius = 30;
  particles = [];
  misses = 0;
  appreciation = "";
  gameOverScreen.style.display = 'none';
  updateHUD();
}

function updateHUD() {
  const hearts = "❤️".repeat(maxMisses - misses) + "🤍".repeat(misses);
  scoreDisplay.textContent = `${playerName} | Score: ${score} | Level: ${level} | ${hearts}`;
  highScoreDisplay.textContent = `High Score (${playerName}): ${highScore}`;
}

function drawBackground() {
  const bgIndex = (level - 1) % bgImages.length;
  if (bgImages[bgIndex] && bgLoaded === bgImages.length) {
    ctx.drawImage(bgImages[bgIndex], 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = ['#a7ffeb', '#fce4ec', '#fff9c4'][bgIndex];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.fillStyle = '#4caf50';
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

  ctx.fillStyle = '#004d40';
  ctx.font = '24px Segoe UI';
  ctx.fillText(`LEVEL ${level}`, 20, 40);

  if (appreciation) {
    ctx.fillStyle = 'gold';
    ctx.font = '30px Segoe UI Black';
    ctx.fillText(appreciation, canvas.width/2 - 60, 60);
  }
}

function drawBow() {
  // Realistic bow: curved wood + string
  ctx.strokeStyle = '#8B4513'; // brown wood
  ctx.lineWidth = 6;

  // Curved bow body
  ctx.beginPath();
  ctx.moveTo(arrowX - 20, arrowY - 50);
  ctx.quadraticCurveTo(arrowX - 50, arrowY, arrowX - 20, arrowY + 50);
  ctx.stroke();

  // String
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(arrowX - 20, arrowY - 50);
  ctx.lineTo(arrowX - 20, arrowY + 50);
  ctx.stroke();
}

function drawArrow(x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 40, y);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 40, y - 5);
  ctx.lineTo(x + 50, y);
  ctx.lineTo(x + 40, y + 5);
  ctx.fillStyle = '#f44336';
  ctx.fill();
}

// 🎯 Target changes shape based on level
function drawTarget(x, y, radius) {
  if (level % 3 === 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffeb3b';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, radius / 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#f44336';
    ctx.fill();
  } else if (level % 3 === 2) {
    ctx.fillStyle = '#ff5722';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      let angle = (i * 2 * Math.PI) / 5 - Math.PI/2;
      let x1 = x + Math.cos(angle) * radius;
      let y1 = y + Math.sin(angle) * radius;
      ctx.lineTo(x1, y1);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#3f51b5';
    ctx.fillRect(x - radius, y - radius, radius*2, radius*2);
    ctx.fillStyle = '#f44336';
    ctx.fillRect(x - radius/2, y - radius/2, radius, radius);
  }
}

function createParticles(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x,
      y: y,
      radius: Math.random() * 3 + 1,
      color: `hsl(${Math.random()*360}, 80%, 60%)`,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 60
    });
  }
}

function drawParticles() {
  particles.forEach((p, index) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    if (p.life <= 0) {
      particles.splice(index, 1);
    }
  });
}

function increaseDifficulty() {
  if (score % 3 === 0 && score > 0) {
    targetSpeed += 0.5;
    if (targetRadius > 15) targetRadius -= 2;
    if (score % 6 === 0) level++;
  }
  if (score === 5) appreciation = "Great!";
  else if (score === 10) appreciation = "Awesome!";
  else if (score === 20) appreciation = "Legend!";
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawBow();

  // Vertical target movement
  targetY += targetSpeed * targetDirection;
  if (targetY > canvas.height - targetRadius || targetY < targetRadius) {
    targetDirection *= -1;
  }

  drawTarget(targetX, targetY, targetRadius);
  drawParticles();

  if (isShooting) {
    arrowX += arrowVX;
  }
  drawArrow(arrowX, arrowY);

  if (isShooting) {
    const dx = targetX - (arrowX + 40);
    const dy = targetY - arrowY;
    if (Math.sqrt(dx*dx + dy*dy) < targetRadius) {
      hitSound.play();
      score++;
      if (score > highScore) {
        highScore = score;
        updateLeaderboard(playerName, highScore);
      }
      updateHUD();
      increaseDifficulty();
      createParticles(targetX, targetY);
      resetArrow();
    } else if (arrowX > canvas.width) {
      misses++;
      if (misses >= maxMisses) {
        showGameOver();
        return;
      }
      updateHUD();
      resetArrow();
    }
  }

  requestAnimationFrame(gameLoop);
}

function resetArrow() {
  arrowX = 50;
  arrowY = canvas.height / 2;
  arrowVX = 0;
  isShooting = false;
  targetY = Math.random() * (canvas.height - 100) + 50;
}

function showGameOver() {
  gameOverScreen.style.display = 'flex';
  finalScore.textContent = `${playerName}'s Score: ${score} | High Score: ${highScore}`;
  updateLeaderboard(playerName, score);
  showLeaderboard();

  playAgainBtn.style.display = 'block';
  newPlayerBtn.style.display = 'block';

  playAgainBtn.onclick = () => {
    initGame();
    gameLoop();
    gameOverScreen.style.display = 'none';
  };

  newPlayerBtn.onclick = () => {
    gameOverScreen.style.display = 'none';
    gameHUD.style.display = 'none';
    nameScreen.style.display = 'flex';
  };
}

// Controls
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  arrowY = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
  if (!isShooting) {
    isShooting = true;
    arrowVX = 12;
    shootSound.play();
  }
});

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth * 0.8;
  canvas.height = window.innerHeight * 0.6;
});

// Start game after entering name
startGameBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  if (name) playerName = name;
  highScore = getLeaderboard()[playerName] || 0;
  nameScreen.style.display = 'none';
  gameHUD.style.display = 'block';
  initGame();
  gameLoop();
});
