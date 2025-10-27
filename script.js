(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('menuBtn');
  const onePlayerBtn = document.getElementById('onePlayerBtn');
  const twoPlayerBtn = document.getElementById('twoPlayerBtn');
  const restartBtn = document.getElementById('restartBtn');

  // plein écran auto
  function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  let W = canvas.width, H = canvas.height;

  const paddleWidth = 14;
  const paddleHeight = 100;
  const paddleSpeed = 6;
  const maxScore = 11;

  let leftPaddle, rightPaddle, ball;
  let keys = {};
  let mode = 'menu';
  let gameMode = '1p';
  let score = { left:0, right:0 };
  let winner = null;

  const beep = (f=440,t=0.05)=>{
    try{
      const a=new (window.AudioContext||window.webkitAudioContext)();
      const o=a.createOscillator(),g=a.createGain();
      o.type='square';o.frequency.value=f;o.connect(g);g.connect(a.destination);
      g.gain.value=0.03;o.start();
      g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+t);
      o.stop(a.currentTime+t+0.02);
    }catch(e){}
  };

  function resetObjects(){
    W = canvas.width; H = canvas.height;
    leftPaddle={x:20,y:(H-paddleHeight)/2,w:paddleWidth,h:paddleHeight};
    rightPaddle={x:W-20-paddleWidth,y:(H-paddleHeight)/2,w:paddleWidth,h:paddleHeight};
    ball={x:W/2,y:H/2,r:9,vx:Math.random()>0.5?6:-6,vy:(Math.random()*6-3)};
  }

  resetObjects();

  window.addEventListener('keydown',e=>{
    keys[e.key.toLowerCase()]=true;
    if(e.key==='Escape')openMenu();
    if(e.key.toLowerCase()==='p')togglePause();
  });
  window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});

  menuBtn.addEventListener('click',openMenu);
  onePlayerBtn.addEventListener('click',()=>startGame('1p'));
  twoPlayerBtn.addEventListener('click',()=>startGame('2p'));
  restartBtn.addEventListener('click',restartRound);

  function openMenu(){mode='menu';menu.classList.remove('hidden');}
  function closeMenu(){menu.classList.add('hidden');}
  function startGame(m){gameMode=m;score.left=0;score.right=0;winner=null;resetObjects();mode='playing';closeMenu();loop();}
  function togglePause(){if(mode==='playing'){mode='paused';menu.classList.remove('hidden');}else if(mode==='paused'){mode='playing';closeMenu();loop();}}
  function restartRound(){score.left=0;score.right=0;winner=null;resetObjects();mode='playing';closeMenu();loop();}

  function update(){
    if(mode!=='playing'||winner)return;

    // J1 : W/S ou flèches
    if(keys['w']||keys['arrowup']) leftPaddle.y-=paddleSpeed;
    if(keys['s']||keys['arrowdown']) leftPaddle.y+=paddleSpeed;

    if(gameMode==='2p'){
      if(keys['arrowup']) rightPaddle.y-=paddleSpeed;
      if(keys['arrowdown']) rightPaddle.y+=paddleSpeed;
    }else{
      // IA moins parfaite
      const aiCenter=rightPaddle.y+rightPaddle.h/2;
      const diff=ball.y-aiCenter;
      const aiSpeed=4.5;
      const noise=Math.random()*30-15;
      rightPaddle.y+=Math.sign(diff+noise)*Math.min(aiSpeed,Math.abs(diff)/10);
    }

    // Limites
    leftPaddle.y=Math.max(0,Math.min(H-leftPaddle.h,leftPaddle.y));
    rightPaddle.y=Math.max(0,Math.min(H-rightPaddle.h,rightPaddle.y));

    // Balle
    ball.x+=ball.vx; ball.y+=ball.vy;
    if(ball.y-ball.r<=0||ball.y+ball.r>=H){ball.vy=-ball.vy;beep(600);}
    // collisions
    if(ball.x-ball.r<=leftPaddle.x+leftPaddle.w&&ball.y>=leftPaddle.y&&ball.y<=leftPaddle.y+leftPaddle.h){
      ball.x=leftPaddle.x+leftPaddle.w+ball.r;reflect(leftPaddle);beep(800);}
    if(ball.x+ball.r>=rightPaddle.x&&ball.y>=rightPaddle.y&&ball.y<=rightPaddle.y+rightPaddle.h){
      ball.x=rightPaddle.x-ball.r;reflect(rightPaddle);beep(800);}
    // scores
    if(ball.x<-50){score.right++;checkWin();resetBall();}
    if(ball.x>W+50){score.left++;checkWin();resetBall();}
  }

  function reflect(p){
    const rel=(ball.y-(p.y+p.h/2))/(p.h/2);
    const angle=rel*(Math.PI/3);
    const dir=(p===leftPaddle)?1:-1;
    const spd=Math.min(12,Math.abs(ball.vx)+0.7);
    ball.vx=spd*Math.cos(angle)*dir;
    ball.vy=spd*Math.sin(angle);
  }

  function resetBall(){ball.x=W/2;ball.y=H/2;ball.vx=(Math.random()>0.5?6:-6);ball.vy=(Math.random()*6-3);}
  function checkWin(){
    if(score.left>=maxScore){winner='Joueur 1';endGame();}
    else if(score.right>=maxScore){winner=(gameMode==='1p')?'Ordinateur':'Joueur 2';endGame();}
  }
  function endGame(){
    beep(200,0.3);mode='paused';
    setTimeout(()=>{
      menu.classList.remove('hidden');
      menu.querySelector('.title').innerText=`🎉 ${winner} a gagné !`;
    },200);
  }

  function draw(){
    ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#0ff3b7';
    for(let y=10;y<H;y+=28)ctx.fillRect(W/2-3,y,6,16);
    ctx.fillStyle='#00ffea';
    ctx.fillRect(leftPaddle.x,leftPaddle.y,leftPaddle.w,leftPaddle.h);
    ctx.fillRect(rightPaddle.x,rightPaddle.y,rightPaddle.w,rightPaddle.h);
    ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fillStyle='#ff2d6f';ctx.fill();

    ctx.font='48px monospace';ctx.textAlign='center';ctx.fillStyle='#00ffea';
    ctx.fillText(score.left,W*0.25,70);ctx.fillText(score.right,W*0.75,70);

    if(winner){
      ctx.font='30px monospace';ctx.fillStyle='#ff0044';
      ctx.fillText(`${winner} a gagné !`,W/2,H/2-40);
    }
  }

  let raf;
  function loop(){
    update();draw();
    if(mode==='playing')raf=requestAnimationFrame(loop);
    else cancelAnimationFrame(raf);
  }

  openMenu();
})();
