// SafeBite Client Logic

const SAMPLES = {
  safe: "Certified gluten-free rolled oats, pure maple syrup, virgin coconut oil, chia seeds, pure vanilla extract, sea salt.",
  danger: "Dehydrated potatoes, vegetable oil, soy sauce powder (wheat, soybeans, salt), hydrolyzed whey protein, natural flavor, onion powder, disodium inosinate.",
  caution: "Crisp puffed rice, sugar, cocoa butter, sunflower lecithin, salt. Note: Manufactured on shared equipment that also processes peanuts, tree nuts, and milk."
};

function getProfile() {
  const roommateName = document.getElementById('roommateName').value.trim() || 'Alex';
  const custom = document.getElementById('customAllergies').value.trim();
  const checked = Array.from(document.querySelectorAll('#allergyTagContainer input[type="checkbox"]:checked')).map(cb => cb.value);
  if (custom) checked.push(custom);
  const allergies = checked.join(', ') || 'None specified';
  const severity = document.getElementById('severitySelect').value;
  return { roommateName, allergies, severity };
}

function loadSample(type) {
  if (SAMPLES[type]) {
    document.getElementById('ingredientsInput').value = SAMPLES[type];
  }
}

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

// Check Ollama and Gemma connection status
async function checkStatus() {
  const chip = document.getElementById('statusIndicator');
  const text = document.getElementById('statusText');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.online) {
      chip.className = 'status-chip online';
      text.textContent = `Online: ${data.activeModel || 'gemma2:2b'}`;
    } else {
      chip.className = 'status-chip offline';
      text.textContent = 'Ollama offline';
    }
  } catch (e) {
    chip.className = 'status-chip offline';
    text.textContent = 'Server connecting...';
  }
}

// Format markdown text simply for output
function formatMarkdown(text) {
  let formatted = text
    .replace(/^### (.*$)/gim, '<h3 style="margin-top:14px; margin-bottom:6px; color:#93c5fd;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="margin-top:16px; margin-bottom:8px; color:#60a5fa;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="margin-top:20px; margin-bottom:10px; color:#3b82f6;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[SAFE\]/gi, '<span style="background:#10b981; color:#fff; font-weight:800; padding:2px 8px; border-radius:4px;">🟢 SAFE</span>')
    .replace(/\[CAUTION\]/gi, '<span style="background:#f59e0b; color:#fff; font-weight:800; padding:2px 8px; border-radius:4px;">🟡 CAUTION</span>')
    .replace(/\[(UNSAFE|DANGER|UNSAFE \/ DANGER)\]/gi, '<span style="background:#ef4444; color:#fff; font-weight:800; padding:2px 8px; border-radius:4px;">🔴 DANGER - DO NOT EAT</span>');

  return formatted;
}

// Scan Ingredients
document.getElementById('scanBtn').addEventListener('click', async () => {
  const ingredients = document.getElementById('ingredientsInput').value.trim();
  if (!ingredients) {
    alert('Please enter or paste an ingredient list to scan.');
    return;
  }

  const profile = getProfile();
  const btn = document.getElementById('scanBtn');
  const resultContainer = document.getElementById('scannerResult');
  const outputEl = document.getElementById('scannerOutput');
  const telemetry = document.getElementById('scannerTelemetry');

  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Analyzing with Gemma 2...';
  resultContainer.classList.remove('hidden');
  outputEl.innerHTML = '<em style="color:#94a3b8;">Scanning ingredients against ' + profile.roommateName + '\'s allergens on local Gemma 2...</em>';

  try {
    const res = await fetch('/api/scan-ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...profile,
        ingredients
      })
    });

    const data = await res.json();
    if (data.error) {
      outputEl.innerHTML = `<span style="color:#ef4444;">Error: ${data.error}</span>`;
    } else {
      outputEl.innerHTML = formatMarkdown(data.response);
      telemetry.textContent = `Inference: ${data.durationMs}ms (${data.evalCount} tokens, ~${Math.round((data.evalCount / (data.evalDuration || 1000)) * 1000)} t/s)`;
    }
  } catch (err) {
    outputEl.innerHTML = `<span style="color:#ef4444;">Request failed: ${err.message}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">⚡</span> Inspect with Local Gemma 2';
  }
});

// Generate Safe Recipe
document.getElementById('recipeBtn').addEventListener('click', async () => {
  const pantryItems = document.getElementById('pantryInput').value.trim();
  const cuisinePreference = document.getElementById('cuisineInput').value.trim();
  if (!pantryItems) {
    alert('Please enter ingredients available in your pantry or fridge.');
    return;
  }

  const profile = getProfile();
  const btn = document.getElementById('recipeBtn');
  const resultContainer = document.getElementById('recipeResult');
  const outputEl = document.getElementById('recipeOutput');
  const telemetry = document.getElementById('recipeTelemetry');

  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Crafting recipe with Gemma 2...';
  resultContainer.classList.remove('hidden');
  outputEl.innerHTML = '<em style="color:#94a3b8;">Designing an allergen-safe gourmet meal on local Gemma 2...</em>';

  try {
    const res = await fetch('/api/generate-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...profile,
        pantryItems,
        cuisinePreference
      })
    });

    const data = await res.json();
    if (data.error) {
      outputEl.innerHTML = `<span style="color:#ef4444;">Error: ${data.error}</span>`;
    } else {
      outputEl.innerHTML = formatMarkdown(data.response);
      telemetry.textContent = `Inference: ${data.durationMs}ms (${data.evalCount} tokens)`;
    }
  } catch (err) {
    outputEl.innerHTML = `<span style="color:#ef4444;">Request failed: ${err.message}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✨</span> Generate Safe Recipe with Gemma 2';
  }
});

function copyResult(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => {
    alert('Copied to clipboard!');
  }).catch(() => {
    alert('Failed to copy');
  });
}

// Initial status check
checkStatus();
setInterval(checkStatus, 15000);
