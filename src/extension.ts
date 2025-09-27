
import * as vscode from "vscode";
import { runSemgrep } from "./scanner";
import { toDiagnostics } from "./diagnostics";
import { SecureLintProCodeActions } from "./codeActions";

export function activate(ctx: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection("securelint-pro");
  ctx.subscriptions.push(collection);

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = "SecureLint Pro: Ready";
  status.tooltip = "Semgrep-powered checks";
  status.command = "securelintPro.scanActiveFile";
  status.show();
  ctx.subscriptions.push(status);

  const scan = async (doc?: vscode.TextDocument) => {
    const target = doc ?? vscode.window.activeTextEditor?.document;
    if (!target) return;
    if (!["javascript", "typescript", "python"].includes(target.languageId)) return;
    const cfg = vscode.workspace.getConfiguration("securelintPro");
    const rules = (cfg.get<string>("rulesFolder") || ctx.asAbsolutePath("rules"))
      .replace("${extensionPath}", ctx.extensionPath);
    const semgrepPath = cfg.get<string>("semgrepPath") || "semgrep";
    status.text = "SecureLint Pro: Scanning…";
    try {
      const findings = await runSemgrep(target, rules, semgrepPath);
      const diags = toDiagnostics(target, findings);
      collection.set(target.uri, diags);
      status.text = `SecureLint Pro: ${findings.length} finding(s)`;
    } catch (e) {
      console.error(e);
      status.text = "SecureLint Pro: Scan failed";
      vscode.window.showErrorMessage(`SecureLint Pro: ${e}`);
    }
  };

  ctx.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((d) => scan(d)),
    vscode.workspace.onDidSaveTextDocument((d) => scan(d)),
    vscode.window.onDidChangeActiveTextEditor(() => scan()),
    vscode.languages.registerCodeActionsProvider(
      [{ language: "javascript" }, { language: "typescript" }, { language: "python" }],
      new SecureLintProCodeActions(),
      { providedCodeActionKinds: SecureLintProCodeActions.providedCodeActionKinds }
    ),
    vscode.commands.registerCommand("securelintPro.explainFinding", () => {
      vscode.window.showInformationMessage(
        "SecureLint Pro explains: Secrets should be stored in environment variables; routes must enforce auth."
      );
    }),
    vscode.commands.registerCommand("securelintPro.scanActiveFile", () => scan())
  );

  if (vscode.window.activeTextEditor) {
    scan(vscode.window.activeTextEditor.document);
  }
}

export function deactivate() {}
