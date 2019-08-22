import * as ts from 'typescript';
import * as crypto from 'crypto';


function hash(str: string): string {
  const h = crypto.createHash('sha256');

  h.update(str);

  return h.digest('hex');
}

function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node {
  return ts.visitEachChild(visitNode(node, program), childNode => visitNodeAndChildren(childNode, program, context), context);
}

function visitNode(node: ts.Node, program: ts.Program) {
  const typeChecker = program.getTypeChecker();

  if (isCallExpression(node, typeChecker)) {
    const methodName = getCallExpressionName(node, typeChecker);

    if (methodName === 'SymbolFor') {
      if (!node.typeArguments) {
        throw new Error("No type arguments provided to `InterfaceSymbol<T>()`.");
      }
      const typeArgument = node.typeArguments[0];
      const type = typeChecker.getTypeFromTypeNode(typeArgument);
      return createSymbolFor(type, typeChecker);

    }else if (methodName == "bind" && node.arguments.length == 1){
      if (!node.typeArguments) {
        throw new Error("No type arguments provided to `.bind<T>(...)`.");
      }
      return createCallWithInjectedSymbol(node, typeChecker);     
    }
    else if (methodName == "get" && node.arguments.length == 0){
      if (!node.typeArguments) {
        throw new Error("No type arguments provided to `.get<T>(...)`.");
      }
      return createCallWithInjectedSymbol(node, typeChecker);     
    }else if (methodName == "to" && node.arguments.length == 0){
      if (!node.typeArguments) {
        throw new Error("No type arguments provided to `.to<T>(...)`.");
      }
      return createCallWithInjectedSymbol(node, typeChecker);     
    }else if (methodName == "toAll" && node.arguments.length == 0){
      if (!node.typeArguments) {
        throw new Error("No type arguments provided to `.toAll<T>(...)`.");
      }
      return createCallWithInjectedSymbol(node, typeChecker);     
    }
  }
  return node;
}

function createSymbolFor(type: ts.Type, typeChecker: ts.TypeChecker) {
  const symbol = type.symbol;
  
  if (!type.isClassOrInterface() && type.isClass()) {
    throw new Error("The type provided is not an interface");''
  }

  const decl = typeChecker.getDeclaredTypeOfSymbol(symbol);
  const props:any = decl.getProperties().map(x=>x.escapedName);  
  const sig = hash(JSON.stringify(props));
  const uid = decl.symbol.name + "_" + sig;

  return ts.createCall(ts.createIdentifier('Symbol.for'), [], [ts.createStringLiteral(uid)]);
}

function createCallWithInjectedSymbol(node: ts.CallExpression, typeChecker: ts.TypeChecker){
  const typeArgument = node.typeArguments[0];
  const type = typeChecker.getTypeFromTypeNode(typeArgument);
  const injectNode = createSymbolFor(type, typeChecker);
  const newargs = [];

  newargs.push(injectNode);
  for(let arg of node.arguments){        
    newargs.push(arg);
  }   
  const newnode = ts.getMutableClone(node);

  newnode.arguments = ts.createNodeArray<ts.Expression>(newargs);

  return newnode;
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
export default function transformer(program: ts.Program) {
  return (context: ts.TransformationContext) => (file: ts.Node) => visitNodeAndChildren(file, program, context);
}

