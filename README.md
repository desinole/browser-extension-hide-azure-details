# Hide Azure Subscription Details

A Chrome/Edge browser extension that blurs Azure subscription IDs and names on Azure portal pages. Hover over blurred text to reveal it.

## Features

- Automatically blurs subscription IDs (GUIDs) on Azure portal pages
- Blurs subscription name fields adjacent to "Subscription" labels
- Hover to temporarily reveal blurred content
- Toggle on/off via the extension popup
- Works with Azure portal's SPA navigation (observes DOM changes)

## Installation (Local / Unpacked)

### Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `browser-extension-hide-azure-details` folder
5. The extension icon will appear in your toolbar

### Microsoft Edge

1. Open Edge and navigate to `edge://extensions`
2. Enable **Developer mode** (toggle in the left sidebar)
3. Click **Load unpacked**
4. Select the `browser-extension-hide-azure-details` folder
5. The extension icon will appear in your toolbar

## Usage

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Subscription IDs and names are automatically blurred
3. **Hover** over any blurred text to reveal it
4. Click the extension icon in the toolbar to **toggle** blurring on/off
