document.addEventListener("DOMContentLoaded", initPopup);
async function initPopup() {
    const form = document.getElementById("ycAutofillForm");
    const submitBtn = document.getElementById("submit");
    const lawSelect = document.getElementById("OffenceN");
    const teamSelect = document.getElementById("pTeam");
    const numberSelect = document.getElementById("pNumber");
    const reportField = document.getElementById("report");
    const customiseButton = document.getElementById("customiseButton");
    const conditionsSelect = document.getElementById("conditions");
    const patternSelect = document.getElementById("temperOfGame");
    const hSelect = document.getElementById('hScore');
    const aSelect = document.getElementById('aScore');
    const hiddenInput = document.getElementById('score');

    if (!form || !submitBtn) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return console.warn("No active tab found");

    // 1️⃣ Populate the Team select from the page
    populateTeamOptions(tab);

    customiseButton.addEventListener('click', openCustomiseWindow);

    //Get conditons
    let conditions = await getOrInitStorageItem('conditions', ['Dry, dry pitch', 'Dry but slippery ball', 'Wet with a slippery ball', 'Dry but windy']);
    populateSelect(conditionsSelect, conditions);

    let patterns = await getOrInitStorageItem('patterns', ['Even and well Contested game', 'Huge score difference, one team better than the other', 'Tight game with a few scuffles']);
    populateSelect(patternSelect, patterns);

    // Handle autofill form submission
    submitBtn.addEventListener("click", (e) => handleFormSubmit(e, form, tab));

    // Handle automatic report generation
    [lawSelect, teamSelect, numberSelect].forEach((el) =>
        el.addEventListener("change", () =>
            updateReport(lawSelect, teamSelect, numberSelect, reportField)
        )
    );

    updateReport(lawSelect, teamSelect, numberSelect, reportField);

    // Start listening for changes
    //listenForConditionChanges(conditionsSelect);
    listenForStorageChanges(patternSelect, 'patterns');
    listenForStorageChanges(conditionsSelect, 'conditions');

    function updateHiddenField() {
        // Combines the two values into the format "2-1"
        hiddenInput.value = `${hSelect.value} - ${aSelect.value}`;
    }

    // Listen for changes on both dropdowns
    hSelect.addEventListener('change', updateHiddenField);
    aSelect.addEventListener('change', updateHiddenField);
}

/* ---------------------------------------------
   Autofill handler — sends data into the webpage
--------------------------------------------- */
async function handleFormSubmit(event, form, tab) {
    event.preventDefault();

    const values = Object.fromEntries(new FormData(form).entries());
    console.log("Popup form submitted:", values);

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: autofillPage,
            args: [values],
        });
    } catch (err) {
        console.error("Autofill injection failed:", err);
    }
}

/* ---------------------------------------------
   Injected autofill function (runs in page context)
--------------------------------------------- */
function autofillPage(vals) {
    try {
        const mapping = {
            pName: "text_01",
            pTeam: "team_index_key",
            pPosition: "select_01",
            pNumber: "select_02",
            OffenceN: "select_03",
            pGame: "select_04",
            tElapsed: "text_05",
            score: "text_06",
            refProx: "text_07",
            conditions: "text_08",
            temperOfGame: "mce1_ifr",
            playerCautioned: "select_05",
            flaggedByAR: "select_06",
            dissent: "select_07",
            report: "mce2_ifr",
        };

        for (const [popupKey, pageId] of Object.entries(mapping)) {
            const value = vals[popupKey];
            if (!value) continue;

            const el = document.getElementById(pageId);
            if (!el) {
                console.warn(`Element not found: ${pageId}`);
                continue;
            }

            switch (el.tagName) {
                case "INPUT":
                case "TEXTAREA":
                    el.value = value;
                    el.dispatchEvent(new Event("input", { bubbles: true }));
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                    break;

                case "SELECT":
                    const matched =
                        Array.from(el.options).find((opt) => opt.value === value) ||
                        Array.from(el.options).find(
                            (opt) => opt.text.trim() === value.trim()
                        );
                    if (matched) {
                        el.value = matched.value;
                        matched.selected = true;
                        el.dispatchEvent(new Event("input", { bubbles: true }));
                        el.dispatchEvent(new Event("change", { bubbles: true }));
                    } else {
                        console.warn(`No match for select ${pageId}:`, value);
                    }
                    break;

                case "IFRAME":
                    try {
                        const doc = el.contentDocument || el.contentWindow.document;
                        if (doc?.body) {
                            doc.body.innerHTML = value;
                        } else {
                            console.warn(`Iframe ${pageId} has no body`);
                        }
                    } catch (err) {
                        console.error(`Error writing to iframe ${pageId}:`, err);
                    }
                    break;
            }
        }
    } catch (err) {
        console.error("Autofill script error:", err);
    }
}

/* ---------------------------------------------
   Fetch team <select> options from the page
--------------------------------------------- */
async function populateTeamOptions(tab) {
    const select = document.getElementById("pTeam");
    try {
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: "getSelectOptions",
        });
        
        select.innerHTML = "";

        if (response?.options?.length) {
            response.options.forEach((opt) => {
                
                const element = document.createElement("option");
                element.value = opt.value;
                if (opt.text === "Please choose team...") {
                    element.textContent = "Choose an option or leave blank";
                } else {
                    element.textContent = opt.text;
                }
                select.appendChild(element);
            });
        } else {
            element.textContent = "No teams found";
            select.appendChild(element);
        }
    } catch (err) {
        console.log("Team options fetch failed:", err);
        const element = document.createElement("option");
        element.textContent = "Please go to form or refresh page";
        select.appendChild(element);
    }
}

/* ---------------------------------------------
   Combine law + team + number to fill report
--------------------------------------------- */
function updateReport(lawSelect, teamSelect, numberSelect, reportField) {
    if (!reportField) return;

    const law = lawSelect?.value;
    const teamValue = teamSelect?.value || "";      // actual selected value
    const numberValue = numberSelect?.value || "";  // actual selected value

    console.log("Team Value:", teamValue);
    console.log("Number Value :", numberValue);

    if (teamValue != "Please go to form or refresh page" && teamValue != "*" && numberValue != null)
    {
        const teamText = teamSelect.selectedOptions[0]?.text || "";
        const numberText = numberSelect.selectedOptions[0]?.text || "";
        if (law === "Law 9 – 9 Repeated Infringements") {
            reportField.value = `Gave a warning to ${teamText}'s captain about ${teamText} ${numberText}'s discipline. ${teamText} ${numberText} infringed again. YC was issued.`;
        } else if (law === "Law 9 – 10 Team Repeated Infringements") {
            reportField.value = `Gave a team warning to ${teamText}'s captain. ${teamText} ${numberText} infringed again. YC was issued.`;
        } else {
            reportField.value = reportField.defaultValue || "";
        }
    }       

    // Only update if BOTH team and number are NOT the default/empty
    if (teamValue == "Please go to form or refresh page" || teamValue == "*" || numberValue == null)
    {
        reportField.value = reportField.defaultValue || "";
    }   

    
}

function openCustomiseWindow() {
    chrome.windows.create({
        url: 'customiseWindow.html', // The file to open
        type: 'popup',        // Opens as a standalone popup window
        width: 325,
        height: 600
    });
}

async function getOrInitStorageItem(key, defaultValue) {
    let stored = await chrome.storage.sync.get(key);
    if (!stored[key]) {
        await chrome.storage.sync.set({ [key]: defaultValue });
        return defaultValue;
    }
    return stored[key];
}

function populateSelect(select, items) {
    select.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Choose an option or leave blank";
    select.appendChild(defaultOption);
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
    });
}

// Function to listen for changes in storage

function listenForStorageChanges(select, storageKey) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;

        // Check if the specific key we care about is in the changes object
        if (changes[storageKey]) {
            const newValue = changes[storageKey].newValue;

            console.log(`Updating ${storageKey} select`);

            if (select && Array.isArray(newValue)) {
                populateSelect(select, newValue);
            }
        }
    });
}

/*document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("ycAutofillForm");
    const btn = document.getElementById("submit"); // your submit button

    if (!form || !btn) return;

    btn.addEventListener("click", async (e) => {
        e.preventDefault();

        // Get values from popup form
        const formData = new FormData(form);
        const values = Object.fromEntries(formData.entries());
        console.log("Popup form submitted:", values);

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (vals) => {
                try {
                    const mapping = {
                        "pName": "text_01",                // Full name of player
                        "pTeam": "team_index_key",         // Player’s team
                        "pPosition": "select_01",          // Playing position
                        "pNumber": "select_02",            // Shirt number
                        "OffenceN": "select_03",           // Nature of offence
                        "pGame": "select_04",              // Period of game
                        "tElapsed": "text_05",             // Elapsed time
                        "score": "text_06",                // Score at time
                        "refProx": "text_07",              // Proximity of referee
                        "conditions": "text_08",           // Conditions
                        "temperOfGame": "mce1_ifr",        // iframe (temper of game — probably TinyMCE editor)
                        "playerCautioned": "select_05",    // Player cautioned
                        "flaggedByAR": "select_06",        // Flagged by AR
                        "dissent": "select_07",            // Dissent accepted
                        "report": "mce2_ifr"               // iframe (report field — TinyMCE)

                    };

                    for (const [popupKey, pageId] of Object.entries(mapping)) {
                        const value = vals[popupKey];
                        if (!value) continue;

                        const el = document.getElementById(pageId);
                        if (!el) {
                            console.warn(`Element not found: ${pageId}`);
                            continue;
                        }

                        // Text input (works)
                        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                            el.value = value;
                            el.dispatchEvent(new Event("input", { bubbles: true }));
                            el.dispatchEvent(new Event("change", { bubbles: true }));
                            console.log(`Updated text field ${pageId} to:`, value);
                        }

                        // Dropdown (our problem child)
                        else if (el.tagName === "SELECT") {
                            console.log(`Attempting to set select ${pageId} to value:`, value);

                            // Try by value first
                            let matched = Array.from(el.options).find(opt => opt.value === value);

                            // Try by visible text if value doesn’t match
                            if (!matched) {
                                matched = Array.from(el.options).find(opt => opt.text.trim() === value.trim());
                            }

                            if (matched) {
                                el.value = matched.value;
                                matched.selected = true;
                                el.dispatchEvent(new Event("input", { bubbles: true }));
                                el.dispatchEvent(new Event("change", { bubbles: true }));
                                console.log(`Updated select ${pageId} to:`, matched.text);
                            } else {
                                console.warn(`No match found for select ${pageId} — tried value/text:`, value);
                            }
                        }

                        // --- Handle TinyMCE iframe editors ---
                        else if (el.tagName === "IFRAME") {
                            try {
                                const doc = el.contentDocument || el.contentWindow.document;
                                const body = doc.body;
                                if (body) {
                                    body.innerHTML = value;
                                    console.log(`Set iframe (${pageId}) content to:`, value);
                                } else {
                                    console.warn(`Iframe ${pageId} has no body`);
                                }
                            } catch (err) {
                                console.error(`Error writing to iframe ${pageId}:`, err);
                            }
                            continue;
                        }
                    }
                } catch (err) {
                    console.error("Script error:", err);
                }
            },
            args: [values]
        });
    });
});





document.addEventListener("DOMContentLoaded", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: "getSelectOptions" }, response => {
        const select = document.getElementById("pTeam");
        select.innerHTML = ""; // clear any old content

        if (response?.options?.length) {
            for (const opt of response.options) {
                const optionEl = document.createElement("option");
                optionEl.value = opt.value;
                optionEl.textContent = opt.text;
                select.appendChild(optionEl);
            }
        } else {
            const optionEl = document.createElement("option");
            optionEl.textContent = "No options found";
            select.appendChild(optionEl);
        }
    });
});



document.addEventListener("DOMContentLoaded", () => {
    const lawSelect = document.getElementById("OffenceN");
    const teamSelect = document.getElementById("pTeam");
    const numberSelect = document.getElementById("pNumber");
    const combinedSelect = document.getElementById("report");

    function updateCombinedSelect() {
        console.log("Law number: ", lawSelect.value);
        const teamText = teamSelect.options[teamSelect.selectedIndex]?.text || "";
        const numberText = numberSelect.options[numberSelect.selectedIndex]?.text || "";

        const placeholder = new Option("Choose an option", "");

        
        if (lawSelect.value == "Law 9 – 9 Repeated Infringements") {
            if (teamSelect.value && numberSelect.value) {
                report.value = `Gave a warning to ${teamText}'s captain about ${teamText} ${numberText}'s discipline. ${teamText} ${numberText} infringed again. YC was issued`, `Gave a warning to ${teamText}'s captain about ${teamText} ${numberText}'s disipline. ${teamText} ${numberText} infringed again. YC was issued`;
            }
        }

        else if (lawSelect.value == "Law 9 – 10 Team Repeated Infringements") {
            if (teamSelect.value && numberSelect.value) {
                report.value = `Gave a team warning to ${teamText}'s captain. ${teamText} ${numberText} infringed again. YC was issued`, `Gave a team warning to ${teamText}. ${teamText} ${numberText} infringed again. YC was issued`;
            }
        }
        else {
            report.value = report.defaultValue;
        }
    }

    // When either select changes, update the combined one

    lawSelect.addEventListener("change", updateCombinedSelect);
    teamSelect.addEventListener("change", updateCombinedSelect);
    numberSelect.addEventListener("change", updateCombinedSelect);

    // Initialize state
    updateCombinedSelect();
});*/