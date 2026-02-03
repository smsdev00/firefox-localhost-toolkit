# localhost-toolkit

A Firefox extension that provides essential developer tools for local web development. Modify HTTP requests and responses for localhost with an easy-to-use interface.

## Features

- **Cache Disable** - Force browser to fetch fresh resources by injecting no-cache headers
- **CORS Bypass** - Inject permissive CORS headers to bypass cross-origin restrictions
- **CSP Disable** - Remove Content-Security-Policy headers that block inline scripts
- **Network Delay** - Add artificial latency to test loading states and slow connections

## Installation

### Temporary (Development)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this project

### Permanent

#### Option 1: Firefox Developer Edition
1. Install [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/)
2. Navigate to `about:config`
3. Set `xpinstall.signatures.required` to `false`
4. Install the extension via `about:addons`

#### Option 2: Mozilla Add-ons (AMO)
Submit the extension to [addons.mozilla.org](https://addons.mozilla.org) for signing and public distribution.

## Usage

Click the extension icon in the toolbar to open the popup interface.

### Cache Tab
Add localhost ports where you want to disable browser caching. Useful when developing and you need to see changes immediately without hard-refreshing.

### CORS Tab
1. Toggle the switch to enable CORS bypass
2. Add the ports of your backend API servers
3. The extension will inject permissive `Access-Control-Allow-*` headers

### CSP Tab
1. Toggle the switch to enable CSP removal
2. Add ports where CSP headers should be stripped
3. Useful for debugging when CSP blocks inline scripts or eval()

### Delay Tab
1. Toggle the switch to enable network delay
2. Set the delay in milliseconds (e.g., 2000 for 2 seconds)
3. Add ports where delay should be applied
4. Test loading spinners, skeletons, and timeout handling

## How It Works

The extension uses Firefox's `webRequest` API to intercept HTTP requests and responses for `localhost` and `127.0.0.1`.

| Feature | Mechanism |
|---------|-----------|
| Cache | Injects `Cache-Control: no-cache, no-store, must-revalidate` headers |
| CORS | Adds `Access-Control-Allow-Origin: *` and related headers |
| CSP | Removes `Content-Security-Policy` and related headers |
| Delay | Blocks request completion using a Promise with setTimeout |

## Permissions

- `webRequest` / `webRequestBlocking` - Intercept and modify requests
- `storage` - Save configuration between sessions
- `host_permissions` - Access to localhost URLs

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/localhost-toolkit.git

# Load in Firefox
# 1. Open about:debugging
# 2. Load Temporary Add-on
# 3. Select manifest.json
```

## Project Structure

```
localhost-toolkit/
├── manifest.json      # Extension manifest (MV3)
├── background.js      # Request interception logic
├── popup.html         # Extension popup UI
├── popup.js           # Popup interaction handlers
└── icons/
    └── icon.svg       # Extension icon
```

## License

MIT
