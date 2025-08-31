import * as vscode from 'vscode';
import * as cp from 'child_process';

type SavedGithubAccount = {
  label: string;          // e.g., "Personal", "Client"
  accountLabel: string;   // e.g., "you@example.com"
  accessToken: string;    // GitHub access token
  tokenExpiry?: number;   // Token expiry timestamp (optional)
};

const GH_SCOPES_KEY = 'ghaSwitcher.githubScopes';
const GH_BIN_KEY = 'ghaSwitcher.ghPath';
const SAVED_ACCOUNTS_SECRET = 'ghaSwitcher.savedGithubAccounts';

export async function activate(ctx: vscode.ExtensionContext) {
  const disposables: vscode.Disposable[] = [];

  // ---- GitHub Account Management ----
  disposables.push(vscode.commands.registerCommand('ghaSwitcher.addAccount', async () => {
    try {
      const config = vscode.workspace.getConfiguration();
      const scopes = config.get<string[]>(GH_SCOPES_KEY) ?? ['repo'];

      // Check if GitHub authentication is available
      if (!vscode.authentication.getSession) {
        vscode.window.showErrorMessage('GitHub authentication not available. Please install the GitHub Authentication extension.');
        return;
      }

      // Ask for a label to distinguish accounts (e.g., Personal / Client)
      const label = await vscode.window.showInputBox({
        prompt: 'Label this GitHub account (e.g., Personal, Client)',
        placeHolder: 'Personal'
      });
      if (!label) return;

      // Force new session so you can add multiple accounts
      const session = await vscode.authentication.getSession(
        'github',
        scopes,
        { forceNewSession: true, silent: false }
      );

      const accounts = await getSavedAccounts(ctx);
      accounts.push({
        label,
        accountLabel: session.account.label,
        accessToken: session.accessToken,
        tokenExpiry: Date.now() + (60 * 60 * 1000) // Assume 1 hour expiry
      });
      await ctx.secrets.store(SAVED_ACCOUNTS_SECRET, JSON.stringify(accounts));

      vscode.window.showInformationMessage(`GitHub account saved: ${label} (${session.account.label})`);
    } catch (error) {
      vscode.window.showErrorMessage(`GitHub authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }));

  disposables.push(vscode.commands.registerCommand('ghaSwitcher.switchAccount', async () => {
    try {
      const config = vscode.workspace.getConfiguration();
      const ghBin = config.get<string>(GH_BIN_KEY, 'gh');
      const scopes = config.get<string[]>(GH_SCOPES_KEY) ?? ['repo'];

      // Check if GitHub authentication is available
      if (!vscode.authentication.getSession) {
        vscode.window.showErrorMessage('GitHub authentication not available. Please install the GitHub Authentication extension.');
        return;
      }

      const accounts = await getSavedAccounts(ctx);
      if (!accounts.length) {
        vscode.window.showWarningMessage('No saved GitHub accounts. Run "GitHub: Add/Refresh Account" first.');
        return;
      }

      const pick = await vscode.window.showQuickPick(
        accounts.map(a => `${a.label} (${a.accountLabel})`),
        { placeHolder: 'Select the GitHub account to activate for gh/API' }
      );
      if (!pick) return;

      const chosen = accounts.find(a => `${a.label} (${a.accountLabel})` === pick)!;

      // Check if the stored token is still valid
      if (chosen.tokenExpiry && Date.now() > chosen.tokenExpiry) {
        const action = await vscode.window.showInformationMessage(
          `Token for account "${chosen.label}" has expired. Would you like to refresh it?`,
          'Refresh Token', 'Cancel'
        );
        
        if (action === 'Refresh Token') {
          // Force new session to refresh the token
          const session = await vscode.authentication.getSession('github', scopes, {
            forceNewSession: true, silent: false
          });
          
          if (session) {
            // Update the saved account with new token
            const accountIndex = accounts.findIndex(a => a.label === chosen.label);
            if (accountIndex !== -1) {
              accounts[accountIndex].accessToken = session.accessToken;
              accounts[accountIndex].tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
              await ctx.secrets.store(SAVED_ACCOUNTS_SECRET, JSON.stringify(accounts));
            }
            // Use the new token
            chosen.accessToken = session.accessToken;
          } else {
            vscode.window.showErrorMessage('Failed to refresh token.');
            return;
          }
        } else {
          return; // User cancelled
        }
      }

      // Use the stored token directly
      const token = chosen.accessToken;

      // Pipe token to gh
      await new Promise<void>((resolve, reject) => {
        const child = cp.spawn(ghBin, ['auth', 'login', '--hostname', 'github.com', '--with-token'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        child.stdin.write(token + '\n');
        child.stdin.end();
        child.on('close', code => code === 0 ? resolve() : reject(new Error(`gh exited with ${code}`)));
      });

      vscode.window.showInformationMessage(`gh is now authenticated as: ${chosen.accountLabel}`);
    } catch (error) {
      vscode.window.showErrorMessage(`GitHub authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }));

  disposables.push(vscode.commands.registerCommand('ghaSwitcher.refreshAccount', async () => {
    try {
      const config = vscode.workspace.getConfiguration();
      const scopes = config.get<string[]>(GH_SCOPES_KEY) ?? ['repo'];

      // Check if GitHub authentication is available
      if (!vscode.authentication.getSession) {
        vscode.window.showErrorMessage('GitHub authentication not available. Please install the GitHub Authentication extension.');
        return;
      }

      const accounts = await getSavedAccounts(ctx);
      if (!accounts.length) {
        vscode.window.showWarningMessage('No saved GitHub accounts. Run "GHA Switcher: Add GitHub Account" first.');
        return;
      }

      const pick = await vscode.window.showQuickPick(
        accounts.map(a => `${a.label} (${a.accountLabel})`),
        { placeHolder: 'Select the GitHub account to refresh' }
      );
      if (!pick) return;

      const chosen = accounts.find(a => `${a.label} (${a.accountLabel})` === pick)!;

      // Force new session to refresh the token
      const session = await vscode.authentication.getSession('github', scopes, {
        forceNewSession: true, silent: false
      });

      if (session) {
        // Update the saved account with new token
        const accountIndex = accounts.findIndex(a => a.label === chosen.label);
        if (accountIndex !== -1) {
          accounts[accountIndex].accessToken = session.accessToken;
          accounts[accountIndex].tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
          await ctx.secrets.store(SAVED_ACCOUNTS_SECRET, JSON.stringify(accounts));
          vscode.window.showInformationMessage(`Account "${chosen.label}" token refreshed successfully.`);
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to refresh account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }));

  ctx.subscriptions.push(...disposables);
}

export function deactivate() {}

async function getSavedAccounts(ctx: vscode.ExtensionContext): Promise<SavedGithubAccount[]> {
  const raw = await ctx.secrets.get(SAVED_ACCOUNTS_SECRET);
  return raw ? JSON.parse(raw) as SavedGithubAccount[] : [];
}
