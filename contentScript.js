// contentScript.js

/**
 * Keyword-based detector for terms-like pages
 */
function pageLooksLikeTerms(text) {
    const t = text.toLowerCase();
    const keywords = [
        'terms and conditions',
        'terms of use',
        'privacy policy',
        'user agreement',
        'end user license agreement',
        'eula'
    ];
    return keywords.some((k) => t.includes(k));
}

/**
 * Extract visible text from the document
 */
function extractVisibleText() {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                if (!node.parentElement) return NodeFilter.FILTER_REJECT;
                const style = window.getComputedStyle(node.parentElement);
                if (style && (style.display === 'none' || style.visibility === 'hidden')) {
                    return NodeFilter.FILTER_REJECT;
                }
                const trimmed = node.nodeValue.trim();
                return trimmed ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        }
    );

    let text = '';
    let node;
    while ((node = walker.nextNode())) {
        text += node.nodeValue.trim() + ' ';
    }
    return text;
}

/**
 * Inject CSS for highlights & overlay
 */
function ensureStyles() {
    if (document.getElementById('qt-highlight-style')) return;
    const style = document.createElement('style');
    style.id = 'qt-highlight-style';
    style.textContent = `
    .qt-highlight {
      background-color: rgba(255, 215, 0, 0.6);
      cursor: pointer;
      border-radius: 2px;
      padding: 0 1px;
    }
    .qt-explain-overlay {
      position: fixed;
      right: 16px;
      bottom: 16px;
      max-width: 360px;
      max-height: 50vh;
      overflow-y: auto;
      background: #111827;
      color: #f9fafb;
      padding: 12px 14px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      z-index: 2147483647;
    }
    .qt-explain-overlay h3 {
      margin: 0 0 4px;
      font-size: 14px;
    }
    .qt-explain-overlay button {
      margin-top: 6px;
      padding: 3px 8px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 11px;
      background: #f97316;
      color: #111827;
    }
  `;
    document.head.appendChild(style);
}

/**
 * Highlight suspicious terms in the DOM
 */
const RISKY_PATTERNS = [
    /third[- ]party/gi,
    /share your data/gi,
    /sell your data/gi,
    /personal information/gi,
    /location data/gi,
    /geolocation/gi,
    /marketing purposes/gi,
    /advertising partners/gi,
    /arbitration/gi,
    /class action waiver/gi,
    /irrevocable/gi
];

function highlightSuspiciousTerms() {
    ensureStyles();

    // Clear old highlights
    document.querySelectorAll('.qt-highlight').forEach((el) => {
        const parent = el.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
    });

    // Step 1: Collect all text nodes first
    const nodesToReplace = [];
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                if (!node.parentElement) return NodeFilter.FILTER_REJECT;
                const style = window.getComputedStyle(node.parentElement);
                if (style.display === 'none' || style.visibility === 'hidden') {
                    return NodeFilter.FILTER_REJECT;
                }
                const txt = node.nodeValue;
                if (!txt || !txt.trim()) return NodeFilter.FILTER_REJECT;

                return RISKY_PATTERNS.some((p) => p.test(txt))
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        }
    );

    // Collect nodes
    let node;
    while ((node = walker.nextNode())) {
        nodesToReplace.push(node);
    }

    // Step 2: Apply replacements AFTER scanning
    nodesToReplace.forEach((node) => {
        let html = node.nodeValue;
        RISKY_PATTERNS.forEach((pattern) => {
            html = html.replace(pattern, (match) => `[[QT_HL]]${match}[[/QT_HL]]`);
        });

        const span = document.createElement('span');
        span.innerHTML = html
            .split('[[QT_HL]]')
            .join('<span class="qt-highlight">')
            .split('[[/QT_HL]]')
            .join('</span>');

        const parent = node.parentNode;
        if (!parent) return;

        parent.replaceChild(span, node);
    });

    // Step 3: Bind click listeners
    document.querySelectorAll('.qt-highlight').forEach((el) => {
        el.addEventListener('click', () => {
            const clauseText = getSentenceAroundNode(el);
            requestExplanation(clauseText);
        });
    });
}

/**
 * Get approximate sentence around a node text
 */
function getSentenceAroundNode(node) {
    const text = node.textContent || '';
    const parentText = (node.parentElement?.innerText || '').replace(/\s+/g, ' ');
    // crude: just return up to 300 chars where this text occurs
    const idx = parentText.indexOf(text.trim());
    if (idx === -1) return parentText.slice(0, 300);
    return parentText.slice(Math.max(0, idx - 80), idx + text.length + 80);
}

/**
 * Request explanation from background + show overlay
 */
function requestExplanation(clause) {
    chrome.runtime.sendMessage(
        {
            type: 'EXPLAIN_CLAUSE',
            clause
        },
        (res) => {
            if (!res || !res.ok) {
                showOverlay('Could not get explanation. Try again.');
                return;
            }
            showOverlay(res.explanation);
        }
    );
}

function showOverlay(message) {
    ensureStyles();
    let box = document.getElementById('qt-explain-overlay');
    if (!box) {
        box = document.createElement('div');
        box.id = 'qt-explain-overlay';
        box.className = 'qt-explain-overlay';
        document.body.appendChild(box);
    }
    box.innerHTML = `
    <h3>Clause explanation</h3>
    <div>${escapeHtml(message)}</div>
    <button id="qt-close-overlay">Close</button>
  `;
    document.getElementById('qt-close-overlay').onclick = () => {
        box.remove();
    };
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Run detector on page load
 */
function runDetector() {
    try {
        const text = extractVisibleText();
        if (!text || text.length < 500) return;
        if (!pageLooksLikeTerms(text)) return;

        chrome.runtime.sendMessage(
            {
                type: 'PAGE_TEXT_DETECTED',
                text,
                url: window.location.href,
                title: document.title || ''
            },
            () => {
                // After analysis, automatically highlight risky terms
                highlightSuspiciousTerms();
            }
        );
    } catch (err) {
        console.error('Quick Terms content script error:', err);
    }
}

// Listen for commands from popup (e.g. "Highlight again")
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
    if (msg.type === 'QT_HIGHLIGHT') {
        highlightSuspiciousTerms();
    }
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    runDetector();
} else {
    document.addEventListener('DOMContentLoaded', runDetector);
}