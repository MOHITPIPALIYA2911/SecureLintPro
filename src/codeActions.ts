import * as vscode from "vscode";

function ensureImportOs(edit: vscode.WorkspaceEdit, doc: vscode.TextDocument) {
  if (doc.languageId !== "python") return;
  const text = doc.getText();
  const hasImport = /(^|\n)\s*import\s+os(\s|$)/m.test(text);
  if (!hasImport) {
    edit.insert(doc.uri, new vscode.Position(0, 0), "import os\n");
  }
}

export class SecureLintProCodeActions implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    doc: vscode.TextDocument,
    range: vscode.Range,
    ctx: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const fixes: vscode.CodeAction[] = [];
    const seen = new Set<string>(); // de-dupe multiple diagnostics on same span

    for (const diag of ctx.diagnostics) {
      if (diag.source !== "SecureLint Pro") continue;

      const id  = String((diag as any).code ?? "");
      const msg = String(diag.message ?? "");

      // Build a key based on range + normalized kind
      const isSecret = /hardcoded|secret/i.test(msg) || /secret/i.test(id);
      const isAuth   = /missing\s*auth|lacks authorization/i.test(msg) || /auth/i.test(id);
      const kind = isSecret ? "secret" : isAuth ? "auth" : "other";
      const key = `${diag.range.start.line}:${diag.range.start.character}:${diag.range.end.line}:${diag.range.end.character}:${kind}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // ---------- Secret quick fix ----------
      if (isSecret) {
        const fix = new vscode.CodeAction("Replace with environment variable", vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diag];
        fix.isPreferred = true;

        const edit = new vscode.WorkspaceEdit();
        if (doc.languageId === "python") {
          ensureImportOs(edit, doc);
          edit.replace(doc.uri, diag.range, 'os.getenv("SECURELINTPRO_SECRET")');
        } else {
          // JS/TS
          edit.replace(doc.uri, diag.range, "process.env.SECURELINTPRO_SECRET");
        }

        fix.edit = edit;
        fixes.push(fix);
      }

      // ---------- Missing auth quick fix ----------
      if (isAuth) {
        if (doc.languageId === "python") {
          const fix = new vscode.CodeAction("Add @login_required", vscode.CodeActionKind.QuickFix);
          fix.diagnostics = [diag];

          const edit = new vscode.WorkspaceEdit();
          // Insert decorator above the line start of the current range
          const lineStart = new vscode.Position(range.start.line, 0);
          edit.insert(doc.uri, lineStart, "@login_required\n");

          // Ensure import exists
          const text = doc.getText();
          if (!/from\s+flask_login\s+import\s+login_required/m.test(text)) {
            edit.insert(doc.uri, new vscode.Position(0, 0), "from flask_login import login_required\n");
          }

          fix.edit = edit;
          fixes.push(fix);
        } else {
          // JS/TS: try to insert requireAuth into the route arg list
          const fix = new vscode.CodeAction("Insert requireAuth middleware", vscode.CodeActionKind.QuickFix);
          fix.diagnostics = [diag];

          const edit = new vscode.WorkspaceEdit();
          const lineText = doc.lineAt(range.start.line).text;
          const firstComma = lineText.indexOf(",");
          if (firstComma >= 0) {
            const pos = new vscode.Position(range.start.line, firstComma + 1);
            edit.insert(doc.uri, pos, " requireAuth,");
          } else {
            // fallback: prepend token at line start
            edit.insert(doc.uri, new vscode.Position(range.start.line, 0), "requireAuth, ");
          }

          fix.edit = edit;
          fixes.push(fix);
        }
      }
    }

    return fixes;
  }
}
