// ── Configuration ───────────────────────────────────────────────
// Update this URL if your backend is deployed online (e.g. Render)
const API_BASE = "http://127.0.0.1:5000";

// ── DOM References ───────────────────────────────────────────────
const form           = document.getElementById("predict-form");
const predictBtn     = document.getElementById("predict-btn");
const clearBtn       = document.getElementById("clear-btn");
const resultCard     = document.getElementById("result-card");
const resultIcon     = document.getElementById("result-icon");
const resultLevel    = document.getElementById("result-level");
const gaugeFill      = document.getElementById("gauge-fill");
const gaugePct       = document.getElementById("gauge-pct");
const resultAdvice   = document.getElementById("result-advice");
const accuracyText   = document.getElementById("accuracy-text");
const loadingOverlay = document.getElementById("loading-overlay");

// ── Default Values ───────────────────────────────────────────────
const DEFAULTS = {
  age: 52, sex: "1", cp: "0", trestbps: 125, chol: 212,
  fbs: "0", restecg: "0", thalach: 168, exang: "0",
  oldpeak: 1.0, slope: "2", ca: 0, thal: "3"
};

// ── Toast Notification Helper ────────────────────────────────────
function showToast(message, isError = false) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${isError ? "error" : ""} show`;
  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

// ── Load Model Info on Page Load ─────────────────────────────────
async function loadModelInfo() {
  try {
    const res = await fetch(`${API_BASE}/api/model-info`);
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    accuracyText.textContent = `Model Ready (${data.accuracy}% Accuracy · ${data.model_type})`;
  } catch (err) {
    accuracyText.textContent = "Backend offline — Run backend/app.py on port 5000";
    const banner = document.getElementById("accuracy-banner");
    if (banner) {
      banner.style.color = "#c62828";
      const dot = banner.querySelector(".dot");
      if (dot) dot.style.background = "#e53935";
    }
  }
}

// ── Icons by risk color ──────────────────────────────────────────
const ICONS = {
  red: "🚨",
  orange: "⚠️",
  yellow: "⚡",
  green: "✅"
};

// ── Form Submission ──────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {};
  const elements = form.querySelectorAll("input, select");
  elements.forEach(el => {
    if (el.name) {
      payload[el.name] = parseFloat(el.value);
    }
  });

  // UI loading state
  predictBtn.disabled = true;
  loadingOverlay.classList.add("active");
  resultCard.style.display = "none";

  try {
    const res = await fetch(`${API_BASE}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to get prediction");
    }

    // Display result
    resultCard.className = `result-card ${data.color}`;
    resultIcon.textContent = ICONS[data.color] || "🩺";
    resultLevel.textContent = data.result;
    gaugePct.textContent = `${data.probability}% Risk`;
    gaugeFill.style.width = `${Math.min(100, Math.max(0, data.probability))}%`;
    resultAdvice.textContent = data.advice;
    resultCard.style.display = "block";

    // Scroll to view
    resultCard.scrollIntoView({ behavior: "smooth", block: "center" });

  } catch (err) {
    showToast(`Error: ${err.message}`, true);
  } finally {
    predictBtn.disabled = false;
    loadingOverlay.classList.remove("active");
  }
});

// ── Clear / Reset Form ───────────────────────────────────────────
clearBtn.addEventListener("click", () => {
  Object.entries(DEFAULTS).forEach(([name, val]) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el) el.value = val;
  });
  resultCard.style.display = "none";
  gaugeFill.style.width = "0%";
  showToast("Form reset to default values");
});

// Initialize
loadModelInfo();
