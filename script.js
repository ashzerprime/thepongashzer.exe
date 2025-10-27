// script.js - logic du Pong
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // UI elements
  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('menuBtn');
  const onePlayerBtn = document.getElementById('onePlayerBtn');
  const twoPlayerBtn = document.getElementById('twoPlayerBtn');
  const restartBtn = document.getElementById('restartBtn');

  // dimensions
  const W = canvas.width;
  const H = canvas.height;

  // game objects
  const paddleWidth = 14;
  const paddleHeight = 100;
  const paddleSpeed = 6;
  let leftPaddle, rightPaddle, ball;
  let keys = {};
  let mode = 'menu'; // 'menu' | 'playing' | 'paused'
  let gameMode = '1p'; // '1p' or '2p'
  let score = { left: 0, right: 0 };

  // sound simple (beeps) - optional
  function beep(freq=440, time=0.05, type='sine') {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.value = 0.02;
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time);
      o.stop(ctx.currentTime + time + 0.02);
    } catch(e){/* no audio */ }
  }

  function resetObjects(){
    leftPaddle = { x: 20, y: (H-paddleHeight)/2, w: paddleWidth, h: paddleHeight, vy:0 };
    rightPaddle = { x: W - 20 - paddleWidth, y: (H-paddleHeight)/2, w: paddleWidth, h: paddleHeight, vy:0 };
    ball = {
      x: W/2,
      y: H/2,
      r: 9,
      speed: 6,
      vx: Math.random() > 0.5 ? 6 : -6,
      vy: (Math.random()*6 - 3)
    };
  }

  resetObjects();

  // Input handling
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;

    if (e.key === 'Escape') {
      openMenu();
    }

    if (e.key.toLowerCase() === 'p') {
      togglePause();
    }
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  // UI controls
  menuBtn.addEventListener('click', openMenu);
  onePlayerBtn.addEventListener('click', () => { startGame('1p'); });
  twoPlayerBtn.addEventListener('click', () => { startGame('2p'); });
  restartBtn.addEventListener('click', () => { restartRound(); });

  function openMenu(){
    mode = 'menu';
    menu.classList.remove('hidden');
  }
  function closeMenu(){
    menu.classList.add('hidden');
  }
  function startGame(m){
    gameMode = m;
    score.left = 0; score.right = 0;
    resetObjects();
    mode = 'playing';
    closeMenu();
    loop(); // start animation loop
  }
  function togglePause(){
    if (mode === 'playing') {
      mode = 'paused';
      // show overlay menu but in paused style
      menu.classList.remove('hidden');
      // adjust buttons: keep same (user can resume via Esc)
    } else if (mode === 'paused') {
      mode = 'playing';
      closeMenu();
      loop();
    }
  }

  function restartRound() {
    resetObjects();
    if (mode === 'menu') {
      // don't auto start unless previously started
      // keep menu open
    } else {
      mode = 'playing';
      closeMenu();
      loop();
    }
  }

  // physics & update
  function update(){
    if (mode !== 'playing') return;

    // Player controls
    // J1: W / S
    if (keys['w']) leftPaddle.y -= paddleSpeed;
    if (keys['s']) leftPaddle.y += paddleSpeed;
    // J2: ArrowUp / ArrowDown OR if 1p, AI controls rightPaddle
    if (gameMode === '2p') {
      if (keys['arrowup']) rightPaddle.y -= paddleSpeed;
      if (keys['arrowdown']) rightPaddle.y += paddleSpeed;
    } else {
      // invincible AI: align center instantly with ball
      // This makes it impossible to beat - use direct teleporting for invincibility
      const targetY = ball.y - rightPaddle.h/2;
      rightPaddle.y = targetY;
    }

    // clamp paddles
    leftPaddle.y = Math.max(0, Math.min(H - leftPaddle.h, leftPaddle.y));
    rightPaddle.y = Math.max(0, Math.min(H - rightPaddle.h, rightPaddle.y));

    // ball movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // top/bottom collision
    if (ball.y - ball.r <= 0) { ball.y = ball.r; ball.vy = -ball.vy; beep(600,0.03); }
    if (ball.y + ball.r >= H) { ball.y = H - ball.r; ball.vy = -ball.vy; beep(600,0.03); }

    // paddle collision - left
    if (ball.x - ball.r <= leftPaddle.x + leftPaddle.w) {
      if (ball.y >= leftPaddle.y && ball.y <= leftPaddle.y + leftPaddle.h) {
        // collision
        ball.x = leftPaddle.x + leftPaddle.w + ball.r;
        reflectFromPaddle(leftPaddle);
        beep(800,0.03);
      }
    }

    // paddle collision - right
    if (ball.x + ball.r >= rightPaddle.x) {
      if (ball.y >= rightPaddle.y && ball.y <= rightPaddle.y + rightPaddle.h) {
        ball.x = rightPaddle.x - ball.r;
        reflectFromPaddle(rightPaddle);
        beep(800,0.03);
      }
    }

    // score?
    if (ball.x < -50) {
      // right scores
      score.right += 1;
      onScore();
    }
    if (ball.x > W + 50) {
      score.left += 1;
      onScore();
    }
  }

  function reflectFromPaddle(paddle) {
    // compute hit position relative to paddle center (-1 .. 1)
    const relative = (ball.y - (paddle.y + paddle.h/2)) / (paddle.h/2);
    const bounceAngle = relative * (Math.PI/3); // up to 60deg
    const speed = Math.min(14, Math.abs(ball.vx) + 0.6); // increase speed slightly
    const dir = (paddle === leftPaddle) ? 1 : -1;
    ball.vx = speed * Math.cos(bounceAngle) * dir;
    ball.vy = speed * Math.sin(bounceAngle);
    // small tweak so no stuck
    if (Math.abs(ball.vx) < 3) ball.vx = 3 * dir;
  }

  function onScore(){
    // place ball center, random direction toward scored-against side
    resetBallAfterScore();
    // brief pause then continue
    mode = 'playing';
  }

  function resetBallAfterScore(){
    ball.x = W/2;
    ball.y = H/2;
    ball.speed = 6;
    // send ball toward the player who just lost (so the scorer serves)
    const dir = Math.random() > 0.5 ? 1 : -1;
    ball.vx = 6 * dir;
    ball.vy = (Math.random()*6 - 3);
  }

  // draw
  function draw(){
    // background
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,W,H);

    // midline dotted
    ctx.fillStyle = '#0ff3b7';
    const dashH = 16, dashGap = 12;
    for (let y=10; y<H; y += dashH + dashGap) {
      ctx.fillRect(W/2 - 4, y, 8, dashH);
    }

    // paddles
    drawRect(leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h);
    drawRect(rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h);

    // ball (circle)
    drawCircle(ball.x, ball.y, ball.r);

    // scores
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ffea';
    ctx.fillText(score.left, W*0.25, 70);
    ctx.fillText(score.right, W*0.75, 70);

    // small HUD text
    ctx.font = '12px monospace';
    ctx.fillStyle = '#7fbcbc';
    ctx.textAlign = 'left';
    ctx.fillText('Repo: thepongashzer.exe', 10, H - 8);
  }

  function drawRect(x,y,w,h){
    // retro outline + fill
    ctx.fillStyle = '#00ffea';
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
    // slight inner shadow
    ctx.strokeStyle = 'rgba(255,0,68,0.08)';
    ctx.strokeRect(Math.round(x)+1, Math.round(y)+1, w-2, h-2);
  }

  function drawCircle(x,y,r){
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI*2);
    ctx.fillStyle = '#ff2d6f';
    ctx.fill();
    // rim
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.stroke();
  }

  let rafId = null;
  function loop(){
    // single frame update + draw
    update();
    draw();
    if (mode === 'playing') {
      rafId = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(rafId);
    }
  }

  // start paused with menu open
  openMenu();

  // expose some global for debugging
  window._pong = { startGame, restartRound, openMenu };

})();
