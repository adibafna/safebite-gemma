// SafeBite — App Logic

const SAMPLES = {
  safe: "Certified gluten-free rolled oats, pure maple syrup, virgin coconut oil, chia seeds, pure vanilla extract, sea salt.",
  danger: "Dehydrated potatoes, vegetable oil, soy sauce powder (wheat, soybeans, salt), hydrolyzed whey protein, natural flavor, onion powder, disodium inosinate.",
  caution: "Crisp puffed rice, sugar, cocoa butter, sunflower lecithin, salt. Manufactured on shared equipment that also processes peanuts, tree nuts, and milk."
};

// ── Profile helpers ────────────────────────────────────────
function getProfile() {
  const name = document.getElementById('roommateName').value.trim() || 'Alex';
  const custom = document.getElementById('customAllergies').value.trim();
  const checked = [...document.querySelectorAll('.allergen-chip.selected input[type="checkbox"]')].map(cb => cb.value);
  if (custom) checked.push(custom);
  const allergies = checked.join(', ') || 'None specified';
  const selected = document.querySelector('.severity-option.selected input[type="radio"]');
  const severity = selected ? selected.value : 'Severe / Anaphylactic Risk (Zero Tolerance)';
  return { roommateName: name, allergies, severity };
}

// ── Allergen chip toggling ─────────────────────────────────
document.querySelectorAll('.allergen-chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.preventDefault(); // prevent the hidden checkbox from double-firing
    chip.classList.toggle('selected');
  });
});

// ── Severity option toggling ───────────────────────────────
document.querySelectorAll('.severity-option').forEach(option => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.severity-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    option.querySelector('input[type="radio"]').checked = true;
  });
});

// ── Tab switching ──────────────────────────────────────────
document.querySelectorAll('.tab-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-pill').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.workspace').forEach(w => w.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
  });
});

// ── Char counter ───────────────────────────────────────────
const ingInput = document.getElementById('ingredientsInput');
const charCount = document.getElementById('scanCharCount');
ingInput.addEventListener('input', () => {
  const n = ingInput.value.length;
  charCount.textContent = n ? `${n} chars` : '0 chars';
});

// ── Sample loading ─────────────────────────────────────────
function loadSample(type) {
  ingInput.value = SAMPLES[type] || '';
  ingInput.dispatchEvent(new Event('input'));
}

// ── Status check ───────────────────────────────────────────
async function checkStatus() {
  const dot = document.getElementById('statusDot');
  const label = document.getElementById('statusLabel');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.online) {
      dot.className = 'status-dot online';
      label.textContent = data.activeModel || 'gemma2:2b';
    } else {
      dot.className = 'status-dot offline';
      label.textContent = 'Offline';
    }
  } catch {
    dot.className = 'status-dot offline';
    label.textContent = 'Connecting…';
  }
}
checkStatus();
setInterval(checkStatus, 15000);

// ── Format verdict badge ───────────────────────────────────
function setVerdict(badgeEl, text) {
  const t = text.toUpperCase();
  badgeEl.className = 'verdict-badge';
  if (t.includes('SAFE') && !t.includes('UNSAFE')) {
    badgeEl.className += ' safe';
    badgeEl.textContent = '✓ Safe to eat';
  } else if (t.includes('UNSAFE') || t.includes('DANGER')) {
    badgeEl.className += ' danger';
    badgeEl.textContent = '✕ Do not eat';
  } else if (t.includes('CAUTION')) {
    badgeEl.className += ' warn';
    badgeEl.textContent = '⚠ Use caution';
  } else {
    badgeEl.textContent = '— Result';
  }
}

// ── Simple markdown renderer ───────────────────────────────
function renderMarkdown(text) {
  return text
    .replace(/^### (.+)$/gim, '<h3>$1</h3>')
    .replace(/^## (.+)$/gim, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[SAFE\]/gi, '<span class="verdict-inline-safe">✓ SAFE</span>')
    .replace(/\[CAUTION\]/gi, '<span class="verdict-inline-warn">⚠ CAUTION</span>')
    .replace(/\[(UNSAFE[^[\]]*|DANGER[^[\]]*)\]/gi, '<span class="verdict-inline-danger">✕ DANGER</span>');
}

// ── Copy to clipboard ──────────────────────────────────────
function copyResult(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).catch(() => {});
}

// ── Scan Ingredients ───────────────────────────────────────
document.getElementById('scanBtn').addEventListener('click', async () => {
  const ingredients = ingInput.value.trim();
  if (!ingredients) { ingInput.focus(); return; }

  const profile = getProfile();
  const btn = document.getElementById('scanBtn');
  const resultPane = document.getElementById('scannerResult');
  const outputEl = document.getElementById('scannerOutput');
  const badge = document.getElementById('verdictBadge');
  const telemetry = document.getElementById('scannerTelemetry');
  const overlay = document.getElementById('loadingOverlay');
  const overlayText = document.getElementById('loadingText');

  btn.disabled = true;
  resultPane.classList.add('hidden');
  overlay.classList.remove('hidden');
  overlayText.textContent = `Analyzing ingredients for ${profile.roommateName}…`;

  try {
    const res = await fetch('/api/scan-ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, ingredients })
    });
    const data = await res.json();

    overlay.classList.add('hidden');
    resultPane.classList.remove('hidden');

    if (data.error) {
      badge.className = 'verdict-badge';
      badge.textContent = 'Error';
      outputEl.innerHTML = `<p style="color:var(--red)">${data.error}</p>`;
    } else {
      setVerdict(badge, data.response);
      outputEl.innerHTML = renderMarkdown(data.response);
      const tps = data.evalCount && data.evalDuration ? Math.round((data.evalCount / (data.evalDuration || 1000)) * 1000) : null;
      telemetry.textContent = `${data.durationMs}ms · ${data.evalCount} tokens${tps ? ` · ${tps} t/s` : ''}`;
    }
  } catch (err) {
    overlay.classList.add('hidden');
    resultPane.classList.remove('hidden');
    badge.textContent = 'Error';
    outputEl.innerHTML = `<p style="color:var(--red)">${err.message}</p>`;
  } finally {
    btn.disabled = false;
  }
});

// ── Generate Recipe ────────────────────────────────────────
document.getElementById('recipeBtn').addEventListener('click', async () => {
  const pantryItems = document.getElementById('pantryInput').value.trim();
  const cuisinePreference = document.getElementById('cuisineInput').value.trim();
  if (!pantryItems) { document.getElementById('pantryInput').focus(); return; }

  const profile = getProfile();
  const btn = document.getElementById('recipeBtn');
  const resultPane = document.getElementById('recipeResult');
  const outputEl = document.getElementById('recipeOutput');
  const telemetry = document.getElementById('recipeTelemetry');
  const overlay = document.getElementById('loadingOverlay');
  const overlayText = document.getElementById('loadingText');

  btn.disabled = true;
  resultPane.classList.add('hidden');
  overlay.classList.remove('hidden');
  overlayText.textContent = `Creating a safe recipe for ${profile.roommateName}…`;

  try {
    const res = await fetch('/api/generate-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, pantryItems, cuisinePreference })
    });
    const data = await res.json();

    overlay.classList.add('hidden');
    resultPane.classList.remove('hidden');

    if (data.error) {
      outputEl.innerHTML = `<p style="color:var(--red)">${data.error}</p>`;
    } else {
      outputEl.innerHTML = renderMarkdown(data.response);
      telemetry.textContent = `${data.durationMs}ms · ${data.evalCount} tokens`;
    }
  } catch (err) {
    overlay.classList.add('hidden');
    resultPane.classList.remove('hidden');
    outputEl.innerHTML = `<p style="color:var(--red)">${err.message}</p>`;
  } finally {
    btn.disabled = false;
  }
});
