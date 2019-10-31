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

  //if (ts.isImportDeclaration(node)) {
  //  console.log("IMPORT", node);
  //}

  ////if(ts.isVariableDeclaration(node)){
  //console.log("VARIABLE:", node);
  //}

  if (ts.isCallExpression(node)) {
    let methodArgs = node.arguments;
    let typeArgs = node.typeArguments;
    let methodName = undefined;

    if (ts.isIdentifier(node.expression)) {
      methodName = node.expression.escapedText.toString();

      if (!methodName) return node;

      if (methodName == "SymbolFor") {

        //console.log("Transforming SymbolFor", node.typeArguments[0]);

        if (!node.typeArguments) {
          throw new Error("No type arguments provided to `InterfaceSymbol<T>()`.");
        }
        let arg = node.typeArguments[0];

        if (ts.isIdentifier(arg)) {
          return createSymbolFor(arg.escapedText.toString());
        }
      }

      if (((methodName == "Inject" || methodName == "to" || methodName == "toAll" || methodName == "injectedInto") && typeArgs && typeArgs.length == 1 && methodArgs.length == 0)) {
        return createCallWithInjectedSymbol(node, typeChecker);
      }

      if ((methodName == "toClass" && typeArgs && typeArgs.length == 1 && methodArgs.length == 0)) {
        return createCtorCallWithInjectedProviders(node, typeChecker);
      }
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

  let typeSymbol: ts.CallExpression;

  if (ts.isTypeReferenceNode(typeArgument)) {
    typeSymbol = createSymbolFor(typeArgument.getFullText());
  } else if (ts.isToken(typeArgument)) {
    switch (typeArgument.kind) {
      case ts.SyntaxKind.StringKeyword:
        typeSymbol = createSymbolFor("string");
        break;
    }
  }

  if (typeSymbol !== undefined) {
    const args = [];

    args.push(typeSymbol);
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


function createCtorCallWithInjectedProviders(node: ts.CallExpression, typeChecker: ts.TypeChecker) {
  const typeArgument = node.typeArguments[0];
  const type = typeChecker.getTypeFromTypeNode(typeArgument);

  if (type.isClass() && ts.isTypeReferenceNode(typeArgument) && ts.isIdentifier(typeArgument.typeName)) {
    let ctors = getClassConstructSignatures(type, typeChecker);

    let ctor = ctors[0];

    let params = getConstructorParameters(ctor, typeChecker);

    //console.log(ctor);

    if (params.findIndex(x => x === null) != -1) {
      throw Error(`class ${type.symbol.name}'s constructor cannot be inferred - use explicit providers`);
    }

    let providerCalls = params.map(param => {
      return ts.createArrowFunction(
        undefined,
        undefined,
        [
          ts.createParameter([], [], null, 'ctx', null, ts.createTypeReferenceNode('any', []))
        ],
        undefined,
        undefined,
        ts.createElementAccess(
          ts.createCall(
            ts.createPropertyAccess(
              ts.createIdentifier("ctx"), ts.createIdentifier("resolve")),
            undefined,
            [param]
          ), 0))
    })

    const nodeResult = ts.getMutableClone(node);



    //console.log(typeArgument);

    nodeResult.typeArguments = ts.createNodeArray<ts.TypeNode>();
    nodeResult.arguments = ts.createNodeArray<ts.Expression>([
      ts.createAsExpression(typeArgument.typeName, typeArgument)
      , ...providerCalls
    ]);
    return nodeResult;
  }

  return node;
}

function getClassConstructSignatures(type: ts.InterfaceType, typeChecker: ts.TypeChecker) {
  let symbol = type.symbol;
  let constructorType = typeChecker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
  return constructorType.getConstructSignatures();
}

function getConstructorParameters(ctor: ts.Signature, typeChecker: ts.TypeChecker) {
  let params: ts.CallExpression[] = [];
  for (let param of ctor.parameters) {
    let paramDecl = param.declarations[0];

    ts.createToken(ts.SyntaxKind.StringKeyword)
    if (ts.isParameter(paramDecl) && ts.isTypeReferenceNode(paramDecl.type)) {
      const symbol = typeChecker.getSymbolAtLocation(paramDecl.type.typeName);
      const type = typeChecker.getDeclaredTypeOfSymbol(symbol);
      params.push(createSymbolFor(type.symbol.name));

    } else if (ts.isParameter(paramDecl) && ts.isToken(paramDecl.type)) {
      switch (paramDecl.type.kind) {
        case ts.SyntaxKind.StringKeyword:
          params.push(createSymbolFor("string"));
          break;
        default:
          params.push(null);
      }
    }
    else {
      params.push(null);
    }
  }
  return params;
}
//need to ensure imports still work for toClass<T>() - 
//https://github.com/Microsoft/TypeScript/issues/18369
export default function transformer(program: ts.Program/*, opts?:{debug?: boolean}*/) {
  return (context: ts.TransformationContext) => (file: ts.Node) => visitNodeAndChildren(file, program, context);
}

