import * as ts from 'typescript';
import * as path from 'path';
import * as crypto from 'crypto';

const prefix = crypto.randomBytes(256).toString('hex');

function hash(str: string): string {
  const h = crypto.createHash('sha256');
  h.update(str);

  return h.digest('hex');
}

function getSymbolId(symbol: ts.Symbol): ts.CallExpression {
  const uid = symbol.name + "#" + hash(prefix + (symbol as any).id);
  return ts.createCall(ts.createIdentifier('Symbol.for'), [], [ts.createStringLiteral(uid)]);
}

function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node {
  return ts.visitEachChild(visitNode(node, program), childNode => visitNodeAndChildren(childNode, program, context), context);
}

function visitNode(node: ts.Node, program: ts.Program) {
  const typeChecker = program.getTypeChecker();
  if (isCallExpression(node, typeChecker)) {
    const methodName = getCallExpressionName(node, typeChecker);

    if (methodName === 'InterfaceSymbol') {
      return visitSymbolNode(node, typeChecker);
    } else if (methodName === 'bind' || methodName === 'resolve' || methodName === 'resolveFactory') {
      return visitParametersNode(node, typeChecker);
    } else if (methodName === 'bindToImplements') {
      return bindToImplements(node, typeChecker);
    }
  }
  return node;
}

function visitSymbolNode(node: ts.CallExpression, typeChecker: ts.TypeChecker) {
  if (!node.typeArguments) {
    throw new Error("No type arguments provided to `InterfaceSymbol<T>()`.");
  }

  const typeArgument = node.typeArguments[0];
  const type = typeChecker.getTypeFromTypeNode(typeArgument);
  const symbol = type.symbol;
  if (type.isClass() || !type.isClassOrInterface()) {
    throw new Error("The type provided is not an interface.");
  }

  return getSymbolId(symbol);
}

function getImports(root: ts.SourceFile): ts.Token<ts.SyntaxKind.StringLiteral>[] {
  const fake = root as any;
  if (fake.imports && Array.isArray(fake.imports)) {
    return fake.imports;
  } else {
    return [];
  }
}

function getImportForType(typeChecker: ts.TypeChecker, imports: ts.Token<ts.SyntaxKind.StringLiteral>[], type: ts.TypeNode): ts.ImportSpecifier | undefined {
  for (const node of imports) {
    if (ts.isImportDeclaration(node.parent)) {
      const importClause = node.parent.importClause;
      if (importClause && importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
        const elements = importClause.namedBindings.elements;
        for (const element of elements) {
          if (ts.isImportSpecifier(element)) {
            const importType = typeChecker.getTypeFromTypeNode(element.name as any as ts.TypeNode);
            const paramType = typeChecker.getTypeFromTypeNode(type);

            if ((importType as any).id === (paramType as any).id) {
              return element;
            }
          }
        }
      }
    }
  }

  return undefined;
}

function getTypeExpression(node: ts.TypeNode, sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker): ts.Expression {
  let expression: ts.Expression;
  let isArray = false;
  let type = typeChecker.getTypeFromTypeNode(node);
  if (ts.isArrayTypeNode(node)) {
    const t = type as ts.TypeReference;
    if (t.typeArguments && t.typeArguments.length > 0) {
      type = t.typeArguments[0];
      isArray = true;
    }
  }
  const symbol = type.symbol;
  if ((type.isClassOrInterface() && !type.isClass()) as boolean) {
    expression = getSymbolId(symbol);
  } else {
    const imports = getImports(sourceFile);
    const importElement = getImportForType(typeChecker, imports, node);
    if (importElement) {
      expression = importElement.name;
    } else {
      expression = ts.createLiteral(symbol.name);
    }
  }

  if (isArray && expression) {
    expression = ts.createArrayLiteral([expression]);
  }

  return expression;
}

function getClassConstructorParameters(node: ts.TypeNode, sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker): ts.Expression[] {
  const type = typeChecker.getTypeFromTypeNode(node);
  if (!type.symbol.members) return [];

  const params: ts.Expression[] = [];
  type.symbol.members.forEach(val => {
    if (val.declarations.length === 0) return;

    const firstDeclaration = val.declarations[0];
    if (ts.isConstructorDeclaration(firstDeclaration)) {
      for (const param of firstDeclaration.parameters) {
        if (param.type) {
          params.push(getTypeExpression(param.type, sourceFile, typeChecker));
        }
      }
    }
  });

  return params;
}

function getClassImplementedInterfaces(node: ts.TypeNode, sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker): ts.Expression[] {
  const type = typeChecker.getTypeFromTypeNode(node);
  const classDeclaration = type.symbol.valueDeclaration as ts.ClassDeclaration;
  if (!ts.isClassDeclaration(type.symbol.valueDeclaration)) return [];
  if (!classDeclaration.heritageClauses) return [];

  const identifiers: ts.Expression[] = [];
  for (const clause of classDeclaration.heritageClauses) {
    for (const type of clause.types) {
      identifiers.push(getTypeExpression(type, sourceFile, typeChecker));
    }
  }

  return identifiers;
}

function visitParametersNode(node: ts.CallExpression, typeChecker: ts.TypeChecker): ts.CallExpression {
  const signature = typeChecker.getResolvedSignature(node);
  if (!signature) {
    return node;
  }

  const { declaration } = signature;
  if (!declaration) {
    return node;
  }

  if (!ts.isMethodDeclaration(declaration) || !declaration.name) {
    return node;
  }

  const numArgs = declaration.name.getText() === 'bind' ? 2 : 1;
  
  if (node.arguments.length !== numArgs) {
    return node;
  }

  const args: ts.Expression[] = [];
  for (const val of node.arguments) {
    args.push(val);
  }

  const newable = node.arguments[numArgs - 1] as ts.Node as ts.TypeNode;
  const params = getClassConstructorParameters(newable, node.getSourceFile(), typeChecker);
  args.push(ts.createArrayLiteral(params));

  node.arguments = ts.createNodeArray(args);

  return node;
}

function bindToImplements(node: ts.CallExpression, typeChecker: ts.TypeChecker): ts.CallExpression {
  const signature = typeChecker.getResolvedSignature(node);
  if (!signature) {
    return node;
  }

  const { declaration } = signature;
  if (!declaration) {
    return node;
  }

  if (!ts.isMethodDeclaration(declaration) || !declaration.name) {
    return node;
  }
  
  if (node.arguments.length !== 1) {
    return node;
  }

  const args: ts.Expression[] = [];
  for (const val of node.arguments) {
    args.push(val);
  }
  const sourceFile = node.getSourceFile();

  const newable = node.arguments[0] as ts.Node as ts.TypeNode;

  const params = getClassConstructorParameters(newable, sourceFile, typeChecker);
  args.push(ts.createArrayLiteral(params));

  const implementedInterfaces = getClassImplementedInterfaces(newable, sourceFile, typeChecker);
  args.push(ts.createArrayLiteral(implementedInterfaces));

  node.arguments = ts.createNodeArray(args);

  return node;
}

function getCallExpressionName(node: ts.Node, typeChecker: ts.TypeChecker): string | undefined {
  if (!ts.isCallExpression(node)) {
    return undefined;
  }
  const signature = typeChecker.getResolvedSignature(node);
  if (typeof signature === 'undefined') {
    return undefined;
  }

  const { declaration } = signature;
  if (!declaration) {
    return undefined;
  }
  const dirname = path.dirname(declaration.getSourceFile().fileName).replace(/\\/g, "/");
  if (apiTs !== dirname && dirname.indexOf(apiTs) !== 0) {
    return undefined;
  }
  if ((ts.isMethodDeclaration(declaration) || ts.isFunctionDeclaration(declaration)) && !!declaration.name) {
    return declaration.name.getText();
  }
  return undefined;
}

function isCallExpression(node: ts.Node, typeChecker: ts.TypeChecker): node is ts.CallExpression {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const signature = typeChecker.getResolvedSignature(node as ts.CallExpression);
  if (typeof signature === 'undefined') {
    return false;
  }
  const { declaration } = signature;
  if (!declaration) {
    return false;
  }
  return (
    ts.isMethodDeclaration(declaration)
    || ts.isFunctionDeclaration(declaration)
  ) && !!declaration.name;
  }

let apiTs: string;

export function transformer(program: ts.Program) {
  apiTs = path.dirname(__dirname).replace(/\\/g, "/");  
  return (context: ts.TransformationContext) => (file: ts.Node) => visitNodeAndChildren(file, program, context);
}