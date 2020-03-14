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
        return createTypeSymbolFromCallExpressionTypeArguments(node, typeChecker);       
      }

      if (((methodName == "Inject" || methodName == "to" || methodName == "toAll" || methodName == "injectedInto" || methodName == "hasAncestor") && typeArgs && typeArgs.length == 1 && methodArgs.length == 0)) {
        return createCallWithInjectedSymbol(node, typeChecker);
      }

      if ((methodName == "toSelf" && methodArgs.length == 1)) {
        return createSelfCtorCallWithInjectedProviders(node, typeChecker);
      }
    }
    else if (ts.isPropertyAccessExpression(node.expression)) {
      methodName = node.expression.name.escapedText.toString()

      if ((methodName == "bind" && methodArgs.length == 1)) {
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

function createTypeSymbolFromCallExpressionTypeArguments(node: ts.CallExpression, typeChecker: ts.TypeChecker){
  let typeSymbol: ts.CallExpression;

  if (node.typeArguments && node.typeArguments[0]) {
    const typeArgument = node.typeArguments[0];

    if (ts.isTypeReferenceNode(typeArgument)) {
      /** crude brute-force escaping of the type argument */
      let typeString = typeArgument.getText().replace(/\s/g, '');
      typeSymbol = createSymbolFor(typeString);
    }
    else if (ts.isToken(typeArgument)) {
      switch (typeArgument.kind) {
        case ts.SyntaxKind.StringKeyword:
          typeSymbol = createSymbolFor("string");
          break;
        case ts.SyntaxKind.NumberKeyword:
          typeSymbol = createSymbolFor("number");
          break;
      }
    }
  }
  else {
    let typeArgument = inferTypeArguments(node, typeChecker);

    if (typeArgument && typeArgument[0]) {
      typeSymbol = createSymbolFor(typeArgument[0].symbol.escapedName.toString());
    }

    /*if (ts.isTypeReferenceNode(typeArgument)) {
      typeSymbol = createSymbolFor(typeArgument.getFullText());
    } else if (ts.isToken(typeArgument)) {
      switch (typeArgument.kind) {
        case ts.SyntaxKind.StringKeyword:
          typeSymbol = createSymbolFor("string");
          break;
      }
    }*/
  }

  return typeSymbol;
}


function createCallWithInjectedSymbol(node: ts.CallExpression, typeChecker: ts.TypeChecker, ...appendedParams: ts.Expression[]) {

  //const type = typeChecker.getTypeFromTypeNode(typeArgument);
  //console.log("Identifier", typeArgument);

  let typeSymbol = createTypeSymbolFromCallExpressionTypeArguments(node, typeChecker);



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


function createSelfCtorCallWithInjectedProviders(node: ts.CallExpression, typeChecker: ts.TypeChecker) {

  //console.log(node);
  const ctorArg = node.arguments[0];
  const type = typeChecker.getTypeAtLocation(ctorArg);

  if(type.symbol == undefined){
    throw Error(`class constructor cannot be located - use explicit providers or disable transpileOnly`);
  }

  if (type.symbol.valueDeclaration != null) {
    let ctors = getClassConstructSignatures(type as ts.InterfaceType, typeChecker);

    let ctor = ctors[0];

    let providerCalls = getConstructorProviders(ctor, typeChecker);

    if (providerCalls.findIndex(x => x === null) != -1) {
      throw Error(`class ${type.symbol.name}'s constructor cannot be inferred - use explicit providers`);
    }


    const nodeResult = ts.getMutableClone(node);

    //console.log(typeArgument);

    nodeResult.typeArguments = ts.createNodeArray<ts.TypeNode>();
    nodeResult.arguments = ts.createNodeArray<ts.Expression>([
      node.arguments[0],
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

function getConstructorProviders(ctor: ts.Signature, typeChecker: ts.TypeChecker): ts.Expression[] {
  let params: ts.Expression[] = [];
  for (let param of ctor.parameters) {
    let paramDecl = param.declarations[0];

    if (ts.isParameter(paramDecl)) {

      let paramType = paramDecl.type;
      let paramName = paramDecl.name;
      let isArray = false;

      if (ts.isArrayTypeNode(paramType)) {
        paramType = paramType.elementType;
        isArray = true;
      }

      if (ts.isTypeReferenceNode(paramType)) {
        const symbol = typeChecker.getSymbolAtLocation(paramType.typeName);
        const type = typeChecker.getDeclaredTypeOfSymbol(symbol);
        params.push(createProvider(createSymbolFor(type.symbol.name), isArray, paramName.getText()));

      } else if (ts.isToken(paramDecl.type)) {
        switch (paramDecl.type.kind) {
          case ts.SyntaxKind.StringKeyword:
            params.push(createProvider(createSymbolFor("string"), isArray, paramName.getText()));
            break;
          case ts.SyntaxKind.NumberKeyword:
            params.push(createProvider(createSymbolFor("number"), isArray));
            break;
          default:
            params.push(null);
        }
      }
      else {
        params.push(null);
      }
    }
  }
  return params;
}

function createProvider(symbol: ts.CallExpression, isArray: boolean, name?: string) {
  let props: ts.ObjectLiteralElementLike[] = [
    ts.createPropertyAssignment("service", symbol)
  ]

  if (name) {
    props.push(
      ts.createPropertyAssignment("name", ts.createStringLiteral(name))
    )
  }

  let request = ts.createObjectLiteral(props);
  let deref = (isArray) ? "toArray" : "first";

  let elmt = ts.createCall(
      ts.createPropertyAccess(
        ts.createCall(
          ts.createPropertyAccess(
            ts.createIdentifier("ctx"), ts.createIdentifier("resolve")),
          undefined,
          [request]), ts.createIdentifier(deref)), undefined, []);

  return ts.createArrowFunction(
    undefined,
    undefined,
    [
      ts.createParameter([], [], undefined, 'ctx', undefined, ts.createTypeReferenceNode('any', []))
    ],
    undefined,
    undefined,
    elmt
  )
}

//https://stackoverflow.com/questions/48886508/typechecker-api-how-do-i-find-inferred-type-arguments-to-a-function
type TypeMapper = (t: ts.TypeParameter) => ts.Type;
function inferTypeArguments(node: ts.CallExpression, typeChecker: ts.TypeChecker): ts.Type[] {
  const signature = typeChecker.getResolvedSignature(node);
  const targetParams: ts.TypeParameter[] = signature['target'] && signature['target'].typeParameters;
  if (!targetParams) {
    return [];
  }
  const mapper: TypeMapper = signature['mapper'];
  return mapper
    ? targetParams.map(p => mapper(p))
    : targetParams;
}


//need to ensure imports still work for toClass<T>() - 
//https://github.com/Microsoft/TypeScript/issues/18369
export default function transformer(program: ts.Program/*, opts?:{debug?: boolean}*/) {
  return (context: ts.TransformationContext) => (file: ts.Node) => visitNodeAndChildren(file, program, context);
}

