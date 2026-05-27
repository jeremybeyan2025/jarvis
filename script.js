const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d");
const micButton = document.getElementById("micButton");
const voiceStatus = document.getElementById("voiceStatus");
const voiceTranscript = document.getElementById("voiceTranscript");
const commandForm = document.getElementById("commandForm");
const commandInput = document.getElementById("commandInput");
const commandFeed = document.getElementById("commandFeed");
const systemState = document.getElementById("systemState");
const railClock = document.getElementById("railClock");

let width = 0;
let height = 0;
let particles = [];
let mouse = { x: 0, y: 0 };
let recognition = null;
let listening = false;

const commandResponses = {
  "run threat scan": {
    state: "SCANNING",
    feed: "Threat scan complete. No hostile activity detected in the interface layer.",
    transcript: "Threat scan complete. The field is clean.",
    alert: true
  },
  "open mission brief": {
    state: "BRIEFING",
    feed: "Mission brief loaded. Primary objective: build a more immersive, original AI control experience.",
    transcript: "Mission brief loaded. Objective confirmed.",
    alert: false
  },
  "power core": {
    state: "CORE 100%",
    feed: "Core output increased. Holographic interface is running at maximum visual intensity.",
    transcript: "Core powered. Visual intensity increased.",
    alert: false
  },
  "activate field mode": {
    state: "FIELD MODE",
    feed: "Field mode activated. Console is now optimized for fast mobile command interaction.",
    transcript: "Field mode activated.",
    alert: false
  },
  "system status": {
    state: "ONLINE",
    feed: "System online. Voice command layer, particle field, and mission deck are operational.",
    transcript: "All systems are online.",
    alert: false
  }
};

function resizeCanvas() {
  width = canvas.width = window.innerWidth * window.devicePixelRatio;
  height = canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  createParticles();
}

function createParticles() {
  const count = Math.min(180, Math.floor(window.innerWidth / 7));
  particles = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    z: Math.random() * 1 + 0.25,
    vx: (Math.random() - 0.5) * 0.42 * window.devicePixelRatio,
    vy: (Math.random() - 0.5) * 0.42 * window.devicePixelRatio,
    radius: (Math.random() * 1.8 + 0.5) * window.devicePixelRatio,
    alpha: Math.random() * 0.65 + 0.18,
    offset: index * 0.12
  }));
}

function drawParticles(time = 0) {
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const wave = Math.sin(time * 0.001 + p.offset) * 0.16;
    p.x += p.vx * p.z + wave;
    p.y += p.vy * p.z;

    if (p.x < 0 || p.x > width) p.vx *= -1;
    if (p.y < 0 || p.y > height) p.vy *= -1;

    const mx = mouse.x * window.devicePixelRatio;
    const my = mouse.y * window.devicePixelRatio;
    const dx = p.x - mx;
    const dy = p.y - my;
    const distanceToMouse = Math.sqrt(dx * dx + dy * dy);

    if (distanceToMouse < 180 * window.devicePixelRatio) {
      p.x += dx * 0.0025;
      p.y += dy * 0.0025;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * p.z, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(88, 239, 255, ${p.alpha})`;
    ctx.fill();

    for (let j = i + 1; j < particles.length; j++) {
      const q = particles[j];
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      const maxDist = 126 * window.devicePixelRatio;

      if (dist < maxDist) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = `rgba(88, 239, 255, ${(1 - dist / maxDist) * 0.18})`;
        ctx.lineWidth = 1 * window.devicePixelRatio;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(drawParticles);
}

function updateClock() {
  const now = new Date();
  railClock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 0.82;
  utterance.volume = 0.9;
  window.speechSynthesis.speak(utterance);
}

function normalizeCommand(value) {
  return value.trim().toLowerCase().replace(/[.,!?]/g, "");
}

function findCommand(value) {
  const normalized = normalizeCommand(value);
  if (commandResponses[normalized]) return normalized;

  if (normalized.includes("threat") || normalized.includes("scan")) return "run threat scan";
  if (normalized.includes("mission") || normalized.includes("brief")) return "open mission brief";
  if (normalized.includes("power") || normalized.includes("core")) return "power core";
  if (normalized.includes("field")) return "activate field mode";
  if (normalized.includes("status") || normalized.includes("online")) return "system status";

  return null;
}

function executeCommand(rawCommand) {
  const matchedCommand = findCommand(rawCommand);

  if (!matchedCommand) {
    systemState.textContent = "ROUTING";
    commandFeed.textContent = `Command received: “${rawCommand}”. Custom routing is ready for backend integration.`;
    voiceStatus.textContent = "Command routed";
    voiceTranscript.textContent = rawCommand;
    speak("Command received. Routing through the interface layer.");
    document.body.classList.remove("alert-mode");
    return;
  }

  const response = commandResponses[matchedCommand];
  systemState.textContent = response.state;
  commandFeed.textContent = response.feed;
  voiceStatus.textContent = "Command accepted";
  voiceTranscript.textContent = response.transcript;
  document.body.classList.toggle("alert-mode", response.alert);
  speak(response.transcript);

  window.setTimeout(() => {
    if (!document.body.classList.contains("listening")) {
      systemState.textContent = "ARMED";
      document.body.classList.remove("alert-mode");
    }
  }, 4200);
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceStatus.textContent = "Voice not supported";
    voiceTranscript.textContent = "Your browser does not support live voice recognition. Type a command below instead.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    listening = true;
    document.body.classList.add("listening");
    voiceStatus.textContent = "Listening...";
    systemState.textContent = "LISTENING";
  };

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += transcript;
      else interim += transcript;
    }

    voiceTranscript.textContent = final || interim || "Listening for command...";

    if (final) executeCommand(final);
  };

  recognition.onerror = () => {
    voiceStatus.textContent = "Mic unavailable";
    voiceTranscript.textContent = "Microphone access failed. Type the command instead.";
    document.body.classList.remove("listening");
    systemState.textContent = "ARMED";
    listening = false;
  };

  recognition.onend = () => {
    document.body.classList.remove("listening");
    listening = false;
    if (systemState.textContent === "LISTENING") systemState.textContent = "ARMED";
  };
}

micButton.addEventListener("click", () => {
  if (!recognition) {
    voiceStatus.textContent = "Type command";
    voiceTranscript.textContent = "Voice recognition is not available here. Use the command input below.";
    return;
  }

  if (listening) {
    recognition.stop();
    return;
  }

  recognition.start();
});

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = commandInput.value.trim();
  if (!value) return;
  executeCommand(value);
  commandInput.value = "";
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => executeCommand(button.dataset.command));
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
initSpeechRecognition();

window.setTimeout(() => speak("Command interface online."), 900);
