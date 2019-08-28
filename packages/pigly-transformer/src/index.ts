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

  if (ts.isCallExpression(node)) {
    let methodArgs = node.arguments;
    let typeArgs = node.typeArguments;
    let methodName = undefined;

    if (ts.isIdentifier(node.expression)) {
      methodName = node.expression.escapedText.toString();

      if (!methodName) return node;

      if(methodName == "SymbolFor"){
        if (!node.typeArguments) {
          throw new Error("No type arguments provided to `InterfaceSymbol<T>()`.");
        }
        const typeArgument = node.typeArguments[0];
        const type = typeChecker.getTypeFromTypeNode(typeArgument);
        return createSymbolFor(type, typeChecker);
      }

      if (((methodName == "to" || methodName == "toAll") && typeArgs.length == 1 && methodArgs.length == 0)) {
        return createCallWithInjectedSymbol(node, typeChecker);
      }

      if ((methodName == "toClass" && typeArgs && typeArgs.length == 1 && methodArgs.length == 0)) {
        return createCtorCallWithInjectedProviders(node, typeChecker);
      }
    }
    else if (ts.isPropertyAccessExpression(node.expression)) {
      methodName = node.expression.name.escapedText.toString()

      if ((methodName == "bind" && typeArgs.length == 1 && methodArgs.length == 1)) {
        return createCallWithInjectedSymbol(node, typeChecker);
      }
      if (((methodName == "get" || methodName == "getAll") && typeArgs.length == 1 && methodArgs.length == 0)) {
        return createCallWithInjectedSymbol(node, typeChecker);
      }   
    }
  }

  return node;
}

function createSymbolFor(type: ts.Type, typeChecker: ts.TypeChecker) {
  const symbol = type.symbol;

  if (!type.isClassOrInterface() && type.isClass()) {
    throw new Error("The type provided is not an interface"); ''
  }

  const decl = typeChecker.getDeclaredTypeOfSymbol(symbol);
  const props: any = decl.getProperties().map(x => x.escapedName);
  const sig = hash(JSON.stringify(props));
  const uid = decl.symbol.name + "_" + sig;

  return ts.createCall(ts.createIdentifier('Symbol.for'), [], [ts.createStringLiteral(uid)]);
}

function createCallWithInjectedSymbol(node: ts.CallExpression, typeChecker: ts.TypeChecker) {
  const typeArgument = node.typeArguments[0];
  const type = typeChecker.getTypeFromTypeNode(typeArgument);
  const injectNode = createSymbolFor(type, typeChecker);
  const args = [];

  args.push(injectNode);
  for (let arg of node.arguments) {
    args.push(arg);
  }
  const nodeResult = ts.getMutableClone(node);

  nodeResult.arguments = ts.createNodeArray<ts.Expression>(args);

  //console.log("injected Symbol into call expression: ", node.getText() )

  return nodeResult;
}

function createCtorCallWithInjectedProviders(node: ts.CallExpression, typeChecker: ts.TypeChecker) {
  const typeArgument = node.typeArguments[0];
  const type = typeChecker.getTypeFromTypeNode(typeArgument);

  console.log(type);  

  return node;
}


export default function transformer(program: ts.Program/*, opts?:{debug?: boolean}*/) {
  return (context: ts.TransformationContext) => (file: ts.Node) => visitNodeAndChildren(file, program, context);
}

