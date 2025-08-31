# GitHub Accounts Switcher

A VS Code extension that allows you to switch between multiple GitHub accounts seamlessly.

## Features

### GitHub Account Management
- **Multiple Accounts**: Store multiple GitHub accounts (Personal, Client, etc.)
- **Secure Storage**: Uses VS Code's built-in authentication and secret storage
- **gh CLI Integration**: Automatically switches GitHub CLI authentication
- **Token Management**: Handles OAuth tokens securely without storing them

## Installation

1. Install the extension from the VS Code marketplace
2. Ensure you have the GitHub CLI (`gh`) installed
3. Install the GitHub Pull Requests and Issues extension

## Configuration

### GitHub Account Settings

Configure your GitHub account settings in VS Code:

```json
{
  "ghaSwitcher.githubScopes": ["repo", "read:org", "gist", "workflow"],
  "ghaSwitcher.ghPath": "gh"
}
```

## Usage

### Commands

1. **GHA Switcher: Add GitHub Account**
   - Adds a new GitHub account or refreshes existing ones
   - Prompts for a label (e.g., "Personal", "Client")
   - Uses VS Code's built-in GitHub authentication

2. **GHA Switcher: Switch GitHub Account**
   - Switches the active GitHub CLI authentication
   - Select from saved accounts
   - Automatically updates `gh` authentication

### Workflow

1. **Setup**:
   - Install the GitHub Pull Requests and Issues extension
   - Add GitHub accounts using "GHA Switcher: Add GitHub Account"

2. **Daily Use**:
   - Use "GHA Switcher: Switch GitHub Account" to switch gh CLI auth
   - Your GitHub CLI will automatically use the selected account

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `ghaSwitcher.githubScopes` | OAuth scopes for GitHub | `["repo", "read:org", "gist", "workflow"]` |
| `ghaSwitcher.ghPath` | Path to GitHub CLI | `gh` |

## Requirements

- VS Code 1.87.0 or higher
- GitHub CLI (`gh`) installed
- GitHub Pull Requests and Issues extension

## Security

- GitHub tokens are managed by VS Code's built-in authentication
- All sensitive data is stored in VS Code's secure storage
- No network requests are made outside of VS Code's authentication flow

## Troubleshooting

### GitHub Authentication Issues
- Make sure GitHub CLI is installed and accessible
- Check that the GitHub Authentication extension is enabled
- Verify OAuth scopes are sufficient for your needs

### Command Execution Issues
- Check that paths in settings are correct
- Ensure shell environment is properly configured
- Verify that required binaries are accessible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
