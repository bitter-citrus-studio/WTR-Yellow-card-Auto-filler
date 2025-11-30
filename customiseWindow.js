document.addEventListener('DOMContentLoaded', async () => {

    const conditionsContainer = document.getElementById("conditionsContainer");
    const patternsContainer = document.getElementById("patternsContainer");
    const saveBtn = document.getElementById("saveBtn");
    const addConditionBtn = document.getElementById("addConditionBtn");
    const addPatternBtn = document.getElementById("addPatternBtn");
    const newConditionInput = document.getElementById("newConditionOptionInput");
    const newPatternInput = document.getElementById("newPatternOptionInput");
    const saveMessage = document.getElementById("saveMessage");

    // 1️⃣ Load saved options, or initialize defaults
    let conditions = await getOrInitStorageItem('conditions', ['Dry, dry pitch', 'Dry but slippery ball', 'Wet with a slippery ball', 'Dry but windy']);
    let patterns = await getOrInitStorageItem('patterns', ['Even and well Contested game', 'Huge score difference, one team better than the other', 'Tight game with a few scuffles']);
    // 2️⃣ Render the list in the UI
    renderOptions(conditionsContainer, conditions);
    renderOptions(patternsContainer, patterns);

    // 3️⃣ Add new option
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

    /**
     * Helper function to render the list visually
     */
    function renderOptions(container, options) {
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
                removeBtn.textContent = 'close'; // Material icon name
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
    }

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