# Hide Azure Subscription Details

A Chrome/Edge browser extension that blurs Azure subscription IDs and names on Azure portal pages including resource detail pages rendered in sandboxed iframes.

## Features

- Automatically blurs subscription IDs (GUIDs) on Azure portal pages
- Blurs subscription name values next to "Subscription" labels
- Works on the home page **and** resource detail pages
- Toggle on/off via the extension popup
- Works with Azure portal's SPA navigation (observes DOM changes)

## Installation

### Step 1 — Download

[⬇ Download the extension zip](https://github.com/desinole/browser-extension-hide-azure-details/raw/main/download/hide-azure-subscription-details.zip)

Extract the zip to a folder on your computer.

### Step 2 — Load in your browser

#### Microsoft Edge

1. Open Edge and go to `edge://extensions`
2. Enable **Developer mode** (toggle in the bottom-left)
3. Click **Load unpacked**
4. Select the extracted/cloned folder (the one containing `manifest.json`)
5. The 🔒 icon will appear in your toolbar

#### Google Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the extracted/cloned folder (the one containing `manifest.json`)
5. The 🔒 icon will appear in your toolbar

## Usage

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Subscription IDs and names are automatically blurred
3. Click the extension icon in the toolbar to **toggle** blurring on/off

## How It Works

Azure portal renders resource detail pages inside **sandboxed iframes**, which normally block browser extension content scripts. This extension uses a three-layer approach:

1. **`strip-sandbox.js`** — Runs in the page's JavaScript context (`MAIN` world) at `document_start` to intercept and prevent the `sandbox` attribute from being applied to iframes. This allows content scripts to inject into those frames.
2. **`styles.css`** — Pure CSS rules that blur elements with `aria-label` starting with "Subscription" — works as soon as the stylesheet is injected.
3. **`content.js`** — Detects subscription GUIDs in text nodes, finds "Subscription" labels and blurs their adjacent value containers, and scans for Azure billing asset references.
