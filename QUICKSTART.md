# Quick Start Guide

Get up and running with GitHub Accounts Switcher in 5 minutes!

## Prerequisites

- VS Code or Cursor
- GitHub CLI (`gh`) installed
- GitHub Pull Requests and Issues extension enabled

## 1. Install the Extension

1. Download the `.vsix` file from the releases
2. In VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Select the downloaded file

## 2. Add GitHub Accounts

1. `Ctrl+Shift+P` → "GHA Switcher: Add GitHub Account"
2. Enter a label (e.g., "Personal")
3. Sign in to GitHub
4. Repeat for additional accounts

## 3. Use the Extension

### Switch GitHub Account
- `Ctrl+Shift+P` → "GHA Switcher: Switch GitHub Account"
- Choose your account
- **Smart switching**: Only re-authenticates when necessary
- `gh` CLI will now use the selected account

### Refresh Account Token (Optional)
- `Ctrl+Shift+P` → "GHA Switcher: Refresh Account Token"
- Choose account to refresh
- Useful when tokens expire

## That's it! 

You can now seamlessly switch between different GitHub accounts directly from VS Code.

## Troubleshooting

- **gh not found**: Install GitHub CLI or update the path in settings
- **Authentication failed**: Run "GHA Switcher: Add GitHub Account" again

## Next Steps

- Check the full [README.md](README.md) for advanced configuration
- Customize GitHub OAuth scopes for your needs
