import * as ts from 'typescript';

/*function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node {
  return ts.visitEachChild(visitNode(node, program), childNode => visitNodeAndChildren(childNode, program, context), context);
}*/



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
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier('Symbol'),
      ts.factory.createIdentifier('for')
    ),
    [],
    [
      ts.factory.createStringLiteral(escapedName)
    ]
  )

  // return ts.createCall(ts.createIdentifier('Symbol.for'), [], [ts.createStringLiteral(escapedName)]);
}

function createTypeSymbolFromCallExpressionTypeArguments(node: ts.CallExpression, typeChecker: ts.TypeChecker) {
  let typeSymbol: ts.CallExpression;

  if (node.typeArguments && node.typeArguments[0]) {
    const typeArgument = node.typeArguments[0];

    if (ts.isTypeReferenceNode(typeArgument)) {
      //console.log("is type ref");
      /** crude brute-force escaping of the type argument */
      let typeString = typeArgument.getText().replace(/\s/g, '');
      typeSymbol = createSymbolFor(typeString);
    }
    else if (ts.isToken(typeArgument)) {
      //console.log("is token");
      switch (typeArgument.kind) {
        case ts.SyntaxKind.StringKeyword:
          typeSymbol = createSymbolFor("string");
          break;
        case ts.SyntaxKind.NumberKeyword:
          typeSymbol = createSymbolFor("number");
          break;
      }
    }else if(ts.isTypeQueryNode(typeArgument)){

      let symbol = typeChecker.getTypeAtLocation(typeArgument).symbol;
      if(symbol){
        let typeString = symbol.getEscapedName().toString().replace(/\s/g, '');
        typeSymbol = createSymbolFor(typeString);
      }
      //console.log("moo");
      //console.log(typeChecker.getTypeAtLocation(typeArgument.exprName));
      //console.log(typeArgument.exprName);
    }else{      
      //console.log("unknown", typeArgument.kind);
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


function createCallWithInjectedSymbol(node: ts.CallExpression, typeChecker: ts.TypeChecker, visit:(node: ts.Node)=>ts.Node) {

 // const type = typeChecker.getTypeFromTypeNode(typeArgument);
  //console.log("Identifier", typeArgument);

  let typeSymbol = createTypeSymbolFromCallExpressionTypeArguments(node, typeChecker);



  if (typeSymbol !== undefined) {
    const args = [];

    args.push(typeSymbol);
    for (let arg of node.arguments) {
      args.push(visit(arg));
    }
    //args.push(...appendedParams);

    //const nodeResult = ts.getMutableClone(node);

    // nodeResult.arguments = ts.createNodeArray<ts.Expression>(args);

    const nodeResult = ts.factory.createCallExpression(
      node.expression,
      null,
      args
    )

    //console.log("injected Symbol into call expression: ", node.getText() )

    return nodeResult;
  }

  return node;
}


function createSelfCtorCallWithInjectedProviders(node: ts.CallExpression, typeChecker: ts.TypeChecker) {

  //console.log(node);
  const ctorArg = node.arguments[0];
  const type = typeChecker.getTypeAtLocation(ctorArg);

  if (type.symbol == undefined) {
    throw Error(`class constructor cannot be located - use explicit providers or disable transpileOnly`);
  }

  if (type.symbol.valueDeclaration != null) {
    let ctors = getClassConstructSignatures(type as ts.InterfaceType, typeChecker);

    let ctor = ctors[0];

    let providerCalls = getConstructorProviders(ctor, typeChecker);

    if (providerCalls.findIndex(x => x === null) != -1) {
      throw Error(`class ${type.symbol.name}'s constructor cannot be inferred - use explicit providers`);
    }

    const nodeResult = ts.factory.createCallExpression(
      node.expression,
      [],
      [node.arguments[0], ...providerCalls]
    )

    //const nodeResult = ts.getMutableClone(node);

    //console.log(typeArgument);

    //nodeResult.typeArguments = ts.createNodeArray<ts.TypeNode>();
    // nodeResult.arguments = ts.createNodeArray<ts.Expression>([
    // node.arguments[0],
    // , ...providerCalls
    //]);
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
    ts.factory.createPropertyAssignment("service", symbol)
  ]

  if (name) {
    props.push(
      ts.factory.createPropertyAssignment("name", ts.factory.createStringLiteral(name))
    )
  }

  let request = ts.factory.createObjectLiteralExpression(props);
  let deref = (isArray) ? "toArray" : "first";

  let elmt = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier("ctx"), ts.factory.createIdentifier("resolve")),
        undefined,
        [request]), ts.factory.createIdentifier(deref)), undefined, []);

  return ts.factory.createArrowFunction(
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration([], [], undefined, 'ctx', undefined, ts.createTypeReferenceNode('any', []))
    ],
    undefined,
    undefined,
    elmt
  )
}

//https://stackoverflow.com/questions/48886508/typechecker-api-how-do-i-find-inferred-type-arguments-to-a-function

/* @internal */
const enum TypeMapKind {
  Simple,
  Array,
  Function,
  Composite,
  Merged,
}

/* @internal */
type TypeMapper =
  | { kind: TypeMapKind.Simple, source: ts.Type, target: ts.Type }
  | { kind: TypeMapKind.Array, sources: readonly ts.Type[], targets: readonly ts.Type[] | undefined }
  | { kind: TypeMapKind.Function, func: (t: ts.Type) => ts.Type }
  | { kind: TypeMapKind.Composite | TypeMapKind.Merged, mapper1: TypeMapper, mapper2: TypeMapper };


function typeMapper(mapper: TypeMapper, source: ts.Type): ts.Type {
  switch (mapper.kind) {
    case TypeMapKind.Simple:
      return mapper.target;
    case TypeMapKind.Array:
      throw Error("not implemented");
    case TypeMapKind.Function:
      return mapper.func(source);
    case TypeMapKind.Composite:
    case TypeMapKind.Merged:
      return typeMapper(mapper.mapper2, source);
  }
}

function inferTypeArguments(node: ts.CallExpression, typeChecker: ts.TypeChecker): ts.Type[] {
  const signature: ts.Signature = typeChecker.getResolvedSignature(node);
  const targetParams: ts.TypeParameter[] = signature['target'] && signature['target'].typeParameters;

  if (!targetParams) {
    return [];
  }

  if (signature['mapper'] == undefined)
    return targetParams;

  //typescript <= 3.8
  if (typeof signature['mapper'] == "function")
    return targetParams.map(p => signature['mapper'](p));
  //typescript >= 3.9.... 
  return targetParams.map(p => typeMapper(signature['mapper'] as TypeMapper, p));
}


//need to ensure imports still work for toClass<T>() - 
//https://github.com/Microsoft/TypeScript/issues/18369
export default function transformer(program: ts.Program/*, opts?:{debug?: boolean}*/) {
  const typeChecker = program.getTypeChecker();
  return (context: ts.TransformationContext) => {    
    function visit(node: ts.Node) {    
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
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
    
          if ((methodName == "toSelf" && methodArgs.length == 1)) {
            return createSelfCtorCallWithInjectedProviders(node, typeChecker);
          }
        }
        else if (ts.isPropertyAccessExpression(node.expression)) {
          methodName = node.expression.name.escapedText.toString()
    
          if ((methodName == "bind" && methodArgs.length == 1)) {
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
          if (((methodName == "get" || methodName == "getAll") && typeArgs && typeArgs.length == 1 && methodArgs.length == 0)) {
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
        }
      }
      return ts.visitEachChild(node, visit, context);
    }   
    
    return (sourceFile: ts.SourceFile) => ts.visitNode(sourceFile, visit);
  }
}



