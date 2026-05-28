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
const conversationLog = document.getElementById("conversationLog");
const conversationToggle = document.getElementById("conversationToggle");

let width = 0;
let height = 0;
let particles = [];
let mouse = { x: 0, y: 0 };
let recognition = null;
let listening = false;
let continuousMode = false;
let assistantSpeaking = false;

const replies = {
  day: {
    status: "Daily Brief Ready",
    next: "Pick your top 3 outcomes",
    text: "Your day is clean. Start with three priorities, log food early, and protect one focused work block."
  },
  tasks: {
    status: "Tasks Loaded",
    next: "Clear the top task first",
    text: "Start with the task that creates the most leverage. Push follow-ups after your first focus block."
  },
  health: {
    status: "Health Snapshot",
    next: "Protein before snacks",
    text: "Health is on track. Hit protein, water, and movement before you add snacks later."
  },
  focus: {
    status: "Focus Mode Active",
    next: "Work for 45 minutes",
    text: "Focus mode is active. One objective, forty five minutes, no drifting."
  },
  food: {
    status: "Food Log Ready",
    next: "Enter meal details",
    text: "Food logging is ready. Tell me the item, serving size, and quantity."
  },
  projects: {
    status: "Projects Ready",
    next: "Choose one lane",
    text: "Your project lanes are websites, ads, fitness, and admin. Pick one and I will keep you moving."
  },
  greeting: {
    status: "Listening",
    next: "Ask your next question",
    text: "I am here. Ask me about your day, tasks, health, food, focus, or projects."
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

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `chat-row ${role === "user" ? "user" : "jarvis"}`;
  row.innerHTML = `<span>${role === "user" ? "You" : "Jarvis"}</span><p></p>`;
  row.querySelector("p").textContent = text;
  conversationLog.appendChild(row);
  conversationLog.scrollTop = conversationLog.scrollHeight;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  assistantSpeaking = true;
  const message = new SpeechSynthesisUtterance(text);
  message.rate = 0.96;
  message.pitch = 0.86;
  message.volume = 0.92;
  message.onend = () => {
    assistantSpeaking = false;
    if (continuousMode && recognition && !listening) {
      setTimeout(() => startListening(), 450);
    }
  };
  window.speechSynthesis.speak(message);
}

function getIntent(value) {
  const text = value.toLowerCase();
  if (text.includes("hello") || text.includes("jarvis") || text.includes("hey")) return "greeting";
  if (text.includes("day") || text.includes("brief") || text.includes("schedule")) return "day";
  if (text.includes("task") || text.includes("todo") || text.includes("to do")) return "tasks";
  if (text.includes("health") || text.includes("fitness") || text.includes("protein") || text.includes("calorie")) return "health";
  if (text.includes("focus") || text.includes("work block")) return "focus";
  if (text.includes("food") || text.includes("meal") || text.includes("log")) return "food";
  if (text.includes("project") || text.includes("website") || text.includes("ads")) return "projects";
  return null;
}

function respondTo(text) {
  addMessage("user", text);
  const intent = getIntent(text);
  const reply = intent ? replies[intent] : {
    status: "Request Received",
    next: "Ask another question",
    text: "I heard you. Right now I can talk about your day, tasks, health, food, focus, and projects."
  };

  statusText.textContent = reply.status;
  nextAction.textContent = reply.next;
  agentReply.textContent = reply.text;
  voiceStatus.textContent = "Jarvis replied";
  voiceTranscript.textContent = reply.text;
  addMessage("jarvis", reply.text);
  speak(reply.text);

  setTimeout(() => {
    if (!document.body.classList.contains("listening")) statusText.textContent = "Assistant Online";
  }, 5000);
}

function setupVoice() {
  const Voice = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Voice) {
    voiceStatus.textContent = "Type to talk";
    voiceTranscript.textContent = "Voice recognition is not supported in this browser. Use the text bar.";
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
    if (finalText) respondTo(finalText);
  };

  recognition.onerror = () => {
    voiceStatus.textContent = "Mic unavailable";
    voiceTranscript.textContent = "Microphone access failed. Type your message instead.";
    document.body.classList.remove("listening");
    statusText.textContent = "Assistant Online";
    listening = false;
  };

  recognition.onend = () => {
    document.body.classList.remove("listening");
    listening = false;
    if (!assistantSpeaking && continuousMode) setTimeout(() => startListening(), 600);
    if (statusText.textContent === "Listening") statusText.textContent = "Assistant Online";
  };
}

function startListening() {
  if (!recognition || listening || assistantSpeaking) return;
  try {
    recognition.start();
  } catch (error) {
    listening = false;
  }
}

micButton.addEventListener("click", () => {
  if (!recognition) {
    voiceStatus.textContent = "Type to talk";
    voiceTranscript.textContent = "Voice is unavailable here. Use the text bar.";
    return;
  }
  listening ? recognition.stop() : startListening();
});

conversationToggle.addEventListener("click", () => {
  continuousMode = !continuousMode;
  conversationToggle.classList.toggle("active", continuousMode);
  conversationToggle.textContent = `Continuous Conversation: ${continuousMode ? "On" : "Off"}`;
  if (continuousMode) {
    addMessage("jarvis", "Continuous conversation is on. I will listen again after I answer.");
    speak("Continuous conversation is on. I will listen again after I answer.");
  }
});

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = commandInput.value.trim();
  if (!value) return;
  respondTo(value);
  commandInput.value = "";
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => respondTo(button.dataset.command));
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

setTimeout(() => speak("Daily assistant online."), 900);
