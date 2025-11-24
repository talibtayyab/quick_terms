// options.js

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('save-btn').addEventListener('click', saveOptions);
    document.getElementById('reset-btn').addEventListener('click', resetOptions);
    document.getElementById('add-custom-btn').addEventListener('click', addCustomFromInput);
    loadOptions();
});

function getDefaultPreferences() {
    return {
        dataSharing: 'never',
        emailSharing: 'not_allowed',
        locationAccess: 'never',
        customCategories: []
    };
}

function loadOptions() {
    chrome.runtime.sendMessage({ type: 'LOAD_PREFERENCES' }, (res) => {
        const prefs = (res && res.preferences) || getDefaultPreferences();
        setRadios('dataSharing', prefs.dataSharing);
        setRadios('emailSharing', prefs.emailSharing);
        setRadios('locationAccess', prefs.locationAccess);
        renderCustomList(prefs.customCategories);
    });
}

function setRadios(name, value) {
    const radios = document.querySelectorAll(`input[name="${name}"]`);
    radios.forEach((r) => {
        r.checked = r.value === value;
    });
}

function getRadios(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
}

function renderCustomList(customCategories) {
    const container = document.getElementById('custom-list');
    container.innerHTML = '';
    (customCategories || []).forEach((cat) => {
        const row = document.createElement('div');
        row.className = 'custom-item';
        row.dataset.id = cat.id;

        const label = document.createElement('span');
        label.textContent = cat.label;

        const toggle = document.createElement('button');
        toggle.textContent = cat.allowed ? 'Allowed' : 'Not allowed';
        toggle.addEventListener('click', () => {
            cat.allowed = !cat.allowed;
            toggle.textContent = cat.allowed ? 'Allowed' : 'Not allowed';
        });

        const remove = document.createElement('button');
        remove.textContent = 'Remove';
        remove.addEventListener('click', () => {
            row.remove();
        });

        row.appendChild(label);
        row.appendChild(toggle);
        row.appendChild(remove);
        container.appendChild(row);
    });
}

function collectCustomCategoriesFromDOM() {
    const rows = document.querySelectorAll('.custom-item');
    const arr = [];
    rows.forEach((row) => {
        const id = row.dataset.id;
        const label = row.querySelector('span').textContent;
        const allowed = row.querySelector('button').textContent === 'Allowed';
        arr.push({ id, label, allowed });
    });
    return arr;
}

function addCustomFromInput() {
    const input = document.getElementById('custom-label');
    const label = input.value.trim();
    if (!label) return;
    input.value = '';

    const current = collectCustomCategoriesFromDOM();
    current.push({
        id: 'custom_' + Date.now(),
        label,
        allowed: false
    });
    renderCustomList(current);
}

function saveOptions() {
    const prefs = {
        dataSharing: getRadios('dataSharing') || 'never',
        emailSharing: getRadios('emailSharing') || 'not_allowed',
        locationAccess: getRadios('locationAccess') || 'never',
        customCategories: collectCustomCategoriesFromDOM()
    };

    chrome.runtime.sendMessage(
        {
            type: 'SAVE_PREFERENCES',
            preferences: prefs
        },
        () => {
            // OPTIONAL: sync to your backend / Firebase / Supabase etc.
            syncPrefsToBackend(prefs);

            const status = document.getElementById('status');
            status.textContent = 'Saved!';
            setTimeout(() => (status.textContent = ''), 1500);
        }
    );
}

/**
 * Placeholder for future backend sync.
 * Replace the URL with your API endpoint when you build it.
 * For now, it does nothing and NEVER throws errors.
 */
function syncPrefsToBackend(prefs) {
    try {
        // Example only (commented out to avoid errors):
        //
        // fetch('https://your-backend.example.com/api/quick-terms-prefs', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(prefs)
        // });

        // Currently a no-op for safety.
    } catch (e) {
        console.warn('Backend sync failed (ignored):', e);
    }
}

function resetOptions() {
    const def = getDefaultPreferences();
    setRadios('dataSharing', def.dataSharing);
    setRadios('emailSharing', def.emailSharing);
    setRadios('locationAccess', def.locationAccess);
    renderCustomList(def.customCategories);

    chrome.runtime.sendMessage(
        {
            type: 'SAVE_PREFERENCES',
            preferences: def
        },
        () => {
            const status = document.getElementById('status');
            status.textContent = 'Reset to defaults';
            setTimeout(() => (status.textContent = ''), 1500);
        }
    );
}