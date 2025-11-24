// popup.js

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    const statusEl = document.getElementById('status');
    const contentEl = document.getElementById('content');
    const refreshBtn = document.getElementById('refresh-btn');
    const highlightBtn = document.getElementById('highlight-btn');
    const reportBtn = document.getElementById('report-btn');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) {
            statusEl.textContent = 'No active tab.';
            return;
        }

        chrome.runtime.sendMessage(
            { type: 'GET_ANALYSIS', tabId: tab.id },
            (response) => {
                if (!response || !response.ok || !response.data) {
                    statusEl.textContent =
                        'No terms detected yet on this page. Try refreshing or visiting a T&C page.';
                    return;
                }

                statusEl.classList.add('hidden');
                contentEl.classList.remove('hidden');
                renderAnalysis(response.data);
            }
        );
    });

    refreshBtn.addEventListener('click', () => {
        statusEl.textContent = 'Re-analyzing...';
        statusEl.classList.remove('hidden');
        contentEl.classList.add('hidden');

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab) return;

            chrome.tabs.reload(tab.id, {}, () => {
                // small delay then re-fetch
                setTimeout(() => {
                    chrome.runtime.sendMessage(
                        { type: 'GET_ANALYSIS', tabId: tab.id },
                        (response) => {
                            if (!response || !response.ok || !response.data) {
                                statusEl.textContent = 'Re-analysis not ready yet. Try again in a moment.';
                                return;
                            }
                            statusEl.classList.add('hidden');
                            contentEl.classList.remove('hidden');
                            renderAnalysis(response.data);
                        }
                    );
                }, 2500);
            });
        });
    });

    highlightBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab) return;
            chrome.tabs.sendMessage(tab.id, { type: 'QT_HIGHLIGHT' });
        });
    });

    reportBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
    });
}

function renderAnalysis(payload) {
    const { url, title, analysis } = payload;
    const { summary, red_flags, important_points, compliant, violations } = analysis;

    document.getElementById('page-title').textContent = title || 'Untitled page';
    document.getElementById('page-url').textContent = url || '';

    document.getElementById('summary').textContent =
        summary || 'No summary generated.';

    const redFlagsEl = document.getElementById('red-flags');
    redFlagsEl.innerHTML = '';
    (red_flags || []).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        redFlagsEl.appendChild(li);
    });

    const importantEl = document.getElementById('important-points');
    importantEl.innerHTML = '';
    (important_points || []).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        importantEl.appendChild(li);
    });

    const complianceEl = document.getElementById('compliance-result');
    const violationsEl = document.getElementById('violations');
    violationsEl.innerHTML = '';

    if (compliant === true) {
        complianceEl.textContent =
            '✅ This document appears mostly consistent with your preferences.';
        complianceEl.classList.add('compliant-yes');
        complianceEl.classList.remove('compliant-no');
    } else if (compliant === false) {
        complianceEl.textContent =
            '⚠️ This document may violate your preferences. Review the red flags and violations.';
        complianceEl.classList.add('compliant-no');
        complianceEl.classList.remove('compliant-yes');
    } else {
        complianceEl.textContent = 'No compliance evaluation available.';
    }

    (violations || []).forEach((v) => {
        const li = document.createElement('li');
        li.textContent = v;
        violationsEl.appendChild(li);
    });
}