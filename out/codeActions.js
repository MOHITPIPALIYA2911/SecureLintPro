"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureLintProCodeActions = void 0;
const vscode = __importStar(require("vscode"));
function ensureImportOs(edit, doc) {
    if (doc.languageId !== "python")
        return;
    const text = doc.getText();
    const hasImport = /(^|\n)\s*import\s+os(\s|$)/m.test(text);
    if (!hasImport) {
        edit.insert(doc.uri, new vscode.Position(0, 0), "import os\n");
    }
}
class SecureLintProCodeActions {
    provideCodeActions(doc, range, ctx) {
        const fixes = [];
        const seen = new Set(); // de-dupe multiple diagnostics on same span
        for (const diag of ctx.diagnostics) {
            if (diag.source !== "SecureLint Pro")
                continue;
            const id = String(diag.code ?? "");
            const msg = String(diag.message ?? "");
            // Build a key based on range + normalized kind
            const isSecret = /hardcoded|secret/i.test(msg) || /secret/i.test(id);
            const isAuth = /missing\s*auth|lacks authorization/i.test(msg) || /auth/i.test(id);
            const kind = isSecret ? "secret" : isAuth ? "auth" : "other";
            const key = `${diag.range.start.line}:${diag.range.start.character}:${diag.range.end.line}:${diag.range.end.character}:${kind}`;
            if (seen.has(key))
                continue;
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
                }
                else {
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
                }
                else {
                    // JS/TS: try to insert requireAuth into the route arg list
                    const fix = new vscode.CodeAction("Insert requireAuth middleware", vscode.CodeActionKind.QuickFix);
                    fix.diagnostics = [diag];
                    const edit = new vscode.WorkspaceEdit();
                    const lineText = doc.lineAt(range.start.line).text;
                    const firstComma = lineText.indexOf(",");
                    if (firstComma >= 0) {
                        const pos = new vscode.Position(range.start.line, firstComma + 1);
                        edit.insert(doc.uri, pos, " requireAuth,");
                    }
                    else {
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
exports.SecureLintProCodeActions = SecureLintProCodeActions;
SecureLintProCodeActions.providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
//# sourceMappingURL=codeActions.js.map