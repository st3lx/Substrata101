// app.js - Interactive audio visualization with multiple styles including WebGL Aurora

document.addEventListener("DOMContentLoaded", () => {
  // ----- DOM elements -----
  const audioInput = document.getElementById("audioFile");
  const canvas = document.getElementById("visualizer");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const progressBar = document.getElementById("progressBar");
  const timeDisplay = document.getElementById("timeDisplay");
  const fileLabel = document.getElementById("fileLabel");

  if (!canvas) {
    console.error("Canvas element #visualizer not found.");
    return;
  }

  const ctx2d = canvas.getContext("2d");

  // ----- Audio / Analyser state -----
  let audio = null;
  let audioCtx = null;
  let sourceNode = null;
  let analyser = null;
  let dataArray = null;
  let bufferLength = 0;
  let isAudioPlaying = false;

  // ----- Canvas / drawing state -----
  let animationId = null;
  let currentStyle = "florr"; // default to Florr
  let auroraGL = null;
  let getBands = null;
  
    // Style-specific state variables
  let particles = [];
  let lastTime = 0;
  let hueRotation = 0;

  // Starry Night particle arrays - ADD THESE HERE
  let bandParticles = [];
  let waveParticles = [];
  let newBlueBandParticles = [];
  let swirlParticles = [];
  let indigoWave1Particles = [];
  let indigoWave2Particles = [];

  // ----- Recording state -----
  let mediaRecorder = null;
  let recordingChunks = [];
  let lastRecordingBlob = null;

  // ----- Utilities -----
  function dprSizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || Math.min(window.innerWidth * 0.95, 1000);
    const cssHeight = canvas.clientHeight || 500;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    if (ctx2d) ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clearCanvas() {
    if (ctx2d) {
      ctx2d.fillStyle = "#000015";
      ctx2d.setTransform(1, 0, 0, 1, 0, 0); // reset transform
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    }
  }


  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function updateProgress() {
    if (!audio || isNaN(audio.duration)) return;
    
    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = percent + '%';
    
    timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }

  // ----- Audio setup -----
  function setupAudioFromFile(file) {
    if (audio) {
      try { audio.pause(); } catch {}
      if (sourceNode && audioCtx) {
        try { sourceNode.disconnect(); } catch {}
      }
      audio = null;
      isAudioPlaying = false;
    }

    audio = new Audio(URL.createObjectURL(file));
    audio.crossOrigin = "anonymous";
    audio.loop = false;

    // Update file label
    if (fileLabel && file) {
      fileLabel.textContent = file.name;
    }

    // Set up progress tracking
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', () => {
      progressBar.style.width = '0%';
      timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
    });

    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    sourceNode = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    getBands = createBandEnergiesGetter(analyser, dataArray);

    audio.addEventListener("ended", () => {
      isAudioPlaying = false;
      stopBtn.click();
    });
    
    // Auto-start visualization when file is selected
    startBtn.click();
  }

  // ----- Visualization styles -----
  
 // Put this near your other render functions (replace previous renderFlorr placeholder)

// ---------------------------
// Audio analysis for Florr
// ---------------------------

  

// Florr state and math functions
const florrState = {
  time: 0,
  dimension: 4,
  symmetry: 6,
  complexity: 5,
  animationSpeed: 0.9,
  points: [],
  colorPalettes: [
    ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
    ['#6A0572', '#0dabefff', '#5C80BC', '#4D9DE0', '#0fe0fcff'],
    ['#1A535C', '#4ECDC4', '#F7FFF7', '#3f67ecff', '#FFE66D'],
    ['#fb2448ff', '#419D78', '#E0A458', '#FFDBB5', '#C04ABC']
  ],
  currentPalette: 0
};

function matMul(A, B) {
  return [
    [A[0][0]*B[0][0] + A[0][1]*B[1][0], A[0][0]*B[0][1] + A[0][1]*B[1][1]],
    [A[1][0]*B[0][0] + A[1][1]*B[1][0], A[1][0]*B[0][1] + A[1][1]*B[1][1]],
  ];
}

function factorial(n) { return n<=1 ? 1 : n*factorial(n-1); }

function expm(A, t) {
  const I = [[1,0],[0,1]];
  let result = [[1,0],[0,1]];
  let term = [[1,0],[0,1]];
  for (let n=1; n<10; n++) {
    term = matMul(A, term);
    const scalar = Math.pow(t, n) / factorial(n);
    result = [
      [result[0][0] + scalar*term[0][0], result[0][1] + scalar*term[0][1]],
      [result[1][0] + scalar*term[1][0], result[1][1] + scalar*term[1][1]],
    ];
  }
  return result;
}

function drawEllipse(M, r, color, alpha=0.44, scale=140, cx=0, cy=0, offsetAngle=0) {
  ctx2d.strokeStyle = color;
  ctx2d.globalAlpha = alpha;
  ctx2d.lineWidth = 1.6;
  ctx2d.beginPath();
  for (let θ = 0; θ < 2*Math.PI; θ += 0.04) {
    const x = r*Math.cos(θ);
    const y = r*Math.sin(θ);
    const X = M[0][0]*x + M[0][1]*y;
    const Y = M[1][0]*x + M[1][1]*y;
    const rotX = Math.cos(offsetAngle)*X - Math.sin(offsetAngle)*Y;
    const rotY = Math.sin(offsetAngle)*X + Math.cos(offsetAngle)*Y;
    ctx2d.lineTo(cx + scale*rotX, cy + scale*rotY);
  }
  ctx2d.closePath();
  ctx2d.stroke();
  ctx2d.globalAlpha = 1.1;
}

function generatePoints(dim, count) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 0.25 + 0.6 * Math.random();
    pts.push({
      x: 3*radius * Math.cos(angle * dim),
      y: 3*radius * Math.sin(angle * dim),
      originalX: radius * Math.cos(angle * dim),
      originalY: radius * Math.sin(angle * dim),
      phase: Math.random() * Math.PI * 2,
      energy: 0.3 + 0.9 * Math.random()
    });
  }
  return pts;
}

function applyFlow(points, time) {
  return points.map(p => {
    const flowX = Math.sin(p.originalX * 2 + time) * 0.15;
    const flowY = Math.cos(p.originalY * 2 + time) * 0.15;
    return {...p, x: p.originalX + flowX, y: p.originalY + flowY, phase: p.phase + time * 0.5};
  });
}

// Initialize points
florrState.points = generatePoints(florrState.dimension, 75);

function renderFlorr() {
  dprSizeCanvas();
  clearCanvas();
  if (!ctx2d) return;

  // Get audio data for responsiveness
  let audioEnergy = 0;
  let beatIntensity = 0;
  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    // Calculate RMS energy
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] / 255;
    }
    audioEnergy = sum / dataArray.length;
    
    // Simple beat detection (low frequency emphasis)
    let lowSum = 0;
    const lowEnd = Math.floor(dataArray.length * 0.2);
    for (let i = 0; i < lowEnd; i++) {
      lowSum += dataArray[i] / 255;
    }
    beatIntensity = lowSum / lowEnd;
  }

  const cw = canvas.width;
  const ch = canvas.height;
  const cx = cw / 2;
  const cy = ch / 2;
  
  // Audio-responsive timing
  florrState.time += 0.02 * florrState.animationSpeed * (1 + audioEnergy * 0.8);

  const transformedPoints = applyFlow(florrState.points, florrState.time);

  // Draw outer point-based mandala
  const angleStep = (2 * Math.PI) / florrState.symmetry;
  const palette = florrState.colorPalettes[florrState.currentPalette];
  
  for (let sector = 0; sector < florrState.symmetry; sector++) {
    ctx2d.save();
    ctx2d.translate(cx, cy);
    ctx2d.rotate(sector * angleStep);

    transformedPoints.forEach(p => {
      const x = p.x * cw * 0.4 * (1 + beatIntensity * 0.6);
      const y = p.y * ch * 0.4 * (1 + beatIntensity * 0.6);
      const colorIndex = Math.floor((p.phase / (2 * Math.PI)) * palette.length) % palette.length;
      const alpha = 0.14 + 0.4 * Math.sin(p.phase + florrState.time) + audioEnergy * 0.3;
      ctx2d.fillStyle = palette[colorIndex];
      ctx2d.globalAlpha = alpha * p.energy * (1 + audioEnergy * 0.5);
      const size = 7 + florrState.complexity * (1 + beatIntensity* 0.8);
      ctx2d.beginPath();
      ctx2d.arc(x, y, size, 0, Math.PI * 2);
      ctx2d.fill();
    });

    ctx2d.restore();
  }

  // Draw inner colorful core mandala
  const J = [[0, 1], [-1, 0]];
  const t = florrState.time;

  // Core layers with audio modulation
  const corePulse = 1 + florrState.beatPulse * 1.5 + beatIntensity * 1.2; // Much stronger pulse
  const coreH = [[corePulse + 0.6 * Math.sin(t * 1.5), 0], [0, 0.7]]; // More compression (0.7 instead of 1)
  const M_core = expm(matMul(J, coreH), Math.sin(t) * (1 + audioEnergy * 0.3));

  const coreScale = 120 * (1 + audioEnergy * 0.2);
  drawEllipse(M_core, 0.3, 'rgba(255,215,0,0.9)', 0.7 + audioEnergy * 0.4, coreScale, cx, cy);
  drawEllipse(M_core, 0.25, 'rgba(255,240,100,0.8)', 0.7 + audioEnergy * 0.4, coreScale + 10, cx, cy);
  drawEllipse(M_core, 0.35, 'rgba(252, 224, 7, 1)', 0.6 + audioEnergy * 0.4, coreScale + 20, cx, cy);

  // Additional petals with audio-responsive colors
  const petals = [];
  for (let i = 0; i < 8; i++) {
    const ω = 0.5 + 0.05 * i;
    const H = [[ω * ω, 0], [0, 1]];
    const JH = matMul(J, H);
    petals.push({ JH, ω, r: 0.5 + 0.07 * i });
  }

  for (let i = 0; i < petals.length; i++) {
    const { r } = petals[i];
    const phase = Math.sin(t + i * 0.6) * (1 + audioEnergy * 0.4);
    const modH = [
  [1 + 0.4 * Math.sin(t * 1.6 + i) * (1 + beatIntensity * 0.4), 0.2 * Math.cos(t * 1.4 + i)],
  [0.2 * Math.cos(t * 1.4 + i), 0.9 - 0.18 * Math.sin(t * 1.6 + i) * (1 + beatIntensity * 0.6)]
];
    const JH_t = matMul(J, modH);
    const M = expm(JH_t, phase);
    
    // Audio-responsive hue shifting
    const hueShift = audioEnergy * 100;
    const hue = (t * 30 + i * 40 + hueShift) % 360;

    for (let k = 0; k < 8; k++) {
      const angle = k * (Math.PI / 4);
      const petalScale = 200 + 15 * i + beatIntensity * 20;
      const alpha = 0.45 + audioEnergy * 0.6;
      drawEllipse(M, r * (1 + beatIntensity * 0.3), `hsl(${hue}, 100%, 80%)`, alpha, petalScale, cx, cy, angle);
    }
  }

  // Rotate color palette occasionally
  if (Math.random() < 0.002) {
    florrState.currentPalette = (florrState.currentPalette + 1) % florrState.colorPalettes.length;
  }
}




function renderAurora() {
  
}

// 4. Storm style
function renderStorm() {
  dprSizeCanvas();
  clearCanvas();
  if (!ctx2d || !analyser || !dataArray) return;

  // Get audio data for lightning triggering
  analyser.getByteFrequencyData(dataArray);
  
  // Calculate volume/energy for lightning triggering
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] / 255;
  }
  const audioEnergy = sum / dataArray.length;
  
  // Calculate beat intensity for lightning size
  let lowSum = 0;
  const lowEnd = Math.floor(dataArray.length * 0.2);
  for (let i = 0; i < lowEnd; i++) {
    lowSum += dataArray[i] / 255;
  }
  const beatIntensity = lowSum / lowEnd;

  const cw = canvas.width;
  const ch = canvas.height;
  const DPR = window.devicePixelRatio || 1;

  // Initialize storm state if needed
  if (!renderStorm.initialized) {
    renderStorm.initialized = true;
    renderStorm.flashes = [];
    renderStorm.cloudRotation = 0;
    renderStorm.rainDrops = [];
    renderStorm.cloudTexture = new Image();
    renderStorm.cloudTexture.crossOrigin = "anonymous";
    renderStorm.cloudTexture.src = "https://cdn.pixabay.com/photo/2024/05/10/10/29/atmosphere-8752835_1280.png";
    renderStorm.cloudLoaded = false;
    
    renderStorm.cloudTexture.onload = function() {
      renderStorm.cloudLoaded = true;
    };
    
    // Initialize rain drops (from HTML)
    renderStorm.rainDrops = new Array(220).fill(0).map(() => ({
      x: Math.random() * cw,
      y: Math.random() * -ch,
      v: (0.9 + Math.random() * 0.9) * DPR,
      l: (18 + Math.random() * 28) * DPR,
      a: 0.05 + Math.random() * 0.07
    }));

    // Lightning parameters from HTML
    renderStorm.intensity = 1.0;
    renderStorm.branchChance = 0.22;
    renderStorm.jaggedness = 0.35;
  }

  // Draw dark stormy background (from HTML)
  const grad = ctx2d.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#0b0f1a');
  grad.addColorStop(1, '#0a0d16');
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0, 0, cw, ch);

  // Draw rotating cloud background
  if (renderStorm.cloudLoaded) {
    ctx2d.save();
    ctx2d.translate(cw/2, ch/2);
    renderStorm.cloudRotation -= 0.0005;
    ctx2d.rotate(renderStorm.cloudRotation);
    ctx2d.globalAlpha = 0.34;
    ctx2d.drawImage(renderStorm.cloudTexture, -cw*0.85, -ch*0.9, cw*1.4, ch*1.6);
    ctx2d.globalAlpha = 1.0;
    ctx2d.restore();
  }

  // Draw rain (from HTML)
  ctx2d.save();
  ctx2d.strokeStyle = 'rgba(160, 175, 200, 0.08)';
  ctx2d.lineWidth = DPR;
  ctx2d.beginPath();
  renderStorm.rainDrops.forEach(d => {
    ctx2d.moveTo(d.x, d.y);
    ctx2d.lineTo(d.x, d.y + d.l);
    d.y += d.v * 14;
    d.x += 0.2 * DPR;
    if (d.y > ch) { 
      d.y = Math.random() * -ch * 0.4; 
      d.x = Math.random() * cw; 
    }
  });
  ctx2d.stroke();
  ctx2d.restore();

// Audio-responsive lightning triggering - FIXED VERSION
if (!renderStorm.lastEnergy) renderStorm.lastEnergy = 0;

// Calculate frequency bands for better responsiveness
analyser.getByteFrequencyData(dataArray);
const bassBands = dataArray.slice(0, Math.floor(bufferLength * 0.1)); // First 10%
const midBands = dataArray.slice(Math.floor(bufferLength * 0.1), Math.floor(bufferLength * 0.5)); // 10-50%
const highBands = dataArray.slice(Math.floor(bufferLength * 0.5)); // 50-100%

const bassEnergy = bassBands.reduce((a, b) => a + b, 0) / (bassBands.length * 255);
const midEnergy = midBands.reduce((a, b) => a + b, 0) / (midBands.length * 255);
const highEnergy = highBands.reduce((a, b) => a + b, 0) / (highBands.length * 255);

// Multiple trigger conditions for better audio response:

// 1. Bass drops = big lightning
if (bassEnergy > 0.55 && Math.random() > 0.9) {
    const intensity = 0.6 + bassEnergy * 0.8;
    renderStorm.flashes.push(makeBolt(cw, ch, DPR, intensity));
}

// 2. Volume spikes = quick lightning
const volumeSpike = audioEnergy > renderStorm.lastEnergy * 1.8;
if (volumeSpike && audioEnergy > 0.65) {
    const intensity = 0.4 + audioEnergy * 0.6;
    renderStorm.flashes.push(makeBolt(cw, ch, DPR, intensity));
}

// 3. General loudness = occasional lightning
if (audioEnergy > 0.6 && Math.random() > 0.9) {
    renderStorm.flashes.push(makeBolt(cw, ch, DPR, 0.5 + audioEnergy * 0.5));
}

// 4. High frequency bursts = small lightning
if (highEnergy > 0.8 && Math.random() > 0.8) {
    renderStorm.flashes.push(makeBolt(cw, ch, DPR, 0.3 + highEnergy * 0.4));
}

renderStorm.lastEnergy = audioEnergy;

  // Random lightning strikes (from HTML timing)
  if (Math.random() < 0.005) {
    const count = Math.floor(1 + Math.random() );
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        renderStorm.flashes.push(makeBolt(cw, ch, DPR, 0.7 + Math.random() * 0.4));
      }, Math.random() * 160);
    }
  }

  // Update and draw lightning flashes (from HTML animation)
  ctx2d.save();
  renderStorm.flashes = renderStorm.flashes.filter(b => b.age < b.life);
  renderStorm.flashes.forEach(b => {
    b.age += 5;
    drawBolt(ctx2d, b, cw, ch, DPR);
  });
  ctx2d.restore();
}

// Add this function near your other utility functions
function getLightningColor(intensity, fade, isBranch = false) {
    // Purple to white gradient based on intensity and fade
    const t = Math.random() * intensity; // 0 → purple, 1 → white
    
    if (isBranch) {
        // Branches are more purple
        const r = Math.floor(180 + t * 75); // 180-255
        const g = Math.floor(120 + t * 135); // 120-255
        const b = Math.floor(255); // Always max blue for purple
        return `rgba(${r},${g},${b},${fade})`;
    } else {
        // Main bolt can vary more
        const r = Math.floor(153 + t * 102); // 153-255
        const g = Math.floor(102 + t * 153); // 102-255
        const b = Math.floor(255); // Always max blue
        return `rgba(${r},${g},${b},${fade})`;
    }
}
// Lightning functions from HTML
function makeBolt(cw, ch, DPR, intensity = 1.0) {
    // Extreme position variation
    const startX = (cw * 0.1) + Math.random() * (cw * 0.8); // Wider horizontal range
    const endX = startX + (Math.random() - 0.5) * (cw * 0.3); // More horizontal spread
    
    // Very wide vertical range - some very short, some screen-spanning
    const startY = ch * (0.005 + Math.random() * 0.15); // 0.5%-15.5% from top
    const endY = ch * (0.3 + Math.random() * 0.68); // 30%-98% from top
    
    // Extreme step variation - very short to very long bolts
    let steps;
    const lengthRand = Math.random();
    if (lengthRand < 0.3) {
        steps = Math.floor(4 + Math.random() * 6); // 4-9 steps (very short)
    } else if (lengthRand < 0.7) {
        steps = Math.floor(10 + Math.random() * 15); // 10-24 steps (medium)
    } else if (lengthRand < 0.9) {
        steps = Math.floor(25 + Math.random() * 15); // 25-39 steps (long)
    } else {
        steps = Math.floor(40 + Math.random() * 20); // 40-59 steps (very long)
    }

    // Noise function from HTML
    const seed = Math.random() * 1e6;
    let x = seed, y = seed * 1.618;
    const n = t => {
        x += 0.01; y += 0.013;
        const s = Math.sin(x) + Math.sin(y * 0.7) * 0.5;
        return s * 0.5 + 0.5;
    };

    const segments = [];
    const jaggedness = 0.2*renderStorm.jaggedness;
    
    // Adjust jaggedness based on length - longer bolts can be more jagged
    const lengthAdjustedJaggedness = jaggedness * (0.5 + (steps / 60));

    // Build main path (from HTML)
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const xPos = startX + (endX - startX) * t;
        const yPos = startY + (endY - startY) * t;

        const bend = (Math.sin(t * Math.PI * 1.2) * (Math.random() - 0.5) * 60) * DPR;
        const jitterX = (n(t * 7) - 0.5) * 100 * lengthAdjustedJaggedness * DPR;
        const jitterY = (n(t * 9) - 0.5) * 60 * lengthAdjustedJaggedness * DPR;
        
        segments.push({ 
            x: xPos + bend + jitterX, 
            y: yPos + jitterY 
        });
    }

    const branches = [];

    // Recursive branch generator - more branches on longer bolts
    function makeBranch(origin, depth = 0) {
        const baseLen = 3 + Math.random() * 8;
        const len = Math.floor(baseLen * (0.4 + (steps / 40))); // Scale with main bolt length
        
        const angle = (Math.PI * 0.3) + Math.random() * (Math.PI * 0.7);
        const segs = [origin];
        let bx = origin.x, by = origin.y;

        for (let k = 0; k < len; k++) {
            bx += Math.cos(angle + (Math.random() - 0.5) * 0.6) * (15 + Math.random() * 20) * DPR;
            by += Math.sin(angle + (Math.random() - 0.5) * 0.4) * (15 + Math.random() * 20) * DPR;
            segs.push({ x: bx, y: by });

            if (depth < 1.8 && Math.random() < 0.15) {
                branches.push(makeBranch({ x: bx, y: by }, depth + 1));
            }
        }
        return segs;
    }

    // Branch chance scales with bolt length
    const baseBranchChance = renderStorm.branchChance;
    const lengthBasedBranchChance = baseBranchChance * (0.3 + (steps / 30));

    // Spawn branches from main path
    for (let i = 3; i < segments.length - 3; i++) {
        if (Math.random() < lengthBasedBranchChance * (1 - i / segments.length)) {
            branches.push(makeBranch(segments[i], 0));
        }
    }

    return {
        main: segments,
        branches,
        age: 0,
        life: 60 + (steps * 2) + Math.random() * 40, // Longer bolts live longer
        intensity: intensity * (0.6 + (steps / 50)) // Longer bolts more intense
    };
}

function drawBolt(ctx, bolt, cw, ch, DPR) {
    const age = bolt.age;
    const life = bolt.life;
    const fade = 1 - Math.min(1, age / life);

    // Global flash with purple tint
    ctx.fillStyle = `rgba(200, 180, 255, ${0.04 * bolt.intensity * fade})`;
    ctx.fillRect(0, 0, cw, ch);

    // Lightning drawing
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // MAIN BOLT - THICKER
    // Outer glow (thickest)
    ctx.lineWidth = 4.8 * DPR * bolt.intensity; // Thicker based on intensity
    ctx.strokeStyle = getLightningColor(bolt.intensity, 0.4 * fade, false);
    ctx.shadowBlur = 30 * DPR * bolt.intensity;
    ctx.shadowColor = 'rgba(169, 120, 255, 0.7)'; // More purple shadow
    drawLightningPath(ctx, bolt.main);

    // Main bolt middle layer
    ctx.lineWidth = 3.6 * DPR * bolt.intensity;
    ctx.strokeStyle = getLightningColor(bolt.intensity, 0.7 * fade, false);
    ctx.shadowBlur = 15 * DPR;
    ctx.shadowColor = 'rgba(200, 160, 255, 0.8)';
    drawLightningPath(ctx, bolt.main);

    // Main bolt inner core (brightest)
    ctx.lineWidth = 2.2 * DPR * bolt.intensity;
    ctx.strokeStyle = getLightningColor(bolt.intensity, 0.9 * fade, false);
    ctx.shadowBlur = 8 * DPR;
    ctx.shadowColor = 'rgba(220, 200, 255, 0.9)';
    drawLightningPath(ctx, bolt.main);

    // BRANCHES - THINNER
    bolt.branches.forEach(branch => {
        // Branch outer glow (thinner than main bolt)
        ctx.lineWidth = 3.4 * DPR * bolt.intensity * 0.8; 
        ctx.strokeStyle = getLightningColor(bolt.intensity, 0.5 * fade, true);
        ctx.shadowBlur = 20 * DPR * bolt.intensity * 0.7;
        ctx.shadowColor = 'rgba(150, 100, 255, 0.6)';
        drawLightningPath(ctx, branch);

        // Branch inner core (thinner)
        ctx.lineWidth = 2.0 * DPR * bolt.intensity * 0.8;
        ctx.strokeStyle = getLightningColor(bolt.intensity, 0.5 * fade, true);
        ctx.shadowBlur = 6 * DPR;
        ctx.shadowColor = 'rgba(180, 140, 255, 0.8)';
        drawLightningPath(ctx, branch);
    });

    ctx.restore();
}

function drawLightningPath(ctx, points) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

// Linear interpolation helper
function lerp(a, b, t) {
  return a + (b - a) * t;
}
  
  // Bezier curve control points
const P0 = [0.00, 0.82];
const P1 = [0.25, 0.76];
const P2 = [0.65, 0.53];
const P3 = [1.00, 0.58];
const WaveP0 = [0.00, 0.25];
const WaveP1 = [0.10, 0.45];
const WaveP2 = [0.36, 0.04];
const WaveP3 = [0.46, 0.42];
const NewBlueBandP0 = [0.38, 0.20];
const NewBlueBandP1 = [0.55, 0.32];
const NewBlueBandP2 = [0.85, 0.38];
const NewBlueBandP3 = [1.00, 0.42];
const IndigoWave1P0 = [0.40, 1.00];
const IndigoWave1P1 = [0.46, 0.92];
const IndigoWave1P2 = [0.60, 0.87];
const IndigoWave1P3 = [0.68, 0.90];
const IndigoWave2P0 = [0.70, 1.00];
const IndigoWave2P1 = [0.78, 0.90];
const IndigoWave2P2 = [0.93, 0.82];
const IndigoWave2P3 = [1.00, 0.82];

// Bezier curve functions
function bezierPoint(t) {
  const u = 1 - t;
  const tt = t*t, uu = u*u;
  const uuu = uu * u, ttt = tt * t;
  const x = uuu*P0[0] + 3*uu*t*P1[0] + 3*u*tt*P2[0] + ttt*P3[0];
  const y = uuu*P0[1] + 3*uu*t*P1[1] + 3*u*tt*P2[1] + ttt*P3[1];
  return [x, y];
}

function bezierTangent(t) {
  const ax = 3*(P1[0] - P0[0]);
  const ay = 3*(P1[1] - P0[1]);
  const bx = 3*(P2[0] - P1[0]) - ax;
  const by = 3*(P2[1] - P1[1]) - ay;
  const cx = P3[0] - P0[0] - ax - bx;
  const cy = P3[1] - P0[1] - ay - by;
  const x = (3*cx*t*t + 2*bx*t + ax);
  const y = (3*cy*t*t + 2*by*t + ay);
  return [x, y];
}

 function waveBezierPoint(t){
    const u = 1 - t;
    const tt = t*t, uu = u*u;
    const uuu = uu * u, ttt = tt * t;
    const x = uuu*WaveP0[0] + 3*uu*t*WaveP1[0] + 3*u*tt*WaveP2[0] + ttt*WaveP3[0];
    const y = uuu*WaveP0[1] + 3*uu*t*WaveP1[1] + 3*u*tt*WaveP2[1] + ttt*WaveP3[1];
    return [x, y];
  }

  function waveBezierTangent(t){
    const ax = 3*(WaveP1[0] - WaveP0[0]);
    const ay = 3*(WaveP1[1] - WaveP0[1]);
    const bx = 3*(WaveP2[0] - WaveP1[0]) - ax;
    const by = 3*(WaveP2[1] - WaveP1[1]) - ay;
    const cx = WaveP3[0] - WaveP0[0] - ax - bx;
    const cy = WaveP3[1] - WaveP0[1] - ay - by;
    const x = (3*cx*t*t + 2*bx*t + ax);
    const y = (3*cy*t*t + 2*by*t + ay);
    return [x, y];
  }

  // New blue band functions
  function newBlueBandBezierPoint(t){
    const u = 1 - t;
    const tt = t*t, uu = u*u;
    const uuu = uu * u, ttt = tt * t;
    const x = uuu*NewBlueBandP0[0] + 3*uu*t*NewBlueBandP1[0] + 3*u*tt*NewBlueBandP2[0] + ttt*NewBlueBandP3[0];
    const y = uuu*NewBlueBandP0[1] + 3*uu*t*NewBlueBandP1[1] + 3*u*tt*NewBlueBandP2[1] + ttt*NewBlueBandP3[1];
    return [x, y];
  }

  function newBlueBandBezierTangent(t){
    const ax = 3*(NewBlueBandP1[0] - NewBlueBandP0[0]);
    const ay = 3*(NewBlueBandP1[1] - NewBlueBandP0[1]);
    const bx = 3*(NewBlueBandP2[0] - NewBlueBandP1[0]) - ax;
    const by = 3*(NewBlueBandP2[1] - NewBlueBandP1[1]) - ay;
    const cx = NewBlueBandP3[0] - NewBlueBandP0[0] - ax - bx;
    const cy = NewBlueBandP3[1] - NewBlueBandP0[1] - ay - by;
    const x = (3*cx*t*t + 2*bx*t + ax);
    const y = (3*cy*t*t + 2*by*t + ay);
    return [x, y];
  }
// Indigo wave 1 functions
function indigoWave1BezierPoint(t){
  const u = 1 - t;
  const tt = t*t, uu = u*u;
  const uuu = uu * u, ttt = tt * t;
  const x = uuu*IndigoWave1P0[0] + 3*uu*t*IndigoWave1P1[0] + 3*u*tt*IndigoWave1P2[0] + ttt*IndigoWave1P3[0];
  const y = uuu*IndigoWave1P0[1] + 3*uu*t*IndigoWave1P1[1] + 3*u*tt*IndigoWave1P2[1] + ttt*IndigoWave1P3[1];
  return [x, y];
}

function indigoWave1BezierTangent(t){
  const ax = 3*(IndigoWave1P1[0] - IndigoWave1P0[0]);
  const ay = 3*(IndigoWave1P1[1] - IndigoWave1P0[1]);
  const bx = 3*(IndigoWave1P2[0] - IndigoWave1P1[0]) - ax;
  const by = 3*(IndigoWave1P2[1] - IndigoWave1P1[1]) - ay;
  const cx = IndigoWave1P3[0] - IndigoWave1P0[0] - ax - bx;
  const cy = IndigoWave1P3[1] - IndigoWave1P0[1] - ay - by;
  const x = (3*cx*t*t + 2*bx*t + ax);
  const y = (3*cy*t*t + 2*by*t + ay);
  return [x, y];
}

// Indigo wave 2 functions
function indigoWave2BezierPoint(t){
  const u = 1 - t;
  const tt = t*t, uu = u*u;
  const uuu = uu * u, ttt = tt * t;
  const x = uuu*IndigoWave2P0[0] + 3*uu*t*IndigoWave2P1[0] + 3*u*tt*IndigoWave2P2[0] + ttt*IndigoWave2P3[0];
  const y = uuu*IndigoWave2P0[1] + 3*uu*t*IndigoWave2P1[1] + 3*u*tt*IndigoWave2P2[1] + ttt*IndigoWave2P3[1];
  return [x, y];
}

function indigoWave2BezierTangent(t){
  const ax = 3*(IndigoWave2P1[0] - IndigoWave2P0[0]);
  const ay = 3*(IndigoWave2P1[1] - IndigoWave2P0[1]);
  const bx = 3*(IndigoWave2P2[0] - IndigoWave2P1[0]) - ax;
  const by = 3*(IndigoWave2P2[1] - IndigoWave2P1[1]) - ay;
  const cx = IndigoWave2P3[0] - IndigoWave2P0[0] - ax - bx;
  const cy = IndigoWave2P3[1] - IndigoWave2P0[1] - ay - by;
  const x = (3*cx*t*t + 2*bx*t + ax);
  const y = (3*cy*t*t + 2*by*t + ay);
  return [x, y];
}
// Swirl center function (modified for your website)
function getSwirlCenters() {
  const W = canvas.width;
  const H = canvas.height;
  return [
    { x: W*0.86, y: H*0.10, radius: Math.min(W,H)*0.36 },
    { x: W*0.85, y: H*0.10, radius: Math.min(W,H)*0.14 },
    { x: W*0.72, y: H*0.20, radius: Math.min(W,H)*0.07 },
    { x: W*0.40, y: H*0.60, radius: Math.min(W,H)*0.14 },
    { x: W*0.30, y: H*0.08, radius: Math.min(W,H)*0.07 },
    { x: W*0.37, y: H*0.35, radius: Math.min(W,H)*0.001 },
    { x: W*0.14, y: H*0.45, radius: Math.min(W,H)*0.08 },
    { x: W*0.07, y: H*0.40, radius: Math.min(W,H)*0.01 }
  ];
}

// Flow function
function flowAt(x, y, t, p) {
  const swirls = getSwirlCenters();
  const swirl = swirls[p.swirlIndex];
  const dx = x - swirl.x, dy = y - swirl.y;
  const r = Math.sqrt(dx*dx + dy*dy) + 0.0001;
  let ux = -dy / r;
  let uy = dx / r;

  const n1 = Math.sin((x*0.004 + t*0.6) + Math.cos(y*0.003 + t*0.3));
  const n2 = Math.cos((y*0.006 - t*0.4) + Math.sin(x*0.005 - t*0.2));
  const noiseX = (n1*0.6 + n2*0.3);
  const noiseY = (n2*0.6 + n1*0.3);

  const radFactor = Math.max(0, 1 - (r / (swirl.radius * 0.8)));
  const swirlStrength = 1.0; // Default value since we don't have UI controls
  const fx = ux * (0.9 + 2*radFactor*swirlStrength) + noiseX * 0.5 * radFactor;
  const fy = uy * (0.9 + 2*radFactor*swirlStrength) + noiseY * 0.5 * radFactor;

  const escapeRate = 0.2; // Default value
  if (r > swirl.radius * 0.8 && Math.random() < escapeRate * 0.005) {
    p.isEscaped = true;
  }
  return { fx, fy, r };
}

// Particle initialization function
function initStarryNightParticles() {
  const bandCount = 1100; // Default density
  const swirlCount = 1060; // Default density
  
  // Initialize all particle arrays
  bandParticles = []; waveParticles = []; newBlueBandParticles = [];
  swirlParticles = []; indigoWave1Particles = []; indigoWave2Particles = [];
  
  // Copy the particle initialization logic from your original initBandParticles
  // and initSwirlParticles functions, but remove the UI dependency

  const mainBandCount = Math.floor(bandCount * 0.4);
  for (let i=0;i<mainBandCount;i++){
    const t = Math.random();
    bandParticles.push({
      t,
      speed: 0.001 + Math.random()*0.0012,
      offset: (Math.random()-0.5) * 0.035,
      baseOffset: (Math.random()-0.5) * 0.035,
      size: 1.5 + Math.random()*1.8,
      color: choice(bandPalette),
      life: 400 + Math.random()*600,
      age: Math.floor(Math.random()*600)
    });
  }
  const waveBandCount = Math.floor(bandCount * 0.35);
    for (let i=0;i<waveBandCount;i++){
      const t = Math.random();
      waveParticles.push({
        t,
        speed: 0.0012 + Math.random()*0.0015,
        offset: (Math.random()-0.5) * 0.04,  // Increased width
        baseOffset: (Math.random()-0.5) * 0.04,
        size: 1.8 + Math.random()*2.0,  // Increased size
        color: choice(wavePalette),
        life: 400 + Math.random()*500,  // Longer life
        age: Math.floor(Math.random()*400)
      });
    }

    const newBlueBandCount = Math.floor(bandCount * 0.25);
    for (let i=0;i<newBlueBandCount;i++){
      const t = Math.random();
      newBlueBandParticles.push({
        t,
        speed: 0.0011 + Math.random()*0.0013,
        offset: (Math.random()-0.5) * 0.035,
        baseOffset: (Math.random()-0.5) * 0.035,
        size: 1.7 + Math.random()*1.6,
        color: choice(wavePalette),  // Use same blue palette
        life: 400 + Math.random()*450,
        age: Math.floor(Math.random()*450)
      });
    }
    // Add this inside initBandParticles function, after the other band initializations:


const indigoWave1Count = Math.floor(bandCount * 0.25);
for (let i=0;i<indigoWave1Count;i++){
  const t = Math.random();
  indigoWave1Particles.push({
    t,
    speed: 0.0011 + Math.random()*0.0012,
    offset: (Math.random()-0.5) * 0.025,
    baseOffset: (Math.random()-0.5) * 0.025,
    size: 3.2 + Math.random()*1.2,
    color: choice(indigoPalette),
    life: 400 + Math.random()*400,
    age: Math.floor(Math.random()*400)
  });
}


const indigoWave2Count = Math.floor(bandCount * 0.25);
for (let i=0;i<indigoWave2Count;i++){
  const t = Math.random();
  indigoWave2Particles.push({
    t,
    speed: 0.0007 + Math.random()*0.0012,
    offset: (Math.random()-0.5) * 0.025,
    baseOffset: (Math.random()-0.5) * 0.025,
    size: 3.2 + Math.random()*1.2,
    color: choice(indigoPalette),
    life: 400 + Math.random()*400,
    age: Math.floor(Math.random()*400)
  });
}
  

    // Initialize all other particle types similarly...
  // Copy the rest of your particle initialization code here
  
  // Initialize swirl particles
  const swirls = getSwirlCenters();
  for (let i=0;i<swirlCount;i++){
    const swirlIndex = Math.floor(Math.random() * swirls.length);
    const s = swirls[swirlIndex];
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.pow(Math.random(), 2.3) * s.radius*1.2;
    const x = s.x + Math.cos(angle) * distance;
    const y = s.y + Math.sin(angle) * distance;

    swirlParticles.push({
      x, y,
      vx: 0, vy: 0,
      life: rand(120, 600),
      age: rand(0, 300),
      size: rand(1.6, 2.4),
      color: choice(swirlPalette),
      wobble: rand(0.002, 0.01) + Math.random()*0.02,
      phase: Math.random()*Math.PI*2,
      curlOff: rand(0,1000),
      swirlIndex,
      baseX: x,
      baseY: y,
      isEscaped: false
    });
  }
}

  // 5. StarryNight style
function renderStarryNight() {
  if (!analyser || !dataArray) return;
  
  // Get audio energy for flow speed adjustment
  analyser.getByteFrequencyData(dataArray);
  let audioEnergy = 0;
  for (let i = 0; i < dataArray.length; i++) {
    audioEnergy += dataArray[i] / 255;
  }
  audioEnergy = audioEnergy / dataArray.length;
  
  // Adjust flow speed based on audio energy (0.1x to 3x range)
  const baseSpeed = 0.25;
  const audioAdjustedSpeed = baseSpeed * (0.12 + audioEnergy * 5);
  
  const t = performance.now()/1000;
  const dt = 0.016; // Fixed timestep for consistent animation
  
  // Clear with fade
  ctx2d.fillStyle = 'rgba(0, 0, 0, 0.04)';
  ctx2d.fillRect(0,0,canvas.width,canvas.height);

  const W = canvas.width, H = canvas.height;

  // Draw bands first (background)
  for (let p of bandParticles){
    p.age++;
    p.t += p.speed * dt * 60;
    if (p.t > 1) {
      p.t = 0;
      p.age = 0;
      p.baseOffset = (Math.random()-0.5) * 0.035;
      p.color = choice(bandPalette);
    }

    const widthTaper = 4.0 + p.t * 2.5;
    p.offset = p.baseOffset * widthTaper;

    const [nx, ny] = bezierPoint(p.t);
    const [tx, ty] = bezierTangent(p.t);
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len, uy = ty / len;
    const px = -uy, py = ux;

    const time = performance.now()/1000;
    const jitter = noise(nx*100, ny*100, time) * 0.006;
    const curvOffset = p.offset + jitter * 0.8;

    const sx = nx * W + px * curvOffset * W;
    const sy = ny * H + py * curvOffset * H;

    const alpha = Math.max(0.04, 1 - (p.age / p.life));
    stamp(sx, sy, p.size*1.8, p.color, alpha);
  }

  // Draw blue top band with increased density and size
  for (let p of waveParticles){
    p.age++;
    p.t += p.speed * dt * 60;
    if (p.t > 1) {
      p.t = 0;
      p.age = 0;
      p.baseOffset = (Math.random()-0.5) * 0.04;
      p.color = choice(wavePalette);
    }

    let widthTaper = 9 + p.t * 3.0;
    p.offset = p.baseOffset * widthTaper;

    const [nx, ny] = waveBezierPoint(p.t);
    const [tx, ty] = waveBezierTangent(p.t);
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len, uy = ty / len;
    const px = -uy, py = ux;

    const time = performance.now()/1000;
    const jitter = noise(nx*100, ny*100, time) * 0.004;
    const curvOffset = p.offset + jitter * 0.6;

    const sx = nx * W + px * curvOffset * W;
    const sy = ny * H + py * curvOffset * H;

    const alpha = Math.max(0.06, 1 - (p.age / p.life));
    stamp(sx, sy, p.size*2.0, p.color, alpha);
  }

  // Draw new blue band
  for (let p of newBlueBandParticles){
    p.age++;
    p.t += p.speed * dt * 60;
    if (p.t > 1) {
      p.t = 0;
      p.age = 0;
      p.baseOffset = (Math.random()-0.5) * 0.035;
      p.color = choice(wavePalette);
    }

    let widthTaper = 10 + p.t * 2.0;
    p.offset = p.baseOffset * widthTaper;

    const [nx, ny] = newBlueBandBezierPoint(p.t);
    const [tx, ty] = newBlueBandBezierTangent(p.t);
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len, uy = ty / len;
    const px = -uy, py = ux;

    const time = performance.now()/1000;
    const jitter = noise(nx*100, ny*100, time) * 0.004;
    const curvOffset = p.offset + jitter * 0.6;

    const sx = nx * W + px * curvOffset * W;
    const sy = ny * H + py * curvOffset * H;

    const alpha = Math.max(0.06, 1 - (p.age / p.life));
    stamp(sx, sy, p.size*1.8, p.color, alpha);
  }

  // Draw swirls on top with audio-adjusted speed
  for (let p of swirlParticles){
    p.age++;
    if (p.age > p.life){
      const swirls = getSwirlCenters();
      const s = swirls[p.swirlIndex];
      const angle = Math.random()*Math.PI*2;
      const distance = Math.pow(Math.random(),2.3)*s.radius*1.2;
      p.x = s.x + Math.cos(angle)*distance;
      p.y = s.y + Math.sin(angle)*distance;
      p.vx = p.vy = 0;
      p.age = 0;
      p.life = rand(120,700);
      p.size = rand(1.0,1.8);
      p.color = choice(swirlPalette);
      p.isEscaped = false;
    }
    const px = p.x, py = p.y;
    const f = flowAt(p.x,p.y,t+p.curlOff,p);
    
    // Use audio-adjusted speed instead of UI speed
    const wob = Math.sin(p.phase + p.age * p.wobble * 50) * 0.5;
    p.vx = (p.vx*0.88 + (f.fx + wob*0.8)*0.9*audioAdjustedSpeed)*0.98;
    p.vy = (p.vy*0.88 + (f.fy + wob*-0.6)*0.9*audioAdjustedSpeed)*0.98;
    p.x += p.vx;
    p.y += p.vy;
    const alpha = Math.max(0.04,1-(p.age/(p.life*0.9)));
    drawStrokeSeg(p,px,py,alpha);
  }

  // Draw indigo wave 1
  for (let p of indigoWave1Particles){
    p.age++;
    p.t += p.speed * dt * 60;
    if (p.t > 1) {
      p.t = 0;
      p.age = 0;
      p.baseOffset = (Math.random()-0.5) * 0.025;
      p.color = choice(indigoPalette);
    }

    let widthTaper = 8 + p.t * 2.0;
    p.offset = p.baseOffset * widthTaper;

    const [nx, ny] = indigoWave1BezierPoint(p.t);
    const [tx, ty] = indigoWave1BezierTangent(p.t);
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len, uy = ty / len;
    const px = -uy, py = ux;

    const time = performance.now()/1000;
    const jitter = noise(nx*100, ny*100, time) * 0.003;
    const curvOffset = p.offset + jitter * 0.5;

    const sx = nx * W + px * curvOffset * W;
    const sy = ny * H + py * curvOffset * H;

    const alpha = Math.max(0.05, 1 - (p.age / p.life));
    stamp(sx, sy, p.size*1.4, p.color, alpha);
  }

  // Draw indigo wave 2
  for (let p of indigoWave2Particles){
    p.age++;
    p.t += p.speed * dt * 60;
    if (p.t > 1) {
      p.t = 0;
      p.age = 0;
      p.baseOffset = (Math.random()-0.5) * 0.025;
      p.color = choice(indigoPalette);
    }

    let widthTaper = 8 + p.t * 2.0;
    p.offset = p.baseOffset * widthTaper;

    const [nx, ny] = indigoWave2BezierPoint(p.t);
    const [tx, ty] = indigoWave2BezierTangent(p.t);
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len, uy = ty / len;
    const px = -uy, py = ux;

    const time = performance.now()/1000;
    const jitter = noise(nx*100, ny*100, time) * 0.003;
    const curvOffset = p.offset + jitter * 0.5;

    const sx = nx * W + px * curvOffset * W;
    const sy = ny * H + py * curvOffset * H;

    const alpha = Math.max(0.05, 1 - (p.age / p.life));
    stamp(sx, sy, p.size*1.4, p.color, alpha);
  }
}

// Helper functions needed for the Starry Night renderer
function rand(a=0,b=1){ return a + Math.random()*(b-a); }
function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function noise(x,y,t){
  return Math.sin(x*0.02 + t*0.6) * 0.5 + Math.cos(y*0.018 - t*0.4) * 0.5;
}

function stamp(x, y, size, color, alpha=1) {
  ctx2d.save();
  ctx2d.globalCompositeOperation = 'source-over';
  ctx2d.globalAlpha = alpha;
  ctx2d.beginPath();
  ctx2d.fillStyle = color;
  ctx2d.ellipse(x, y, size*1.2, size*0.8, 0, 0, Math.PI*2);
  ctx2d.fill();
  ctx2d.restore();
}

function drawStrokeSeg(p, px, py, alpha) {
  ctx2d.save();
  ctx2d.globalCompositeOperation = 'lighter';
  ctx2d.globalAlpha = Math.max(0.06, alpha);
  ctx2d.lineJoin = 'round';
  ctx2d.lineCap = 'round';
  const w = 4 * p.size; // BRUSH_SIZE = 4
  ctx2d.lineWidth = Math.max(1, w * 1.1);
  ctx2d.strokeStyle = p.color;
  ctx2d.beginPath();
  ctx2d.moveTo(px, py);
  const mx = (px + p.x) * 0.5;
  const my = (py + p.y) * 0.5;
  const dx = p.x - px, dy = p.y - py;
  const perpX = -dy * 0.2 * p.size;
  const perpY = dx * 0.2 * p.size;
  const cx = mx + perpX * Math.sin(p.phase + p.age*0.01);
  const cy = my + perpY * Math.cos(p.phase - p.age*0.01);
  ctx2d.quadraticCurveTo(cx, cy, p.x, p.y);
  ctx2d.stroke();
  ctx2d.globalAlpha = Math.min(0.38, alpha * 0.6);
  ctx2d.lineWidth = Math.max(0.8, Math.max(1, w*0.25));
  ctx2d.strokeStyle = 'rgba(255,245,200,0.9)';
  ctx2d.beginPath();
  ctx2d.moveTo(px*0.98 + p.x*0.02, py*0.98 + p.y*0.02);
  ctx2d.quadraticCurveTo(cx, cy, p.x, p.y);
  ctx2d.stroke();
  ctx2d.restore();
}



// Define color palettes
const bandPalette = [
  'rgba(255,220,80,0.9)',   // Bright yellow
  'rgba(255,220,80,0.9)',   // Warm gold
  'rgba(60,120,200,0.9)',   // Medium blue
  'rgba(40,80,180,0.9)',    // Deep blue
  'rgba(255, 248, 60, 0.9)',   // Warm gold
];

const wavePalette = [
  'rgba(100,180,255,0.9)',  // Light blue
  'rgba(120,200,255,0.9)',  // Bright light blue
  'rgba(80,160,240,0.9)',   // Medium blue
  'rgba(140,220,255,0.9)',  // Very light blue
  'rgba(60,140,255,0.9)'    // Rich blue
];

const swirlPalette = [
  'rgba(255,220,80,0.95)',  // Bright yellow
  'rgba(255,200,60,0.90)',  // Warm gold
  'rgba(255,180,40,0.85)',  // Orange-yellow
  'rgba(255,160,30,0.80)',  // Deep orange
  'rgba(220,140,20,0.75)',  // Amber
  'rgba(255,220,80,0.95)',  // Bright yellow
];

const indigoPalette = [
  'rgba(0, 160, 255, 0.95)',    
  'rgba(40, 70, 180, 0.9)',    
  'rgba(80, 110, 200, 0.8)',  
  'rgba(35, 50, 100, 0.8)',
  'rgba(255, 250, 160, 0.85)',
];

  // 6. Mask style (previously Hacker)
  function renderMask() {
    dprSizeCanvas();
    clearCanvas();
    

  }

  // 7. Galaxy style
  function renderGalaxy() {
    
  }

  // 8. Quantum style
  function renderQuantum() {
  dprSizeCanvas();
  clearCanvas();
  if (!ctx2d) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const cx = cw / 2;
  const cy = ch / 2;

  // ---------------------------
  // Audio → beat / energy input
  // ---------------------------
  let audioEnergy = 0;
  let beat = 0;
  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    let sum = 0, lowSum = 0;
    const lowEnd = Math.floor(dataArray.length * 0.18);
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    for (let i = 0; i < lowEnd; i++) lowSum += dataArray[i];

    audioEnergy = (sum / dataArray.length) / 255;  
    beat = (lowSum / lowEnd) / 255;                
  }

  // ---------------------------------------------
  // 1D Gaussian Wavepacket Schrödinger Evolution
  // ---------------------------------------------
  // ψ(x, t) = A * exp( - (x - x0 - v t)^2 / (4 σ(t)^2) ) * exp( i(k0 (x - x0 - v t) - ω t) )
  //
  // σ(t) = σ0 √(1 + (t / t0)^2)     (free-particle dispersion)
  // We map: 
  //    - audioEnergy → widen σ
  //    - beat → "kick" momentum k0 and brighten phase

  // persistent state for continuous evolution
  if (!renderQuantum.state) {
    renderQuantum.state = {
      t: 0,
      x0: 0,
      σ0: 0.12,
      k0: 22,
      ω0: 0.015,
      particles: []
    };
  }

  const S = renderQuantum.state;
  S.t += 0.016 * (1 + audioEnergy * 0.8);
  S.k0 += (beat - 0.5) * 0.25;        // beat "kicks" packet
  const v = S.k0 * 0.012;              // group velocity
  const xShift = S.x0 + v * S.t;

  const σ = S.σ0 * Math.sqrt(1 + (S.t * 0.6) ** 2) * (1 + audioEnergy * 0.7);
  const A = 1 / Math.sqrt(σ * Math.sqrt(Math.PI));

  // ---------------------------------------------
  // Draw probability density |ψ|² along 1D line
  // ---------------------------------------------
  const N = 600; // resolution
  const baseY = cy;
  ctx2d.lineWidth = 2;

  // envelope fade
  ctx2d.globalAlpha = 0.9;

  ctx2d.beginPath();
  for (let i = 0; i <= N; i++) {
    const xCanvas = (i / N) * cw;
    const x = (i / N - 0.5) * 6;        // map screen → real coordinate

    const gaussian = Math.exp(-((x - xShift) ** 2) / (4 * σ * σ));
    const envelope = A * gaussian;

    const intensity = envelope * 240;  // vertical scale
    const yCanvas = baseY - intensity;

    // shimmer interference (phase)
    const phase = S.k0 * (x - xShift) - S.ω0 * S.t;
    const phaseColor = (phase * 50 + audioEnergy * 200) % 360;

    ctx2d.strokeStyle = `hsl(${phaseColor}, 90%, 65%)`;

    if (i === 0) ctx2d.moveTo(xCanvas, yCanvas);
    else ctx2d.lineTo(xCanvas, yCanvas);
  }
  ctx2d.stroke();

  ctx2d.globalAlpha = 1;

  // ---------------------------------------------
  // Probability Current Trails (quantum flow)
  // j = Im(ψ* ∂ψ/∂x)
  // Visualized as drifting particles riding local momentum
  // ---------------------------------------------
  if (S.particles.length < 120) {
    S.particles.push({
      x: Math.random() * cw,
      y: cy,
      life: Math.random() * 80 + 60
    });
  }

  S.particles.forEach(p => {
    // map canvas x → real x
    const xr = (p.x / cw - 0.5) * 6;
    const gaussian = Math.exp(-((xr - xShift) ** 2) / (4 * σ * σ));
    const envelope = A * gaussian;

    // local momentum ~ k0 * envelope
    const localVelocity = S.k0 * envelope * 0.18;

    p.x += localVelocity * cw * 0.016;
    p.life--;

    // draw particle
    const hue = (S.k0 * 12 + audioEnergy * 200) % 360;
    ctx2d.fillStyle = `hsla(${hue}, 100%, 75%, ${Math.max(p.life / 80, 0)})`;
    ctx2d.beginPath();
    ctx2d.arc(p.x, p.y, 3 + envelope * 12, 0, Math.PI * 2);
    ctx2d.fill();
  });

  S.particles = S.particles.filter(p => p.life > 0 && p.x >= 0 && p.x <= cw);

  // ---------------------------------------------
  // Beat “Measurement Sparkles”
  // ---------------------------------------------
  if (beat > 0.55) {
    const count = Math.floor(20 + beat * 40);
    for (let i = 0; i < count; i++) {
      const xx = (Math.random() * 0.6 + 0.2); // around packet center
      const xCanvas = xx * cw;
      const hue = (S.k0 * 20 + beat * 400) % 360;

      ctx2d.fillStyle = `hsla(${hue}, 100%, 85%, 0.9)`;
      ctx2d.beginPath();
      ctx2d.arc(
        xCanvas,
        cy - Math.random() * 20,
        Math.random() * 3 + 1,
        0,
        Math.PI * 2
      );
      ctx2d.fill();
    }
  }
}


  // 9. Aqua style
  function renderAqua() {
    dprSizeCanvas();
    clearCanvas();
    
    analyser.getByteFrequencyData(dataArray);
    
    
    // Draw water waves
  
    
  }

// 10. Manim style (placeholder)
  function renderManim() {
    dprSizeCanvas();
    clearCanvas();
    // Add your Manim style implementation here
  }

  
  // 11. Bounce+Neon Pulse style (placeholder)
  function renderBounce() {
    dprSizeCanvas();
    clearCanvas();
    // Add your Bounce+Neon Pulse style implementation here
  }

  
  // 12. Metropolis style (placeholder)
  function renderMetro() {
    dprSizeCanvas();
    clearCanvas();
    // Add your Metropolis style implementation here
  }

  // 13. Firework style (placeholder)
  function renderFire(){
    dprSizeCanvas();
    clearCanvas();
    // Add your Firework style implementation here
  }

  // 14. Rain style (placeholder)
function renderRain() {
  dprSizeCanvas();
  clearCanvas();
  if (!ctx2d || !analyser || !dataArray) {
    console.log('Missing required components:', { ctx2d: !!ctx2d, analyser: !!analyser, dataArray: !!dataArray });
    return;
  }

  analyser.getByteFrequencyData(dataArray);

  const cw = canvas.width;
  const ch = canvas.height;
  const time = performance.now() * 0.001;

  // --- AUDIO ANALYSIS ---
  const avgAmp = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
  console.log('Audio avgAmp:', avgAmp); // Debug log

  const nBands = 12;
  const bandSize = Math.floor(dataArray.length / nBands);
  const bandAmps = new Array(nBands).fill(0);
  for (let i = 0; i < nBands; i++) {
    let sum = 0;
    for (let j = 0; j < bandSize; j++) sum += dataArray[i * bandSize + j];
    bandAmps[i] = sum / bandSize / 255;
  }

  // --- RIPPLE SYSTEM STATE ---
  if (!renderRain.ripples) {
    renderRain.ripples = [];
    console.log('Initialized ripples array');
  }

  const ripples = renderRain.ripples;

  // Volume threshold to create new ripples - make it more sensitive
  const trigger = 0.05; // Lower threshold

  // Add new ripples - make it more generous for testing
  for (let i = 0; i < nBands; i++) {
    const intensity = bandAmps[i];
    
    // More sensitive triggering for testing
    if (intensity > trigger || Math.random() < 0.1) { // Always some random ripples
      const hue = 200 + Math.random() * 60; // Blue range
      const saturation = 40 + Math.random() * 40;
      
      const cx = cw * Math.random();
      const cy = ch * (0.3 + 0.6 * Math.random()); // More central

      ripples.push({
        x: cx,
        y: cy,
        radius: 5 + Math.random() * 10, // Start with small radius
        maxR: 50 + Math.random() * 150, // Reasonable max size
        hue: hue,
        saturation: saturation,
        life: 1.0,
        brightness: 60 + Math.random() * 40,
        waveCount: 2 + Math.floor(Math.random() * 3), // 2-4 waves
        waveSpacing: 20 + Math.random() * 10,
        creationTime: time
      });
      
      console.log('Created new ripple at:', cx, cy); // Debug log
    }
  }

  // If no audio, create some test ripples
  if (ripples.length === 0 && avgAmp < 0.01) {
    for (let i = 0; i < 3; i++) {
      ripples.push({
        x: cw * (0.2 + 0.6 * Math.random()),
        y: ch * (0.3 + 0.4 * Math.random()),
        radius: 10,
        maxR: 80 + Math.random() * 100,
        hue: 200 + Math.random() * 70,
        saturation: 50,
        life: 1.0,
        brightness: 60,
        waveCount: 3,
        waveSpacing: 12,
        creationTime: time
      });
    }
    console.log('Created test ripples');
  }

  // --- DRAW RIPPLE INTERFERENCE ---
  ctx2d.save();
  ctx2d.globalCompositeOperation = "lighter";

  // Draw water background first
  ctx2d.fillStyle = 'hsla(210, 40%, 15%, 0.8)';
  ctx2d.fillRect(0, 0, cw, ch);

  ripples.forEach((r, index) => {
    const age = time - r.creationTime;
    const phase = r.radius / r.maxR;
    const alpha = Math.max(0, 0.8 * (1 - phase) * r.life);

    // Draw multiple concentric circles
    for (let wave = 0; wave < r.waveCount; wave++) {
      const waveRadius = r.radius - (wave * r.waveSpacing);
      if (waveRadius < 0) continue;
      
      const waveAlpha = alpha * (1 - (wave / r.waveCount));
      const thickness = 1.2 + 2 * (1 - phase) * (1 - (wave / r.waveCount));
      
      const color = `hsla(${r.hue}, ${r.saturation}%, ${r.brightness}%, ${waveAlpha})`;

      ctx2d.beginPath();
      ctx2d.strokeStyle = color;
      ctx2d.lineWidth = thickness;
      ctx2d.arc(r.x, r.y, waveRadius, 0, 2 * Math.PI);
      ctx2d.stroke();
    }

    // Update ripple properties
    r.radius += 2 + avgAmp * 4;
    r.life -= 0.02;

    console.log(`Ripple ${index}: radius=${r.radius.toFixed(1)}, life=${r.life.toFixed(2)}`); // Debug log
  });

  // Remove dead ripples
  const initialLength = ripples.length;
  for (let i = ripples.length - 1; i >= 0; i--) {
    if (ripples[i].life <= 0 || ripples[i].radius > ripples[i].maxR) {
      ripples.splice(i, 1);
    }
  }
  
  if (ripples.length !== initialLength) {
    console.log(`Removed ${initialLength - ripples.length} ripples, ${ripples.length} remaining`);
  }

  ctx2d.restore();

  // Draw some static to show it's working
  ctx2d.fillStyle = 'rgba(100, 150, 255, 0.1)';
  ctx2d.fillText(`Rain Mode - Ripples: ${ripples.length}`, 10, 20);
}

// Force initialization on first call
let rainInitialized = false;
const originalRenderRain = renderRain;
renderRain = function() {
  if (!rainInitialized) {
    console.log('First call to renderRain - initializing');
    rainInitialized = true;
    renderRain.ripples = [];
  }
  return originalRenderRain.apply(this, arguments);
};





function createBandEnergiesGetter(analyser, dataArray) {
  return function() {
    analyser.getByteFrequencyData(dataArray);
    
    // Divide frequency data into 4 bands
    const bandSize = Math.floor(dataArray.length / 4);
    const bands = [];
    
    for (let i = 0; i < 4; i++) {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) {
        sum += dataArray[i * bandSize + j] / 255;
      }
      bands.push(sum / bandSize);
    }
    
    return bands;
  };
}




// ----- Animation loop -----
function animate() {
  if (!isAudioPlaying) return;

  // Use the style's own audio analysis (so no undefined vars)
  animationId = requestAnimationFrame(animate);

  switch (currentStyle) {
    case "florr":
      renderFlorr();
      break;
    case "aurora":
      renderAurora();
      break;
    case "storm":
      renderStorm();
      break;
    case "star":
      renderStarryNight();
      break;
    case "mask":
      renderMask();
      break;
    case "galaxy":
      renderGalaxy();
      break;
    case "quantum":
      renderQuantum();
      break;
    case "aqua":
      renderAqua();
      break;
    case "bars":
      renderBars();
      break;
    case "waveform":
      renderWaveform();
      break;
    case "circle":
      renderCircle();
      break;
    case "manim":
      renderManim();
      break;
    case "bounce":
      renderBounce();
      break;
    case "waves":
      renderWaves();
      break;
    case "metro":
      renderMetro();
      break;
    case "fire":
      renderFire();
      break;
    case "rain":
      renderRain();
      break;
    default:
      renderFlorr();
  }
}

// ----- Event listeners -----
audioInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) {
    // Update file label with the selected file name
    fileLabel.textContent = e.target.files[0].name;
    setupAudioFromFile(e.target.files[0]);
  }
});

startBtn.addEventListener("click", () => {
  if (!audio) return;
  
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  
  audio.play();
  isAudioPlaying = true;
  
  if (!animationId) {
    animate();
  }
});

stopBtn.addEventListener("click", () => {
  if (audio) {
    audio.pause();
    isAudioPlaying = false;
  }
  
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
});


// Style selection buttons
document.querySelectorAll(".styleBtn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const style = e.target.getAttribute("data-style");
    
    // Remove selected class from all buttons
    document.querySelectorAll(".styleBtn").forEach(b => {
      b.classList.remove("selected");
    });
    
    // Add selected class to clicked button
    e.target.classList.add("selected");
    
    // Change current style
    currentStyle = style;
    
    // Initialize Starry Night particles when switching to that style
    if (style === "star") {
      if (bandParticles.length === 0) { // Initialize only once
        initStarryNightParticles();
      }
    }
    
    // Reset particles for other styles that use them
    if (style === "quantum") {
      particles = [];
    }
  });
});


// In your app.js, replace the setupProgressBarDragging function with this:
// In your app.js, replace the setupProgressBarDragging function with this:
function setupProgressBarDragging() {
  const progressContainer = document.querySelector(".progress-container");
  const progressBar = document.getElementById("progressBar");
  const progressHandle = document.getElementById("progressHandle");
  
  if (!progressContainer || !progressBar || !progressHandle) return;
  
  let isDragging = false;
  
  // Function to update audio position based on click/drag position
  function setAudioPosition(clientX) {
    if (!audio || isNaN(audio.duration)) return;
    
    const rect = progressContainer.getBoundingClientRect();
    const clickPosition = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = clickPosition * audio.duration;
    
    audio.currentTime = newTime;
    updateProgress();
  }
  
  // Mouse events for desktop
  progressContainer.addEventListener("mousedown", (e) => {
    isDragging = true;
    setAudioPosition(e.clientX);
  });
  
  progressHandle.addEventListener("mousedown", (e) => {
    isDragging = true;
    e.stopPropagation(); // Prevent triggering the container event
  });
  
  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      setAudioPosition(e.clientX);
    }
  });
  
  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
  
  // Touch events for mobile
  progressContainer.addEventListener("touchstart", (e) => {
    isDragging = true;
    setAudioPosition(e.touches[0].clientX);
  });
  
  progressHandle.addEventListener("touchstart", (e) => {
    isDragging = true;
    e.stopPropagation();
  });
  
  document.addEventListener("touchmove", (e) => {
    if (isDragging) {
      setAudioPosition(e.touches[0].clientX);
    }
  });
  
  document.addEventListener("touchend", () => {
    isDragging = false;
  });
  
  // Prevent dragging from selecting text
  document.addEventListener("selectstart", (e) => {
    if (isDragging) {
      e.preventDefault();
    }
  });
}
setupProgressBarDragging();
// Then, call the function once at the end of your DOMContentLoaded event listener
// Remove the recursive call inside setupProgressBarDragging()

// Also update the updateProgress function to handle the progress handle:
function updateProgress() {
  if (!audio || isNaN(audio.duration)) return;
  
  const percent = (audio.currentTime / audio.duration) * 100;
  progressBar.style.width = percent + '%';
  
  // Update the handle position
  const progressHandle = document.getElementById("progressHandle");
  if (progressHandle) {
    progressHandle.style.left = percent + '%';
  }
  
  timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
}

// Set default style button as selected on page load
document.addEventListener("DOMContentLoaded", () => {
  const defaultStyleBtn = document.querySelector('.styleBtn[data-style="florr"]');
  if (defaultStyleBtn) {
    defaultStyleBtn.classList.add("selected");
  }
  
  // Initialize canvas size
  dprSizeCanvas();
  clearCanvas();
});

// Download functionality
downloadBtn.addEventListener("click", () => {
  if (!canvas) return;
  
  try {
    const dataURL = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `visualization-${new Date().toISOString().slice(0, 19)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error("Error downloading image:", e);
  }
});

// AI Assistant (placeholder)
document.getElementById("aiSubmit").addEventListener("click", () => {
  const input = document.getElementById("aiInput").value;
  const response = document.getElementById("aiResponse");
  
  if (input.trim() === "") {
    response.textContent = "Please enter a description of how you want the visuals to change.";
    return;
  }
  
  response.textContent = "AI adjustment feature coming soon!";
});

// Handle window resize
window.addEventListener("resize", () => {
  dprSizeCanvas();
});

  const defaultStyleBtn = document.querySelector('.styleBtn[data-style="florr"]');
  if (defaultStyleBtn) {
    defaultStyleBtn.classList.add("selected");
  }
  
  // Initialize canvas size
  dprSizeCanvas();
  clearCanvas();
});




