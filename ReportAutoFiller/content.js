// content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "getSelectOptions") {
        const select = document.querySelector('select#team_index_key'); // or use a specific selector
        if (!select) {
            console.log("No <select> found on page");
            sendResponse({ options: [] });
            return true; // keep the message channel open
        }

        const options = Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text
        }));

        console.log("Extracted options:", options);
        sendResponse({ options });
        return true;
    }
});
