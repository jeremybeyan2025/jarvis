const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d");
const commandForm = document.getElementById("commandForm");
const commandInput = document.getElementById("commandInput");
const terminalWindow = document.getElementById("terminalWindow");
const clock = document.getElementById("clock");

let width = 0;
let height = 0;
let particles = [];
let mouse = { x: 0, y: 0 };

const commands = {
  "scan modules": [
    "Scanning mission modules...",
    "Performance Core: online.",
    "Business Ops: online.",
    "Legal War Room: online.",
    "AI Command: online.",
    "All systems are operational."
  ],
  "run diagnostics": [
    "Running full diagnostics...",
    "HUD layers: stable.",
    "Signal integrity: 99.8%.",
    "Security layer: encrypted.",
    "No critical failures detected."
  ],
  "show mission status": [
    "Mission status requested.",
    "Primary interface: active.",
    "Workflow queue: 18 pending tasks.",
    "Recommended next action: select an operating module."
  ],
  "launch interface": [
    "Interface launch sequence accepted.",
    "Powering neural core...",
    "Synchronizing command panels...",
    "Command center is live."
  ]
};

function resizeCanvas() {
  width = canvas.width = window.innerWidth * window.devicePixelRatio;
  height = canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  createParticles();
}

function createParticles() {
  const count = Math.min(130, Math.floor(window.innerWidth / 10));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.34 * window.devicePixelRatio,
    vy: (Math.random() - 0.5) * 0.34 * window.devicePixelRatio,
    radius: (Math.random() * 1.7 + 0.4) * window.devicePixelRatio,
    alpha: Math.random() * 0.6 + 0.18
  }));
}

function drawParticles() {
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > width) p.vx *= -1;
    if (p.y < 0 || p.y > height) p.vy *= -1;

    const dx = p.x - mouse.x * window.devicePixelRatio;
    const dy = p.y - mouse.y * window.devicePixelRatio;
    const distanceToMouse = Math.sqrt(dx * dx + dy * dy);

    if (distanceToMouse < 150 * window.devicePixelRatio) {
      p.x += dx * 0.002;
      p.y += dy * 0.002;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(99, 232, 255, ${p.alpha})`;
    ctx.fill();

    for (let j = i + 1; j < particles.length; j++) {
      const q = particles[j];
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      const maxDist = 115 * window.devicePixelRatio;

      if (dist < maxDist) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = `rgba(99, 232, 255, ${(1 - dist / maxDist) * 0.16})`;
        ctx.lineWidth = 1 * window.devicePixelRatio;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(drawParticles);
}

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function appendTerminalLine(source, text) {
  const line = document.createElement("p");
  const label = document.createElement("span");
  label.textContent = `${source} `;
  line.appendChild(label);
  line.append(text);
  terminalWindow.appendChild(line);
  terminalWindow.scrollTop = terminalWindow.scrollHeight;
}

function runCommand(command) {
  const normalized = command.trim().toLowerCase();
  appendTerminalLine("user", command);

  const response = commands[normalized] || [
    "Command received.",
    "Routing request through interface layer...",
    "This demo shell is ready to connect to real app logic, APIs, dashboards, or AI actions."
  ];

  response.forEach((line, index) => {
    window.setTimeout(() => appendTerminalLine("system", line), 280 * (index + 1));
  });
}

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = commandInput.value.trim();
  if (!value) return;
  runCommand(value);
  commandInput.value = "";
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

resizeCanvas();
drawParticles();
updateClock();
setInterval(updateClock, 1000);

window.setTimeout(() => appendTerminalLine("system", "Neural core synchronized."), 900);
window.setTimeout(() => appendTerminalLine("system", "Try: scan modules or run diagnostics."), 1500);
