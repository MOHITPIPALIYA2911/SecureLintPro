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
exports.toDiagnostics = toDiagnostics;
const vscode = __importStar(require("vscode"));
function toDiagnostics(doc, findings) {
    const diags = [];
    for (const f of findings) {
        const start = new vscode.Position(Math.max(0, f.start.line - 1), Math.max(0, f.start.col - 1));
        const end = new vscode.Position(Math.max(0, f.end.line - 1), Math.max(0, f.end.col - 1));
        const sev = (f.extra.severity || "WARNING").toLowerCase() === "error"
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning;
        const d = new vscode.Diagnostic(new vscode.Range(start, end), `[${f.check_id}] ${f.extra.message}`, sev);
        d.source = "SecureLint Pro";
        d.code = f.check_id;
        diags.push(d);
    }
    return diags;
}
//# sourceMappingURL=diagnostics.js.map