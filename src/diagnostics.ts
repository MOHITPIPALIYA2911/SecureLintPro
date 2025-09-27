import * as vscode from "vscode";
import { SemgrepFinding } from "./scanner";

export function toDiagnostics(doc: vscode.TextDocument, findings: SemgrepFinding[]) {
  const diags: vscode.Diagnostic[] = [];
  for (const f of findings) {
    const start = new vscode.Position(Math.max(0, f.start.line - 1), Math.max(0, f.start.col - 1));
    const end   = new vscode.Position(Math.max(0, f.end.line - 1),   Math.max(0, f.end.col - 1));
    const sev = (f.extra.severity || "WARNING").toLowerCase() === "error"
      ? vscode.DiagnosticSeverity.Error
      : vscode.DiagnosticSeverity.Warning;

    const d = new vscode.Diagnostic(new vscode.Range(start, end), `[${f.check_id}] ${f.extra.message}`, sev);
    d.source = "SecureLint Pro";
    d.code = f.check_id as any;             
    diags.push(d);
  }
  return diags;
}
