document.addEventListener("DOMContentLoaded", () => {
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

        // Only update player name and team
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
});