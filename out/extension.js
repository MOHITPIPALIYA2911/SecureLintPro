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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const scanner_1 = require("./scanner");
const diagnostics_1 = require("./diagnostics");
const codeActions_1 = require("./codeActions");
function activate(ctx) {
    const collection = vscode.languages.createDiagnosticCollection("securelint-pro");
    ctx.subscriptions.push(collection);
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    status.text = "SecureLint Pro: Ready";
    status.tooltip = "Semgrep-powered checks";
    status.command = "securelintPro.scanActiveFile";
    status.show();
    ctx.subscriptions.push(status);
    const scan = async (doc) => {
        const target = doc ?? vscode.window.activeTextEditor?.document;
        if (!target)
            return;
        if (!["javascript", "typescript", "python"].includes(target.languageId))
            return;
        const cfg = vscode.workspace.getConfiguration("securelintPro");
        const rules = (cfg.get("rulesFolder") || ctx.asAbsolutePath("rules"))
            .replace("${extensionPath}", ctx.extensionPath);
        const semgrepPath = cfg.get("semgrepPath") || "semgrep";
        status.text = "SecureLint Pro: Scanning…";
        try {
            const findings = await (0, scanner_1.runSemgrep)(target, rules, semgrepPath);
            const diags = (0, diagnostics_1.toDiagnostics)(target, findings);
            collection.set(target.uri, diags);
            status.text = `SecureLint Pro: ${findings.length} finding(s)`;
        }
        catch (e) {
            console.error(e);
            status.text = "SecureLint Pro: Scan failed";
            vscode.window.showErrorMessage(`SecureLint Pro: ${e}`);
        }
    };
    ctx.subscriptions.push(vscode.workspace.onDidOpenTextDocument((d) => scan(d)), vscode.workspace.onDidSaveTextDocument((d) => scan(d)), vscode.window.onDidChangeActiveTextEditor(() => scan()), vscode.languages.registerCodeActionsProvider([{ language: "javascript" }, { language: "typescript" }, { language: "python" }], new codeActions_1.SecureLintProCodeActions(), { providedCodeActionKinds: codeActions_1.SecureLintProCodeActions.providedCodeActionKinds }), vscode.commands.registerCommand("securelintPro.explainFinding", () => {
        vscode.window.showInformationMessage("SecureLint Pro explains: Secrets should be stored in environment variables; routes must enforce auth.");
    }), vscode.commands.registerCommand("securelintPro.scanActiveFile", () => scan()));
    if (vscode.window.activeTextEditor) {
        scan(vscode.window.activeTextEditor.document);
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map