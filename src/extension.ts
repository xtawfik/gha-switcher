import * as vscode from 'vscode';
import * as cp from 'child_process';

type SavedGithubAccount = {
  label: string;          // e.g., "Personal", "Client"
  accountLabel: string;   // e.g., "you@example.com"
  sessionId: string;      // vscode auth session id
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
        sessionId: session.id
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

      // Rehydrate the session to get a fresh token
      const session = await vscode.authentication.getSession('github', scopes, {
        createIfNone: false, forceNewSession: false, silent: true
      });
      // If VS Code returned a different active session, try to retrieve by id:
      let activeSession = session;
      if (!activeSession || activeSession.id !== chosen.sessionId) {
        // getSession() doesn't fetch by id; request a new session and let the account picker show
        activeSession = await vscode.authentication.getSession('github', scopes, {
          createIfNone: false, forceNewSession: true, silent: false
        });
      }
      if (!activeSession) {
        vscode.window.showErrorMessage('Could not obtain GitHub session/token.');
        return;
      }

      // Pipe token to gh
      await new Promise<void>((resolve, reject) => {
        const child = cp.spawn(ghBin, ['auth', 'login', '--hostname', 'github.com', '--with-token'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        child.stdin.write(activeSession.accessToken + '\n');
        child.stdin.end();
        child.on('close', code => code === 0 ? resolve() : reject(new Error(`gh exited with ${code}`)));
      });

      vscode.window.showInformationMessage(`gh is now authenticated as: ${activeSession.account.label}`);
    } catch (error) {
      vscode.window.showErrorMessage(`GitHub authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }));

  ctx.subscriptions.push(...disposables);
}

export function deactivate() {}

async function getSavedAccounts(ctx: vscode.ExtensionContext): Promise<SavedGithubAccount[]> {
  const raw = await ctx.secrets.get(SAVED_ACCOUNTS_SECRET);
  return raw ? JSON.parse(raw) as SavedGithubAccount[] : [];
}
