# Hide Fields — Browser Extension

A Chrome/Edge browser extension that lets you right-click any element on any website to blur it. Hidden fields are remembered per-domain across visits.

## Features

- **Right-click to hide** — Select any element on any page and blur it via the context menu
- **Persistent per-domain** — Hidden fields are saved and automatically blurred on future visits
- **Manage hidden fields** — View, remove, or clear all hidden fields from the extension popup
- **Works on any website** — Not limited to specific domains

## Installation

### Step 1 — Get the extension files

Clone this repository or download it as a zip from GitHub:

```sh
git clone https://github.com/desinole/browser-extension-hide-azure-details.git
```

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

1. Navigate to any website
2. **Right-click** any element you want to hide
3. Select **"Hide this field"** from the context menu
4. The element is immediately blurred and will stay blurred on future visits
5. Click the 🔒 extension icon to manage hidden fields — remove individual fields or clear all for the current site

## How It Works

1. **`background.js`** — Registers the "Hide this field" context menu item and forwards clicks to the content script.
2. **`selector-generator.js`** — Generates a unique CSS selector for the right-clicked element using tag names, classes, IDs, and positional selectors.
3. **`custom-hide.js`** — Applies a blur filter to stored selectors on page load, watches for dynamically added content via `MutationObserver`, and handles the context menu message to blur and save new fields.
