import * as ts from 'typescript';
/*import * as crypto from 'crypto';
function hash(str: string): string {
  const h = crypto.createHash('sha256');

  h.update(str);

  return h.digest('hex');
}
*/

//import * as hash from 'object-hash';

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

      if (methodName == "SymbolFor") {

        console.log("Transforming SymbolFor", node.typeArguments[0]);

        if (!node.typeArguments) {
          throw new Error("No type arguments provided to `InterfaceSymbol<T>()`.");
        }
        let arg = node.typeArguments[0];

        if(ts.isIdentifier(arg)){       
          return createSymbolFor(arg.escapedText.toString());
        }
      }

      if (((methodName == "Inject" || methodName == "to" || methodName == "toAll" || methodName == "injectedInto") && typeArgs && typeArgs.length == 1 && methodArgs.length == 0)) {
        return createCallWithInjectedSymbol(node, typeChecker);
      }

      //if ((methodName == "toClass" && typeArgs && typeArgs.length == 1 && methodArgs.length == 0)) {
      //  return createCtorCallWithInjectedProviders(node, typeChecker);
      //}
    }
    else if (ts.isPropertyAccessExpression(node.expression)) {
      methodName = node.expression.name.escapedText.toString()

      if ((methodName == "bind" && typeArgs && typeArgs.length == 1 && methodArgs.length == 1)) {
        return createCallWithInjectedSymbol(node, typeChecker);
      }
      if (((methodName == "get" || methodName == "getAll") && typeArgs && typeArgs.length == 1 && methodArgs.length == 0)) {
        return createCallWithInjectedSymbol(node, typeChecker);
      }
    }
  }

  return node;
}

/*function createSymbolFor(type: ts.Type, typeChecker: ts.TypeChecker) {
  const symbol = type.symbol;

  if (!type.isClassOrInterface() && type.isClass()) {
    throw new Error("The type provided is not an interface"); ''
  }

  console.log("FLAGS:", type.flags);

  console.log("SYMBOL:", symbol);

  const decl = typeChecker.getDeclaredTypeOfSymbol(symbol);
  const props: any = decl.getProperties().map(x => x.escapedName);
  const sig = hash(JSON.stringify(props));
  const uid = decl.symbol.name + "_" + sig;

  return ts.createCall(ts.createIdentifier('Symbol.for'), [], [ts.createStringLiteral(uid)]);
}*/

function createSymbolFor(escapedName: string) {
  return ts.createCall(ts.createIdentifier('Symbol.for'), [], [ts.createStringLiteral(escapedName)]);
}

function createCallWithInjectedSymbol(node: ts.CallExpression, typeChecker: ts.TypeChecker, ...appendedParams: ts.Expression[]) {
  const typeArgument = node.typeArguments[0];
  //const type = typeChecker.getTypeFromTypeNode(typeArgument);
  //console.log("Identifier", typeArgument);

  if (ts.isTypeReferenceNode(typeArgument)) {

    const injectNode = createSymbolFor(typeArgument.getFullText());
    const args = [];

    args.push(injectNode);
    for (let arg of node.arguments) {
      args.push(arg);
    }
    args.push(...appendedParams);

    const nodeResult = ts.getMutableClone(node);

    nodeResult.arguments = ts.createNodeArray<ts.Expression>(args);

    //console.log("injected Symbol into call expression: ", node.getText() )

    return nodeResult;
  }
  return node;
}

/*function createCtorCallWithInjectedProviders(node: ts.CallExpression, typeChecker: ts.TypeChecker) {
  const typeArgument = node.typeArguments[0];
  const type = typeChecker.getTypeFromTypeNode(typeArgument);

  if (type.isClass() && ts.isTypeReferenceNode(typeArgument) && ts.isIdentifier(typeArgument.typeName)) {
    let ctors = getClassConstructSignatures(type, typeChecker);

    let ctor = ctors[0];
    let params = getConstructorParameters(ctor, typeChecker);

    if (params.findIndex(x => x === null) != -1) {
      throw Error(`class ${type.symbol.name}'s constructor cannot be inferred - use explicit providers`);
    }

    //super hacky...    
    let providerCalls = params.map(param => {
      return createSymbolFor(param, typeChecker)
    })

    const nodeResult = ts.getMutableClone(node);

    //console.log(typeArgument);

    nodeResult.typeArguments = ts.createNodeArray<ts.TypeNode>();
    nodeResult.arguments = ts.createNodeArray<ts.Expression>([
      typeArgument.typeName, ...providerCalls
    ]);
    return nodeResult;
  }

  return node;
}*/

/*function getClassConstructSignatures(type: ts.InterfaceType, typeChecker: ts.TypeChecker) {
  let symbol = type.symbol;
  let constructorType = typeChecker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
  return constructorType.getConstructSignatures();
}*/

/*function getConstructorParameters(ctor: ts.Signature, typeChecker: ts.TypeChecker) {
  let params: ts.Type[] = [];
  for (let param of ctor.parameters) {
    let paramDecl = param.declarations[0];
    if (ts.isParameter(paramDecl) && ts.isTypeReferenceNode(paramDecl.type)) {
      const symbol = typeChecker.getSymbolAtLocation(paramDecl.type.typeName);
      const type = typeChecker.getDeclaredTypeOfSymbol(symbol);
      params.push(type);
    } else {
      params.push(null);
    }
  }
  return params;
}*/

export default function transformer(program: ts.Program/*, opts?:{debug?: boolean}*/) {
  return (context: ts.TransformationContext) => (file: ts.Node) => visitNodeAndChildren(file, program, context);
}

