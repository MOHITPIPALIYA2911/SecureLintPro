
import * as cp from "child_process";
import * as vscode from "vscode";
import * as path from "path";

export type SemgrepFinding = {
  check_id: string;
  extra: { message: string; severity: string };
  path: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
};

function safeParseJson(maybe: string): any {
  if (!maybe) return {};
  const first = maybe.indexOf("{");
  const last = maybe.lastIndexOf("}");
  const slice = first >= 0 && last >= first ? maybe.slice(first, last + 1) : maybe;
  try {
    return JSON.parse(slice);
  } catch {
    return {};
  }
}

export async function runSemgrep(
  doc: vscode.TextDocument,
  rulesFolder: string,
  semgrepPath: string
): Promise<SemgrepFinding[]> {
  if (doc.isDirty) await doc.save();
  const file = doc.fileName;
  return new Promise((resolve, reject) => {
    const cmd = `"${semgrepPath}" --json --quiet --config "${rulesFolder}" "${file}"`;
    const opts: cp.ExecOptions = {
      cwd: path.dirname(file),
      env: { ...process.env, SEMGREP_DISABLE_VERSION_CHECK: "1", SEMGREP_COLOR: "never" }
    };
    cp.exec(cmd, opts, (err, stdout, stderr) => {
      const outStr = (stdout as any ?? "").toString();
      const errStr = (stderr as any ?? "").toString();
      try {
        const out = safeParseJson(outStr);
        const findings = (out?.results || []).map((r: any) => ({
          check_id: r.check_id,
          extra: { message: r.extra?.message, severity: r.extra?.severity || "WARNING" },
          path: r.path,
          start: { line: r.start?.line || 1, col: r.start?.col || 1 },
          end: { line: r.end?.line || r.start?.line || 1, col: r.end?.col || r.start?.col || 1 }
        }));
        resolve(findings);
      } catch (e) {
        if (errStr) {
          reject(new Error(errStr));
        } else {
          resolve([]);
        }
      }
    });
  });
}
