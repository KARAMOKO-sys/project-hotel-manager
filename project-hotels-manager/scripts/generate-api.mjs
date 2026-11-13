// =============================================================================
// Générateur du client de l'API backend (PleasantStay / NestJS)
// =============================================================================
//
// Lit les contrôleurs, DTOs et entités du backend avec le compilateur
// TypeScript, puis génère :
//   - types/api/<module>.ts      : DTOs, entités et enums de chaque module ;
//   - types/api/index.ts         : point d'entrée des types ;
//   - services/api/<module>.service.ts : une fonction par route HTTP ;
//   - services/api/index.ts      : point d'entrée des services.
//
// Usage : npm run generate:api
// Le chemin du backend peut être surchargé : BACKEND_DIR=../autre-dossier
//
// Les fichiers générés ne doivent pas être modifiés à la main : relancez le
// script après chaque évolution du backend.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const FRONTEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND_DIR = path.resolve(
  FRONTEND_DIR,
  process.env.BACKEND_DIR ?? "../project-hotels-manager-backend",
);
const BACKEND_SRC = path.join(BACKEND_DIR, "src");
const TYPES_OUT = path.join(FRONTEND_DIR, "types/api");
const SERVICES_OUT = path.join(FRONTEND_DIR, "services/api");

const HEADER = (source) =>
  [
    "// =============================================================================",
    "// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.",
    `// Source : project-hotels-manager-backend/${source}`,
    "// =============================================================================",
    "",
  ].join("\n");

/** Modules exclus du client (aucune route utile côté frontend). */
const SKIPPED_CONTROLLERS = new Set(["app.controller.ts"]);

/** Décorateurs de paramètres injectés côté serveur (jamais envoyés). */
const SERVER_SIDE_PARAMS = new Set(["CurrentUser", "Client", "Req", "Request", "Ip", "Res", "Response", "Headers"]);

/** Wrappers Mongoose dont on ne garde que le type métier. */
const MONGOOSE_WRAPPERS = new Set([
  "HydratedDocument",
  "FlattenMaps",
  "Require_id",
  "Default__v",
  "LeanDocument",
  "IfAny",
  "WithLevel1NestedPaths",
]);

const RESERVED = new Set(["break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for", "function", "if", "import", "in", "instanceof", "new", "null", "return", "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield", "let", "static", "await"]);

// -----------------------------------------------------------------------------
// Programme TypeScript du backend
// -----------------------------------------------------------------------------

const configPath = path.join(BACKEND_DIR, "tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, BACKEND_DIR);
const rootNames = parsed.fileNames.filter(
  (file) => file.startsWith(BACKEND_SRC) && !file.endsWith(".spec.ts"),
);
const program = ts.createProgram(rootNames, parsed.options);
const checker = program.getTypeChecker();

const isBackendFile = (file) =>
  path.resolve(file).startsWith(BACKEND_SRC) && !file.includes("node_modules");

/** Nom du module = premier dossier sous src/ (ex. "reservation"). */
const moduleOf = (file) => path.relative(BACKEND_SRC, file).split(path.sep)[0];

const pascal = (value) =>
  value
    .split(/[-_.\s]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
const camel = (value) => {
  const result = pascal(value);
  return result[0].toLowerCase() + result.slice(1);
};

// -----------------------------------------------------------------------------
// Registre des types nommés (émis à la demande)
// -----------------------------------------------------------------------------

/** declaration -> { name, module, source, code } */
const named = new Map();
/** nom -> declaration (garantit l'unicité dans le barrel) */
const takenNames = new Map();
const warnings = [];

function uniqueName(decl, baseName) {
  if (!takenNames.has(baseName)) return baseName;
  const file = path.basename(decl.getSourceFile().fileName).replace(/\.(entity|dto|embeddable|enum|schema|interface)?\.?ts$/, "");
  let candidate = `${pascal(file)}${baseName}`;
  if (candidate.startsWith(`${pascal(file)}${pascal(file)}`) || takenNames.has(candidate)) {
    candidate = `${pascal(moduleOf(decl.getSourceFile().fileName))}${baseName}`;
  }
  let index = 2;
  while (takenNames.has(candidate)) candidate = `${baseName}${index++}`;
  warnings.push(`Nom en conflit : ${baseName} (${path.relative(BACKEND_SRC, decl.getSourceFile().fileName)}) renommé en ${candidate}`);
  return candidate;
}

/** Retourne le nom émis pour une déclaration du backend (et l'enregistre). */
function refDeclaration(decl) {
  const existing = named.get(decl);
  if (existing) return existing.name;

  const name = uniqueName(decl, decl.name.text);
  const entry = { name, module: moduleOf(decl.getSourceFile().fileName), deps: new Set(), code: "" };
  named.set(decl, entry);
  takenNames.set(name, decl);
  entry.code = emitDeclaration(decl, entry);
  return name;
}

/** Contexte de conversion : collecte les dépendances du fichier courant. */
function makeCtx(entry) {
  return {
    use(decl) {
      const name = refDeclaration(decl);
      if (entry) entry.deps.add(decl);
      return name;
    },
  };
}

function declOfSymbol(symbol) {
  if (!symbol) return undefined;
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  return target.declarations?.find(
    (d) =>
      ts.isClassDeclaration(d) ||
      ts.isInterfaceDeclaration(d) ||
      ts.isEnumDeclaration(d) ||
      ts.isTypeAliasDeclaration(d),
  );
}

// -----------------------------------------------------------------------------
// Conversion ts.Type -> texte TypeScript côté frontend
// -----------------------------------------------------------------------------

const DOC_MARKER = "__mongoose_document__";

function conv(type, ctx, depth = 0, seen = new Set(), expandAlias = false) {
  if (depth > 8) return "unknown";
  const f = type.flags;

  if (f & ts.TypeFlags.Any || f & ts.TypeFlags.Unknown) return "unknown";
  if (f & ts.TypeFlags.String) return "string";
  if (f & ts.TypeFlags.Number) return "number";
  if (f & ts.TypeFlags.Boolean) return "boolean";
  if (f & ts.TypeFlags.BigInt) return "string";
  if (f & ts.TypeFlags.Null) return "null";
  if (f & ts.TypeFlags.Undefined) return "undefined";
  if (f & ts.TypeFlags.Void) return "void";
  if (f & ts.TypeFlags.Never) return "never";
  if (f & ts.TypeFlags.ESSymbol) return "unknown";
  if (f & ts.TypeFlags.TypeParameter) return type.symbol.name;

  // Membre d'enum isolé (ex. `status: ReservationStatus.PENDING`)
  if (f & ts.TypeFlags.EnumLiteral && !(f & ts.TypeFlags.Union)) {
    const parent = type.symbol?.parent;
    const decl = declOfSymbol(parent);
    if (decl && isBackendFile(decl.getSourceFile().fileName)) {
      return `${ctx.use(decl)}.${type.symbol.name}`;
    }
  }
  if (f & ts.TypeFlags.StringLiteral) return JSON.stringify(type.value);
  if (f & ts.TypeFlags.NumberLiteral) return String(type.value);
  if (f & ts.TypeFlags.BooleanLiteral) return checker.typeToString(type);

  // Enum complet
  if (type.symbol && type.symbol.flags & ts.SymbolFlags.Enum) {
    const decl = declOfSymbol(type.symbol);
    if (decl && isBackendFile(decl.getSourceFile().fileName)) return ctx.use(decl);
  }

  // Alias de types (Record, wrappers Mongoose, alias du backend)
  if (type.aliasSymbol && !expandAlias) {
    const alias = type.aliasSymbol.name;
    const args = type.aliasTypeArguments ?? [];
    if (alias === "Record" && args.length === 2) {
      return `Record<${conv(args[0], ctx, depth + 1, seen)}, ${conv(args[1], ctx, depth + 1, seen)}>`;
    }
    if (MONGOOSE_WRAPPERS.has(alias) && args.length) return conv(args[0], ctx, depth + 1, seen);
    const decl = declOfSymbol(type.aliasSymbol);
    if (decl && isBackendFile(decl.getSourceFile().fileName) && ts.isTypeAliasDeclaration(decl)) {
      const name = ctx.use(decl);
      return args.length ? `${name}<${args.map((a) => conv(a, ctx, depth + 1, seen)).join(", ")}>` : name;
    }
  }

  if (f & ts.TypeFlags.Union) {
    if (type.symbol && type.symbol.flags & ts.SymbolFlags.Enum) {
      const decl = declOfSymbol(type.symbol);
      if (decl) return ctx.use(decl);
    }
    // Regroupe les membres d'un même enum (ex. union `Enum | undefined`).
    const enumGroups = new Map();
    const others = [];
    for (const member of type.types) {
      const parent = member.flags & ts.TypeFlags.EnumLiteral ? member.symbol?.parent : undefined;
      if (parent) {
        if (!enumGroups.has(parent)) enumGroups.set(parent, []);
        enumGroups.get(parent).push(member);
      } else {
        others.push(member);
      }
    }
    let parts = [];
    for (const [parent, members] of enumGroups) {
      const decl = declOfSymbol(parent);
      if (decl && ts.isEnumDeclaration(decl) && decl.members.length === members.length && isBackendFile(decl.getSourceFile().fileName)) {
        parts.push(ctx.use(decl));
      } else {
        parts.push(...members.map((t) => conv(t, ctx, depth + 1, seen)));
      }
    }
    parts.push(...others.map((t) => conv(t, ctx, depth + 1, seen)));
    if (parts.includes("true") && parts.includes("false")) {
      parts = parts.filter((p) => p !== "true" && p !== "false");
      parts.push("boolean");
    }
    parts = [...new Set(parts)];
    if (parts.includes("unknown")) return "unknown";
    return parts.map(wrapForUnion).join(" | ");
  }

  if (f & ts.TypeFlags.Intersection) {
    const parts = [...new Set(type.types.map((t) => conv(t, ctx, depth + 1, seen)))].filter(
      (p) => p !== DOC_MARKER && p !== "unknown" && p !== "{}",
    );
    if (!parts.length) return "unknown";
    // Document Mongoose : on garde l'entité métier, le reste est du bruit.
    if (type.types.some((t) => conv(t, ctx, depth + 1, seen) === DOC_MARKER)) {
      const entity = parts.find((p) => /^[A-Z]\w*$/.test(p));
      if (entity) return entity;
    }
    return parts.map(wrapForUnion).join(" & ");
  }

  if (f & ts.TypeFlags.Object) {
    const symbol = type.symbol;
    const symName = symbol?.name;

    if (checker.isTupleType(type)) {
      return `[${checker.getTypeArguments(type).map((t) => conv(t, ctx, depth + 1, seen)).join(", ")}]`;
    }
    if (checker.isArrayType(type)) {
      const [item] = checker.getTypeArguments(type);
      const inner = conv(item, ctx, depth + 1, seen);
      return /[|&\s]/.test(inner) ? `Array<${inner}>` : `${inner}[]`;
    }

    const declFile = symbol?.declarations?.[0]?.getSourceFile().fileName ?? "";
    const typeArgs = type.objectFlags & ts.ObjectFlags.Reference ? checker.getTypeArguments(type) : [];

    if (symName === "Date") return "string";
    if (symName === "ObjectId" || symName === "ObjectIdLike") return "string";
    if (symName === "Buffer" || symName === "Uint8Array") return "string";
    if (symName === "Promise" && typeArgs.length) return conv(typeArgs[0], ctx, depth + 1, seen);
    if (symName === "Map" && typeArgs.length === 2) {
      return `Record<string, ${conv(typeArgs[1], ctx, depth + 1, seen)}>`;
    }
    if (declFile.includes("node_modules/mongoose") || declFile.includes("node_modules/bson")) {
      return DOC_MARKER;
    }

    const decl = declOfSymbol(symbol);
    if (decl && isBackendFile(decl.getSourceFile().fileName)) {
      const name = ctx.use(decl);
      return typeArgs.length
        ? `${name}<${typeArgs.map((a) => conv(a, ctx, depth + 1, seen)).join(", ")}>`
        : name;
    }

    // Type objet anonyme : on développe ses propriétés.
    if (seen.has(type)) return "unknown";
    if (declFile && !isBackendFile(declFile) && symName !== "__type" && symName !== "__object") {
      return "unknown";
    }
    return objectLiteral(type, ctx, depth, new Set([...seen, type]));
  }

  return "unknown";
}

function wrapForUnion(part) {
  return /=>/.test(part) ? `(${part})` : part;
}

function objectLiteral(type, ctx, depth, seen) {
  const members = [];
  for (const info of checker.getIndexInfosOfType(type)) {
    members.push(`[key: ${conv(info.keyType, ctx, depth + 1, seen)}]: ${conv(info.type, ctx, depth + 1, seen)}`);
  }
  for (const prop of checker.getPropertiesOfType(type)) {
    const decl = prop.valueDeclaration ?? prop.declarations?.[0];
    // Membres internes d'un document Mongoose (collection, $locals…).
    if (decl && /node_modules\/(mongoose|bson)/.test(decl.getSourceFile().fileName)) {
      if (prop.name === "_id" || prop.name === "id") members.push(`${prop.name}: string`);
      continue;
    }
    const propType = decl ? checker.getTypeOfSymbolAtLocation(prop, decl) : checker.getTypeOfSymbol(prop);
    if (checker.getSignaturesOfType(propType, ts.SignatureKind.Call).length) continue;
    const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
    const text = conv(propType, ctx, depth + 1, seen);
    members.push(`${propKey(prop.name)}${optional ? "?" : ""}: ${stripUndefined(text === DOC_MARKER ? "unknown" : text, optional)}`);
  }
  if (!members.length) return "Record<string, unknown>";
  return `{ ${members.join("; ")} }`;
}

const propKey = (name) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name));

function stripUndefined(text, optional) {
  if (!optional) return text;
  const parts = text.split(" | ").filter((p) => p !== "undefined");
  return parts.length ? parts.join(" | ") : "unknown";
}

// -----------------------------------------------------------------------------
// Émission des déclarations (classes, interfaces, enums, alias)
// -----------------------------------------------------------------------------

function decoratorNames(node) {
  return (ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []).map((d) => {
    const expr = d.expression;
    return ts.isCallExpression(expr) ? expr.expression.getText() : expr.getText();
  });
}

function jsDoc(node, indent = "") {
  const docs = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
  const text = docs
    .map((d) => (typeof d.comment === "string" ? d.comment : ts.getTextOfJSDocComment(d.comment)))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? `${indent}/** ${text.replace(/\*\//g, "* /")} */\n` : "";
}

/** Traduit `PartialType(X)`, `OmitType(X, [...])`… en type utilitaire. */
function heritageExpression(expr, ctx) {
  if (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr)) {
    const symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(expr) ? expr.name : expr);
    const decl = declOfSymbol(symbol);
    if (!decl) return null;
    if (!isBackendFile(decl.getSourceFile().fileName)) return null; // Document Mongoose…
    return ctx.use(decl);
  }
  if (ts.isCallExpression(expr)) {
    const callee = expr.expression.getText();
    const [first, second] = expr.arguments;
    const keys = () =>
      second && ts.isArrayLiteralExpression(ts.isAsExpression(second) ? second.expression : second)
        ? (ts.isAsExpression(second) ? second.expression : second).elements.map((e) => e.getText().replace(/'/g, '"')).join(" | ")
        : "never";
    const base = first ? heritageExpression(first, ctx) : null;
    if (!base) return null;
    switch (callee) {
      case "PartialType":
        return `Partial<${base}>`;
      case "OmitType":
        return `Omit<${base}, ${keys()}>`;
      case "PickType":
        return `Pick<${base}, ${keys()}>`;
      case "IntersectionType":
        return expr.arguments.map((a) => heritageExpression(a, ctx)).filter(Boolean).join(" & ");
      default:
        return null;
    }
  }
  return null;
}

function extendsDocument(decl) {
  for (const clause of decl.heritageClauses ?? []) {
    for (const t of clause.types) {
      const symbol = checker.getSymbolAtLocation(t.expression);
      const target = declOfSymbol(symbol);
      if (target && !isBackendFile(target.getSourceFile().fileName) && symbol.name === "Document") return true;
    }
  }
  return false;
}

function emitDeclaration(decl, entry) {
  const ctx = makeCtx(entry);
  const doc = jsDoc(decl);

  if (ts.isEnumDeclaration(decl)) {
    const members = decl.members.map((m) => {
      const value = m.initializer ? m.initializer.getText().replace(/'/g, '"') : JSON.stringify(m.name.getText());
      return `  ${m.name.getText()} = ${value},`;
    });
    return `${doc}export enum ${entry.name} {\n${members.join("\n")}\n}`;
  }

  if (ts.isTypeAliasDeclaration(decl)) {
    const params = decl.typeParameters?.length ? `<${decl.typeParameters.map((p) => p.name.text).join(", ")}>` : "";
    return `${doc}export type ${entry.name}${params} = ${conv(checker.getTypeAtLocation(decl.type), ctx, 0, new Set(), true)};`;
  }

  // Classe ou interface -> interface
  const params = decl.typeParameters?.length ? `<${decl.typeParameters.map((p) => p.name.text).join(", ")}>` : "";
  const bases = [];
  for (const clause of decl.heritageClauses ?? []) {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
    for (const t of clause.types) {
      let base = heritageExpression(t.expression, ctx);
      if (base && t.typeArguments?.length) {
        base += `<${t.typeArguments.map((a) => conv(checker.getTypeFromTypeNode(a), ctx)).join(", ")}>`;
      }
      if (base) bases.push(base);
    }
  }

  const isEntity = ts.isClassDeclaration(decl) && decoratorNames(decl).includes("Schema");
  const lines = [];
  if (extendsDocument(decl)) {
    lines.push("  /** Identifiant MongoDB. */", "  _id: string;");
  }

  for (const member of decl.members) {
    const isProp = ts.isPropertyDeclaration(member) || ts.isPropertySignature(member);
    if (!isProp || !member.name || ts.isPrivateIdentifier(member.name)) continue;
    const mods = ts.getCombinedModifierFlags(member);
    if (mods & (ts.ModifierFlags.Static | ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;
    const decorators = decoratorNames(member);
    if (decorators.includes("Exclude")) continue;
    // Pour une entité, seules les colonnes @Prop sont sérialisées.
    if (isEntity && !decorators.includes("Prop") && !decorators.some((d) => d.endsWith("Prop"))) continue;

    const symbol = checker.getSymbolAtLocation(member.name);
    const memberType = checker.getTypeOfSymbolAtLocation(symbol, member);
    if (checker.getSignaturesOfType(memberType, ts.SignatureKind.Call).length) continue;
    const optional = !!member.questionToken || decorators.includes("IsOptional");
    const typeText = stripUndefined(conv(memberType, ctx), optional);
    lines.push(`${jsDoc(member, "  ")}  ${propKey(member.name.getText())}${optional ? "?" : ""}: ${typeText};`);
  }

  const heritage = bases.length ? ` extends ${bases.join(", ")}` : "";
  if (!lines.length) {
    const target = bases.length ? bases.join(" & ") : "Record<string, never>";
    return `${doc}export type ${entry.name}${params} = ${target};`;
  }
  return `${doc}export interface ${entry.name}${params}${heritage} {\n${lines.join("\n")}\n}`;
}

// -----------------------------------------------------------------------------
// Analyse des contrôleurs
// -----------------------------------------------------------------------------

const HTTP_METHODS = { Get: "get", Post: "post", Put: "put", Patch: "patch", Delete: "delete" };

function decoratorArg(node, name) {
  for (const d of ts.getDecorators(node) ?? []) {
    if (!ts.isCallExpression(d.expression)) continue;
    if (d.expression.expression.getText() !== name) continue;
    const [arg] = d.expression.arguments;
    if (!arg) return "";
    if (ts.isStringLiteralLike(arg)) return arg.text;
    return null;
  }
  return undefined;
}

function joinPath(...parts) {
  return `/${parts.filter(Boolean).map((p) => p.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/")}`;
}

function analyzeController(sourceFile) {
  const classDecl = sourceFile.statements.find(
    (s) => ts.isClassDeclaration(s) && decoratorNames(s).includes("Controller"),
  );
  if (!classDecl) return null;
  const base = decoratorArg(classDecl, "Controller") ?? "";
  const entityName = classDecl.name.text.replace(/Controller$/, "");
  const entry = { name: entityName, module: moduleOf(sourceFile.fileName), deps: new Set(), code: "" };
  const ctx = makeCtx(entry);
  const routes = [];

  for (const member of classDecl.members) {
    if (!ts.isMethodDeclaration(member)) continue;
    const decorators = decoratorNames(member);
    const httpDecorator = decorators.find((d) => HTTP_METHODS[d]);
    if (!httpDecorator) continue;

    const sub = decoratorArg(member, httpDecorator);
    if (sub === null) {
      warnings.push(`Chemin non littéral ignoré : ${entityName}.${member.name.getText()}`);
      continue;
    }
    const routePath = joinPath(base, sub ?? "");
    const pathParams = [...routePath.matchAll(/:(\w+)/g)].map((m) => m[1]);
    const route = {
      method: HTTP_METHODS[httpDecorator],
      path: routePath,
      name: member.name.getText(),
      doc: jsDoc(member),
      pathParams,
      body: null,
      bodyFields: [],
      query: null,
      queryFields: [],
      blob: false,
      isPublic: decorators.includes("Public"),
      roles: null,
    };
    const rolesDecorator = (ts.getDecorators(member) ?? []).find(
      (d) => ts.isCallExpression(d.expression) && d.expression.expression.getText() === "Roles",
    );
    if (rolesDecorator) route.roles = rolesDecorator.expression.arguments.map((a) => a.getText().replace(/'/g, ""));

    for (const param of member.parameters) {
      const [paramDecorator] = (ts.getDecorators(param) ?? []).map((d) => d.expression);
      if (!paramDecorator) continue;
      const decoName = ts.isCallExpression(paramDecorator) ? paramDecorator.expression.getText() : paramDecorator.getText();
      const firstArg = ts.isCallExpression(paramDecorator) ? paramDecorator.arguments[0] : undefined;
      const key = firstArg && ts.isStringLiteralLike(firstArg) ? firstArg.text : null;
      const paramType = checker.getTypeAtLocation(param);
      const optional = !!param.questionToken || !!param.initializer;

      if (decoName === "Res" || decoName === "Response") route.blob = true;
      if (SERVER_SIDE_PARAMS.has(decoName)) continue;

      if (decoName === "Param") continue; // déduits du chemin
      if (decoName === "Body") {
        if (key) route.bodyFields.push({ key, type: stripUndefined(conv(paramType, ctx), optional), optional });
        else route.body = { type: conv(paramType, ctx), optional: optional || allOptional(paramType) };
      } else if (decoName === "Query") {
        if (key) route.queryFields.push({ key, type: stripUndefined(conv(paramType, ctx), optional), optional });
        else route.query = { type: conv(paramType, ctx), optional: optional || allOptional(paramType) };
      }
    }

    const signature = checker.getSignatureFromDeclaration(member);
    const returnType = checker.getAwaitedType(checker.getReturnTypeOfSignature(signature));
    route.returns = route.blob ? "Blob" : conv(returnType, ctx);
    if (route.returns === DOC_MARKER) route.returns = "unknown";
    routes.push(route);
  }

  return { entityName, entry, routes, source: path.relative(BACKEND_DIR, sourceFile.fileName) };
}

function allOptional(type) {
  return checker
    .getPropertiesOfType(type)
    .every((p) => p.flags & ts.SymbolFlags.Optional || p.valueDeclaration?.initializer || hasOptionalDecorator(p));
}

function hasOptionalDecorator(symbol) {
  const decl = symbol.valueDeclaration;
  return !!decl && decoratorNames(decl).includes("IsOptional");
}

// -----------------------------------------------------------------------------
// Génération des services
// -----------------------------------------------------------------------------

function renderRoute(route, entityName) {
  const fnName = RESERVED.has(route.name) ? `${route.name}${entityName}` : route.name;
  const args = [];
  const urlExpr = route.pathParams.length
    ? `\`${route.path.replace(/:(\w+)/g, (_, p) => `\${encodeURIComponent(${p})}`)}\``
    : JSON.stringify(route.path);
  for (const p of route.pathParams) args.push(`${p}: string`);

  let bodyExpr = null;
  if (route.body) {
    args.push(route.body.optional ? `body: ${route.body.type} = {}` : `body: ${route.body.type}`);
    bodyExpr = "body";
  } else if (route.bodyFields.length) {
    const optional = route.bodyFields.every((f) => f.optional);
    const shape = `{ ${route.bodyFields.map((f) => `${propKey(f.key)}${f.optional ? "?" : ""}: ${f.type}`).join("; ")} }`;
    args.push(optional ? `body: ${shape} = {}` : `body: ${shape}`);
    bodyExpr = "body";
  }

  let queryExpr = null;
  const queryParts = [];
  if (route.query) queryParts.push(route.query);
  if (route.queryFields.length) {
    queryParts.push({
      type: `{ ${route.queryFields.map((f) => `${propKey(f.key)}${f.optional ? "?" : ""}: ${f.type}`).join("; ")} }`,
      optional: route.queryFields.every((f) => f.optional),
    });
  }
  if (queryParts.length) {
    const optional = queryParts.every((q) => q.optional);
    args.push(`query${optional ? "?" : ""}: ${queryParts.map((q) => q.type).join(" & ")}`);
    queryExpr = "query";
  }

  const returns = route.returns;
  const config = [];
  if (queryExpr) config.push("params: query");
  if (route.blob) config.push('responseType: "blob"');
  const configExpr = config.length ? `{ ${config.join(", ")} }` : null;

  const callArgs = [urlExpr];
  if (["post", "put", "patch"].includes(route.method)) {
    callArgs.push(bodyExpr ?? "undefined");
    if (configExpr) callArgs.push(configExpr);
  } else {
    if (bodyExpr) config.push("data: body");
    const cfg = config.length ? `{ ${config.join(", ")} }` : null;
    if (cfg) callArgs.push(cfg);
  }

  const notes = [];
  if (route.isPublic) notes.push("Route publique.");
  if (route.roles) notes.push(`Rôles requis : ${route.roles.join(", ")}.`);
  const docText = route.doc ? route.doc.replace(/^\/\*\* | \*\/\n$/g, "") : "";
  const comment = [`${route.method.toUpperCase()} ${route.path}`, docText, ...notes].filter(Boolean).join(" — ");

  return [
    `/** ${comment} */`,
    `export async function ${fnName}(${args.join(", ")}): Promise<${returns}> {`,
    `  const { data } = await apiClient.${route.method}<${returns}>(${callArgs.join(", ")});`,
    "  return data;",
    "}",
  ].join("\n");
}

/** Identifiants de types référencés dans du code (hors commentaires et chaînes). */
function namesUsedIn(code) {
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""');
  return new Set(stripped.match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? []);
}

// -----------------------------------------------------------------------------
// Exécution
// -----------------------------------------------------------------------------

const controllers = program
  .getSourceFiles()
  .filter(
    (sf) =>
      isBackendFile(sf.fileName) &&
      sf.fileName.endsWith(".controller.ts") &&
      !SKIPPED_CONTROLLERS.has(path.basename(sf.fileName)),
  )
  .map(analyzeController)
  .filter(Boolean)
  .sort((a, b) => a.entry.module.localeCompare(b.entry.module));

// Les entités principales de chaque module sont toujours exportées, même si
// aucune route ne les renvoie explicitement (réponses typées `unknown`).
for (const sf of program.getSourceFiles()) {
  if (!isBackendFile(sf.fileName) || !/\/(schemas|dto)\//.test(sf.fileName)) continue;
  for (const statement of sf.statements) {
    const exported = ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export;
    if (!exported) continue;
    if (ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      if (statement.name) refDeclaration(statement);
    }
  }
}

fs.rmSync(TYPES_OUT, { recursive: true, force: true });
fs.mkdirSync(TYPES_OUT, { recursive: true });

// Regroupe les déclarations par module.
const byModule = new Map();
for (const [decl, entry] of named) {
  if (!byModule.has(entry.module)) byModule.set(entry.module, []);
  byModule.get(entry.module).push({ decl, entry });
}

const nameToModule = new Map([...named.values()].map((e) => [e.name, e.module]));

for (const [module, items] of [...byModule].sort(([a], [b]) => a.localeCompare(b))) {
  items.sort((a, b) =>
    a.decl.getSourceFile().fileName.localeCompare(b.decl.getSourceFile().fileName) || a.decl.pos - b.decl.pos,
  );
  const body = items.map((i) => i.entry.code).join("\n\n");
  const localNames = new Set(items.map((i) => i.entry.name));
  const imports = new Map();
  for (const name of namesUsedIn(body)) {
    const target = nameToModule.get(name);
    if (!target || target === module || localNames.has(name)) continue;
    if (!imports.has(target)) imports.set(target, new Set());
    imports.get(target).add(name);
  }
  const importLines = [...imports]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([target, names]) => `import type { ${[...names].sort().join(", ")} } from "./${target}";`);
  const sources = [...new Set(items.map((i) => path.relative(BACKEND_DIR, path.dirname(i.decl.getSourceFile().fileName))))];
  const content = [
    HEADER(`src/${module}/`).replace(`src/${module}/`, sources.length === 1 ? sources[0] : `src/${module}/`),
    importLines.join("\n"),
    importLines.length ? "" : null,
    body,
    "",
  ]
    .filter((l) => l !== null)
    .join("\n");
  fs.writeFileSync(path.join(TYPES_OUT, `${module}.ts`), content);
}

fs.writeFileSync(
  path.join(TYPES_OUT, "index.ts"),
  [
    HEADER("src/"),
    ...[...byModule.keys()].sort().map((m) => `export * from "./${m}";`),
    "",
  ].join("\n"),
);

// Services
for (const file of fs.existsSync(SERVICES_OUT) ? fs.readdirSync(SERVICES_OUT) : []) {
  if (file.endsWith(".service.ts")) fs.rmSync(path.join(SERVICES_OUT, file));
}
fs.mkdirSync(SERVICES_OUT, { recursive: true });

const serviceIndex = [];
let routeCount = 0;
for (const controller of controllers) {
  const fileBase = controller.entry.module;
  const functions = controller.routes.map((r) => renderRoute(r, controller.entityName));
  routeCount += functions.length;
  const code = functions.join("\n\n");
  const typeImports = [...namesUsedIn(code)].filter((n) => nameToModule.has(n)).sort();
  const content = [
    HEADER(controller.source),
    'import { apiClient } from "./client";',
    typeImports.length ? `import type { ${typeImports.join(", ")} } from "@/types/api";` : null,
    "",
    code,
    "",
  ]
    .filter((l) => l !== null)
    .join("\n");
  fs.writeFileSync(path.join(SERVICES_OUT, `${fileBase}.service.ts`), content);
  serviceIndex.push(`export * as ${camel(fileBase)}Service from "./${fileBase}.service";`);
}

fs.writeFileSync(
  path.join(SERVICES_OUT, "index.ts"),
  [
    HEADER("src/*/controllers/"),
    "// Exemple : import { reservationService } from \"@/services/api\";",
    "//           const page = await reservationService.findAll({ page: 1, limit: 20 });",
    "",
    'export { apiClient, ApiError, tokenStorage } from "./client";',
    'export * from "./session";',
    ...serviceIndex,
    "",
  ].join("\n"),
);

console.log(`${controllers.length} contrôleurs, ${routeCount} routes, ${named.size} types générés.`);
for (const w of warnings) console.warn(`⚠ ${w}`);
