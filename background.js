// background.js (MV3 service worker, module)
import { summarizeTermsAndCheck, explainClause } from './utils/aiClient.js';

const analysesByTabId = new Map(); // tabId -> { url, title, analysis, timestamp, preferences }

/**
 * Handle messages from content scripts and popup/options/report
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'PAGE_TEXT_DETECTED':
            handlePageText(message, sender, sendResponse);
            return true; // async

        case 'GET_ANALYSIS': {
            const data = analysesByTabId.get(message.tabId) || null;
            sendResponse({ ok: true, data });
            return false;
        }

        case 'GET_LAST_ANALYSIS': {
            // For report.html (no tabId context)
            chrome.storage.local.get('quickTermsLastAnalysis', (res) => {
                sendResponse({ ok: true, data: res.quickTermsLastAnalysis || null });
            });
            return true;
        }

        case 'SAVE_PREFERENCES':
            chrome.storage.sync.set({ quickTermsPreferences: message.preferences }, () => {
                sendResponse({ ok: true });
            });
            return true;

        case 'LOAD_PREFERENCES':
            chrome.storage.sync.get('quickTermsPreferences', (res) => {
                sendResponse({
                    ok: true,
                    preferences: res.quickTermsPreferences || getDefaultPreferences()
                });
            });
            return true;

        case 'EXPLAIN_CLAUSE':
            handleExplainClause(message, sendResponse);
            return true;

        default:
            return false;
    }
});

/**
 * Process T&C-like page text when detected
 */
async function handlePageText(message, sender, sendResponse) {
    try {
        const tabId = sender.tab ? sender.tab.id : null;
        if (!tabId) {
            sendResponse({ ok: false, error: 'No tab ID' });
            return;
        }

        const { text, url, title } = message;

        const preferences = await loadPreferencesAsync();
        const analysis = await summarizeTermsAndCheck(text, preferences);

        const payload = {
            url,
            title,
            timestamp: Date.now(),
            preferences,
            analysis
        };

        analysesByTabId.set(tabId, payload);

        // Also store a copy for report.html (no tab context)
        chrome.storage.local.set({ quickTermsLastAnalysis: payload }, () => {
            sendResponse({ ok: true, data: payload });
        });
    } catch (err) {
        console.error('Error in handlePageText:', err);
        sendResponse({ ok: false, error: err.message || String(err) });
    }
}

/**
 * Handle AI explanation for a specific clause
 */
async function handleExplainClause(message, sendResponse) {
    try {
        const clauseText = message.clause || '';
        if (!clauseText.trim()) {
            sendResponse({ ok: false, error: 'Empty clause text' });
            return;
        }
        const explanation = await explainClause(clauseText);
        sendResponse({ ok: true, explanation });
    } catch (err) {
        console.error('Error in handleExplainClause:', err);
        sendResponse({ ok: false, error: err.message || String(err) });
    }
}

function getDefaultPreferences() {
    return {
        dataSharing: 'never',          // 'never' | 'consent' | 'always'
        emailSharing: 'not_allowed',   // 'not_allowed' | 'allowed'
        locationAccess: 'never',       // 'never' | 'while_using' | 'always'
        customCategories: []           // [{ id, label, allowed }]
    };
}

function loadPreferencesAsync() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('quickTermsPreferences', (res) => {
            resolve(res.quickTermsPreferences || getDefaultPreferences());
        });
    });
}