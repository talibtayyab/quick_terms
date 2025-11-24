// report.js

document.addEventListener('DOMContentLoaded', () => {
    const printBtn = document.getElementById('print-btn');
    printBtn.addEventListener('click', () => {
        window.print();
    });

    chrome.runtime.sendMessage({ type: 'GET_LAST_ANALYSIS' }, (res) => {
        if (!res || !res.ok || !res.data) {
            document.getElementById('no-data').classList.remove('hidden');
            return;
        }
        renderReport(res.data);
    });
});

function renderReport(payload) {
    document.getElementById('no-data').classList.add('hidden');
    const report = document.getElementById('report');
    report.classList.remove('hidden');

    const { url, title, timestamp, analysis } = payload;
    const { summary, red_flags, important_points, compliant, violations } = analysis;

    document.getElementById('r-title').textContent = title || 'Untitled page';
    document.getElementById('r-url').textContent = url || '';

    const dt = new Date(timestamp || Date.now());
    document.getElementById('r-time').textContent = `Analyzed at: ${dt.toLocaleString()}`;

    document.getElementById('r-summary').textContent = summary || '';

    const rRed = document.getElementById('r-red');
    rRed.innerHTML = '';
    (red_flags || []).forEach((r) => {
        const li = document.createElement('li');
        li.textContent = r;
        rRed.appendChild(li);
    });

    const rPoints = document.getElementById('r-points');
    rPoints.innerHTML = '';
    (important_points || []).forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        rPoints.appendChild(li);
    });

    const rComp = document.getElementById('r-compliance');
    if (compliant === true) {
        rComp.textContent = 'This document appears mostly consistent with your preferences.';
    } else if (compliant === false) {
        rComp.textContent =
            'This document may conflict with some of your preferences. Review the violations below.';
    } else {
        rComp.textContent = 'No compliance evaluation was available.';
    }

    const rViol = document.getElementById('r-violations');
    rViol.innerHTML = '';
    (violations || []).forEach((v) => {
        const li = document.createElement('li');
        li.textContent = v;
        rViol.appendChild(li);
    });
}