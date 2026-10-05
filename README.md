# SafeBite 🛡️ — Built for a Friend with Gemma 2

> **Open-Source AI at its core:** A 100% local, private meal planner and ingredient allergy scanner built for friends and roommates with severe dietary restrictions, powered by **Google DeepMind's Gemma 2 (2B)**.

---

## 🌟 Why Open Innovation Matters for SafeBite

When cooking for a roommate or friend with severe allergies (Celiac disease, anaphylactic peanut allergies, or lactose intolerance), **trust and privacy are non-negotiable**:

1. **🔒 Medical & Dietary Privacy**: Health conditions, food allergies, and medication interactions shouldn't be sent to corporate cloud servers or used to train third-party ad models. With Gemma 2 running locally, your friend's sensitive health profile never leaves your laptop.
2. **✈️ 100% Offline Resilience**: Kitchens, grocery store basements, and campouts often have zero cell reception. SafeBite operates entirely offline without an active internet connection.
3. **⚡ Zero API Fees**: No token limits, subscription paywalls, or rate limits. Unlimited ingredient checks and recipe generation for your household.
4. **🧠 Google Gemma 2 (2B Open Weights)**: High-precision instruction following and deep semantic understanding of food derivatives (e.g. flagging "malt" or "spelt" as gluten, "casein" as dairy) in an ultra-efficient 1.6 GB model that runs effortlessly on standard hardware.

---

## 🚀 Quick Start

### Prerequisites
1. **Node.js** (v18+)
2. **Ollama** with Gemma 2 2B:
   ```bash
   ollama run gemma2:2b
   ```

### Run the App
```bash
cd safebite-gemma
node server.js
```
Open your browser to: **`http://localhost:3000`**

---

## 🎯 Features

- **Ingredient Allergen Scanner**: Paste ingredient labels or recipe links. Gemma 2 scans for direct allergens, hidden derivatives (lecithin, whey, malt extract), and cross-contamination warnings.
- **Pantry-to-Plate Safe Chef**: Enter random fridge leftovers; Gemma 2 crafts customized, safe recipes with kitchen hygiene and cross-contamination tips.
- **Friend Profile Customization**: Tailor warnings specifically to your friend's allergies (Gluten, Peanuts, Dairy, Soy, Shellfish, etc.) and reaction severity.
