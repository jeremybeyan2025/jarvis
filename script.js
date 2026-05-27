const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d");
const micButton = document.getElementById("micButton");
const voiceStatus = document.getElementById("voiceStatus");
const voiceTranscript = document.getElementById("voiceTranscript");
const commandForm = document.getElementById("commandForm");
const commandInput = document.getElementById("commandInput");
const agentReply = document.getElementById("agentReply");
const nextAction = document.getElementById("nextAction");
const statusText = document.getElementById("statusText");
const clock = document.getElementById("clock");
const dateLine = document.getElementById("dateLine");
const todayLabel = document.getElementById("todayLabel");

let width = 0;
let height = 0;
let particles = [];
let mouse = { x: 0, y: 0 };
let recognition = null;
let listening = false;

const responses = {
  day: {
    status: "Daily Brief Ready",
    next: "Pick your top 3 outcomes",
    reply: "Review your schedule, choose three priorities, log food early, and protect one focused work block.",
    voice: "Your daily brief is ready. Choose three priorities and protect one focused work block."
  },
  tasks: {
    status: "Tasks Loaded",
    next: "Clear the top task first",
    reply: "Start with the task that creates the most leverage. Handle follow-ups after the first focus block.",
    voice: "Tasks loaded. Start with the highest leverage task first."
  },
  health: {
    status: "Health Snapshot",
    next: "Hit protein before snacks",
    reply: "Health module is on track. Prioritize protein, water, and movement before late snacks.",
    voice: "Health is on track. Prioritize protein, water, and movement."
  },
  focus: {
    status: "Focus Mode Active",
    next: "Work for 45 minutes",
    reply: "Focus mode started. Work one objective for 45 minutes, then check back in.",
    voice: "Focus mode started. Work one objective for forty five minutes."
  },
  food: {
    status: "Food Log Ready",
    next: "Enter meal details",
    reply: "Food logging is ready. Add the item, serving size, and quantity.",
    voice: "Food logging is ready. Add item, serving size, and quantity."
  },
  projects: {
    status: "Projects Ready",
    next: "Choose one project lane",
    reply: "Project view ready. Current lanes: websites, ads, fitness, and admin. Pick one and move it forward.",
    voice: "Projects are ready. Choose one lane and move it forward."
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
  const count = Math.min(120, Math.floor(window.innerWidth / 10));
  particles = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    z: Math.random() * 0.7 + 0.35,
    vx: (Math.random() - 0.5) * 0.28 * window.devicePixelRatio,
    vy: (Math.random() - 0.5) * 0.28 * window.devicePixelRatio,
    radius: (Math.random() * 1.4 + 0.35) * window.devicePixelRatio,
    alpha: Math.random() * 0.38 + 0.12,
    offset: index * 0.18
  }));
}

function drawParticles(time = 0) {
  ctx.clearRect(0, 0, width, height);

  particles.forEach((p, i) => {
    p.x += p.vx * p.z + Math.sin(time * 0.0007 + p.offset) * 0.09;
    p.y += p.vy * p.z;

    if (p.x < 0 || p.x > width) p.vx *= -1;
    if (p.y < 0 || p.y > height) p.vy *= -1;

    const mx = mouse.x * window.devicePixelRatio;
    const my = mouse.y * window.devicePixelRatio;
    const distanceToMouse = Math.hypot(p.x - mx, p.y - my);

    if (distanceToMouse < 150 * window.devicePixelRatio) {
      p.x += (p.x - mx) * 0.0018;
      p.y += (p.y - my) * 0.0018;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * p.z, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(121, 231, 255, ${p.alpha})`;
    ctx.fill();

    for (let j = i + 1; j < particles.length; j++) {
      const q = particles[j];
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      const maxDist = 108 * window.devicePixelRatio;
      if (dist < maxDist) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = `rgba(121, 231, 255, ${(1 - dist / maxDist) * 0.1})`;
        ctx.lineWidth = 1 * window.devicePixelRatio;
        ctx.stroke();
      }
    }
  });

  requestAnimationFrame(drawParticles);
}

function updateTime() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  dateLine.textContent = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  todayLabel.textContent = now.toLocaleDateString([], { weekday: "long" }).toUpperCase();
}

function say(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 0.96;
  msg.pitch = 0.88;
  msg.volume = 0.9;
  window.speechSynthesis.speak(msg);
}

function getIntent(value) {
  const text = value.toLowerCase();
  if (text.includes("day") || text.includes("brief") || text.includes("schedule")) return "day";
  if (text.includes("task") || text.includes("todo") || text.includes("to do")) return "tasks";
  if (text.includes("health") || text.includes("fitness") || text.includes("protein") || text.includes("calorie")) return "health";
  if (text.includes("focus") || text.includes("work block")) return "focus";
  if (text.includes("food") || text.includes("meal")) return "food";
  if (text.includes("project") || text.includes("website") || text.includes("ads")) return "projects";
  return null;
}

function runCommand(value) {
  const intent = getIntent(value);

  if (!intent) {
    statusText.textContent = "Request Received";
    nextAction.textContent = "Clarify request";
    agentReply.textContent = `I heard: “${value}”. Try asking for your day, tasks, health, food, focus mode, or projects.`;
    voiceStatus.textContent = "Request received";
    voiceTranscript.textContent = value;
    say("Request received. Try asking for your day, tasks, health, food, focus mode, or projects.");
    return;
  }

  const response = responses[intent];
  statusText.textContent = response.status;
  nextAction.textContent = response.next;
  agentReply.textContent = response.reply;
  voiceStatus.textContent = "Request handled";
  voiceTranscript.textContent = response.voice;
  say(response.voice);

  window.setTimeout(() => {
    if (!document.body.classList.contains("listening")) statusText.textContent = "Assistant Online";
  }, 4500);
}

function setupVoice() {
  const Voice = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Voice) {
    voiceStatus.textContent = "Type your request";
    voiceTranscript.textContent = "Voice is not supported in this browser. Use the text bar instead.";
    return;
  }

  recognition = new Voice();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    listening = true;
    document.body.classList.add("listening");
    voiceStatus.textContent = "Listening...";
    statusText.textContent = "Listening";
  };

  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const phrase = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += phrase;
      else interim += phrase;
    }
    voiceTranscript.textContent = finalText || interim || "Listening...";
    if (finalText) runCommand(finalText);
  };

  recognition.onerror = () => {
    voiceStatus.textContent = "Mic unavailable";
    voiceTranscript.textContent = "Microphone access failed. Type your request instead.";
    document.body.classList.remove("listening");
    statusText.textContent = "Assistant Online";
    listening = false;
  };

  recognition.onend = () => {
    document.body.classList.remove("listening");
    listening = false;
    if (statusText.textContent === "Listening") statusText.textContent = "Assistant Online";
  };
}

micButton.addEventListener("click", () => {
  if (!recognition) {
    voiceStatus.textContent = "Type your request";
    voiceTranscript.textContent = "Voice is unavailable here. Use the text bar.";
    return;
  }
  listening ? recognition.stop() : recognition.start();
});

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = commandInput.value.trim();
  if (!value) return;
  runCommand(value);
  commandInput.value = "";
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => runCommand(button.dataset.command));
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

resizeCanvas();
drawParticles();
updateTime();
setInterval(updateTime, 1000);
setupVoice();

window.setTimeout(() => say("Daily assistant online."), 900);
