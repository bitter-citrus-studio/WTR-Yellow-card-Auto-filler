document.addEventListener('DOMContentLoaded', async () => {

    const conditionsContainer = document.getElementById("conditionsContainer");
    const patternsContainer = document.getElementById("patternsContainer");
    //const saveBtn = document.getElementById("saveBtn");
    const addConditionBtn = document.getElementById("addConditionBtn");
    const addPatternBtn = document.getElementById("addPatternBtn");
    const newConditionInput = document.getElementById("newConditionOptionInput");
    const newPatternInput = document.getElementById("newPatternOptionInput");
    const saveMessage = document.getElementById("saveMessage");

    // 1️ Load saved options, or initialize defaults
    let conditions = await getOrInitStorageItem('conditions', ['Dry, dry pitch', 'Dry but slippery ball', 'Wet with a slippery ball', 'Dry but windy']);
    let patterns = await getOrInitStorageItem('patterns', ['Even and well Contested game', 'Huge score difference, one team better than the other', 'Tight game with a few scuffles']);
    // 2️ Render the list in the UI
    renderOptions(conditionsContainer, conditions);
    renderOptions(patternsContainer, patterns);

    // 3️ Add new option
    addConditionBtn.addEventListener('click', () => {
        const value = newConditionInput.value.trim();
        if (value) {
            conditions.push(value);
            renderOptions(conditionsContainer, conditions);
            newConditionInput.value = '';
        }
        UpdateAllStorage();
    });

    addPatternBtn.addEventListener('click', () => {
        const value = newPatternInput.value.trim();
        if (value) {
            patterns.push(value);
            renderOptions(patternsContainer, patterns);
            newPatternInput.value = '';
        }
        UpdateAllStorage();
    });

    /*saveBtn.addEventListener('click', () => {
        saveMessage.style.display = "inline"
        setTimeout(function () { saveMessage.style.display = "none" }, 2000);
        UpdateAllStorage();
    });*/

    async function UpdateAllStorage()
    {
        await UpdateStorage(conditionsContainer, 'conditions');
        await UpdateStorage(patternsContainer, 'patterns');
    }

    // TODO: Make this able to go through all the storage items
    /*saveBtn.addEventListener('click', async () => {
        await UpdateStorage(conditionsContainer, 'conditions');
        await UpdateStorage(patternsContainer, 'patterns');

        // Show temporary message
        saveMessage.style.display = 'block';
        setTimeout(() => {
            saveMessage.style.display = 'none';
        }, 2000);
    });*/

    function renderOptions(container, options) {
        container.innerHTML = ''; // Clear once at the start

        options.forEach((opt, index) => {
            const div = document.createElement('div');
            div.className = 'option-item';

            const input = document.createElement('input');
            input.className = 'input input-narrow';
            input.type = 'text';
            input.value = opt;

            const iconBtn = document.createElement('button');
            iconBtn.className = 'material-icons remove-icon';
            iconBtn.textContent = 'close';

            // --- NEW: Change icon on input ---
            input.addEventListener('input', () => {
                iconBtn.className = "material-icons add-icon"
                iconBtn.textContent = 'check'; // Changes 'close' to 'check' (tick)

                // Update the underlying data array
                options[index] = input.value;
            });

            // --- Handle Button Click ---
            iconBtn.addEventListener('click', () => {
                if (iconBtn.textContent === 'check') {
                    UpdateAllStorage();
                    iconBtn.textContent = 'close'; 
                    iconBtn.style.color = 'red';
                } else {
                    // If it's a cross, remove the item
                    options.splice(index, 1);
                    renderOptions(container, options);
                    UpdateAllStorage();
                }
            });

            div.appendChild(input);
            div.appendChild(iconBtn);
            container.appendChild(div);
        });
    }
    /*function renderOptions(container, options)
    {
        container.innerHTML = '';
        options.forEach(opt => {
            container.innerHTML = '';
            options.forEach((opt, index) => {
                const div = document.createElement('div');
                div.className = 'option-item';

                const input = document.createElement('input');
                input.className = 'input input-narrow';
                input.type = 'text';
                input.value = opt;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'material-icons remove-icon';
                removeBtn.textContent = 'close';
                removeBtn.addEventListener('click', () => {
                    options.splice(index, 1);
                    renderOptions(container, options);
                    UpdateAllStorage();
                });

                div.appendChild(input);
                div.appendChild(removeBtn);
                container.appendChild(div);
            });
        });
    }*/

    /**
     * Generic helper to check storage or initialize with defaults
     */
    async function getOrInitStorageItem(key, defaultValue) {
        try {
            const stored = await chrome.storage.sync.get(key);
            if (!stored[key]) {
                await chrome.storage.sync.set({ [key]: defaultValue });
                return defaultValue;
            }
            return stored[key];
        } catch (error) {
            console.error(`Error accessing storage for key "${key}":`, error);
            return defaultValue; // fallback to default if storage fails
        }
    }

    async function UpdateStorage(container, storageKey) {
        try {
            // Collect all input values
            const updatedOptions = Array.from(container.querySelectorAll('input'))
                .map(input => input.value.trim())
                .filter(v => v !== '');

            // Save to storage with dynamic key
            await chrome.storage.sync.set({ [storageKey]: updatedOptions });
            console.log(`Storage updated for key "${storageKey}"`, updatedOptions);
        } catch (error) {
            console.error(`Failed to update storage for key "${storageKey}":`, error);
        }
    }


});