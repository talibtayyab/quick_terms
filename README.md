# 🧠 Quick Terms – AI-Powered Terms & Conditions Analyzer

Quick Terms is a Chrome Extension that summarizes Terms & Conditions, highlights risky clauses, explains legal language, and checks compliance with your privacy preferences.

This extension is **not yet published** on the Chrome Web Store — it is installed manually using **Developer Mode**.

Repo: https://github.com/talibtayyab/quick_terms

---

## ✨ Features

### 🔍 Automatic Detection  
Identifies Terms & Conditions / Privacy Policy pages and extracts visible text.

### 🤖 AI Summaries  
- Two-line overview  
- Red flags  
- Important points  
Uses Gemini API if configured; otherwise, a built-in fallback summarizer.

### 🟨 Highlight Risky Clauses  
Highlights text like: “third party”, “share your data”, “location data”, “arbitration”, etc.

### 💬 Click-to-Explain  
Clicking a highlighted word opens a bottom-right popup explaining the clause in plain English.

### ✔ Compliance Check  
Checks the page against your personal privacy preferences:
- Data sharing  
- Email marketing  
- Location usage  
- Custom red flags  

### 📄 Full PDF Report  
Generates a detailed report containing:
- Summary  
- Red flags  
- Important points  
- Violations  

---

## 🚀 Installation (Developer Mode)

### 1️⃣ Clone or Download  
git clone https://github.com/talibtayyab/quick_terms.git

Or download ZIP → extract it.

### 2️⃣ Enable Developer Mode  
1. Open Chrome  
2. Go to: chrome://extensions  
3. Toggle Developer mode ON  

### 3️⃣ Load the Extension  
1. Click Load unpacked  
2. Select the quick_terms folder  
3. The extension will appear in your toolbar

---

## 🧩 How to Use

### ✔ Step 1: Visit a T&C or Privacy Policy  
Examples:  
- https://www.apple.com/legal/internet-services/terms/site.html  
- https://www.facebook.com/terms.php  

The extension auto-detects the page.

---

### ✔ Step 2: Open the Extension Popup  
You will see:
- Summary  
- Red flags  
- Important points  
- Compliance status  
- Violations  
- Highlight button  
- Full report button  
- Preferences link  

---

### ✔ Step 3: Highlight Risky Clauses  
Click:

Highlight risky terms

The webpage highlights all risky text in yellow.

---

### ✔ Step 4: Click Highlights for Explanation  
A floating dark popup appears with a plain-English explanation.

---

### ✔ Step 5: Full Report  
Click:

Full report / PDF

Includes:
- Summary  
- Red flags  
- Important points  
- Compliance check  
- Violations  

---

### ✔ Step 6: Set Privacy Preferences  
Go to Preferences to configure:
- Data sharing  
- Email usage  
- Location use  
- Custom categories  

Stored using chrome.storage.sync.

---

## 🔑 Optional: Enable Gemini AI  
Edit:
utils/aiClient.js

Replace:
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

with your actual Gemini API key.

---

## 📂 Project Structure (Safe Version)

- quick_terms/
  - manifest.json
  - background.js
  - contentScript.js
  - popup.html
  - popup.js
  - popup.css
  - options.html
  - options.js
  - options.css
  - report.html
  - report.js
  - report.css
  - utils/
    - aiClient.js
  - icons/      (optional)
  - docs/       (optional)

---

## 🛠 Tech Stack

- Chrome Extension Manifest V3  
- JavaScript (ES modules)  
- Content scripts  
- Service worker  
- Gemini API (optional)  
- chrome.storage.sync  
- HTML/CSS frontend (popup, options, report)  
- DOM parsing using TreeWalker  

---

## 🔐 Security & Privacy

- No analytics or tracking  
- All processing happens locally in your browser  
- No external requests are made unless you provide a Gemini API key  
- Preferences stored with chrome.storage.sync  

---

## 🗺 Roadmap

- Severity-based color highlights  
- Tooltip explanations on hover  
- “Jump to next highlight” navigation  
- Dark mode  
- Backend sync (optional)  
- Firefox version  
- Chrome Web Store publishing  

---

## 🤝 Contributing

Contributions welcome!  
Open an issue before making major changes.


---

## ⭐ Author

**Talib Mohammed**  
If this helped you, please ⭐ star the repo:  
https://github.com/talibtayyab/quick_terms
