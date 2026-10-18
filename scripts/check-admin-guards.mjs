// Fails if any admin page, Server Action or Route Handler skips its role check.
// Runs as part of `npm run lint`.
//
//   page.tsx            → must `await requireAdmin(...)` somewhere
//   "use server" files  → every exported function's FIRST statement must
//                         await requireAdminAction()
//   inline "use server" → same rule for that function
//   route.ts            → every exported HTTP handler's first statement must
//                         await requireAdminAction()
//
// Scope: src/app/admin/** and src/app/api/admin/**.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOTS = ["src/app/admin", "src/app/api/admin"];
const HTTP = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const problems = [];

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx)$/.test(name)) yield path;
  }
}

const isDirective = (stmt, text) =>
  ts.isExpressionStatement(stmt) &&
  ts.isStringLiteral(stmt.expression) &&
  stmt.expression.text === text;

// `await requireAdminAction()` or `const x = await requireAdminAction()`.
function startsWithGuard(body) {
  if (!body || !ts.isBlock(body)) return false;
  const statements = body.statements.filter((s) => !isDirective(s, "use server"));
  const first = statements[0];
  if (!first) return false;
  let expr;
  if (ts.isExpressionStatement(first)) expr = first.expression;
  else if (ts.isVariableStatement(first)) {
    expr = first.declarationList.declarations[0]?.initializer;
  }
  return Boolean(
    expr &&
      ts.isAwaitExpression(expr) &&
      ts.isCallExpression(expr.expression) &&
      ts.isIdentifier(expr.expression.expression) &&
      expr.expression.expression.text === "requireAdminAction",
  );
}

const hasExport = (node) =>
  node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

function functionName(node) {
  return node.name?.getText() ?? "(anonymous)";
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = relative(process.cwd(), file);
    const text = readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const fileIsServer = source.statements.some((s) => isDirective(s, "use server"));
    const isRoute = /(^|\/)route\.tsx?$/.test(file);
    const isPage = /(^|\/)page\.tsx?$/.test(file);

    if (isPage && !/await\s+requireAdmin\(/.test(text)) {
      problems.push(`${rel}: page never awaits requireAdmin()`);
    }

    const visit = (node) => {
      const isFn =
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node);
      if (isFn) {
        const body = node.body;
        const inlineServer =
          body && ts.isBlock(body) && body.statements.some((s) => isDirective(s, "use server"));
        const exportedAction = fileIsServer && ts.isFunctionDeclaration(node) && hasExport(node);
        const exportedHandler =
          isRoute &&
          ts.isFunctionDeclaration(node) &&
          hasExport(node) &&
          HTTP.has(functionName(node));
        if ((inlineServer || exportedAction || exportedHandler) && !startsWithGuard(body)) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart());
          problems.push(
            `${rel}:${line + 1}: ${functionName(node)} must start with \`await requireAdminAction()\``,
          );
        }
      }
      // `export const x = async () => {}` in a "use server" file.
      if (
        fileIsServer &&
        ts.isVariableStatement(node) &&
        hasExport(node)
      ) {
        for (const decl of node.declarationList.declarations) {
          const init = decl.initializer;
          if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
            if (!startsWithGuard(init.body)) {
              const { line } = source.getLineAndCharacterOfPosition(decl.getStart());
              problems.push(
                `${rel}:${line + 1}: ${decl.name.getText()} must start with \`await requireAdminAction()\``,
              );
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}

if (problems.length > 0) {
  console.error("Admin guard check failed:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log("Admin guard check passed.");
