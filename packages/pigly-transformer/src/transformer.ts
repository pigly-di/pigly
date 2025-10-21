import * as ts from 'typescript';

/**
 * Check if a node represents a Symbol service type
 */
function isServiceType(node: ts.Node, typeChecker: ts.TypeChecker): boolean {
  const type = typeChecker.getTypeAtLocation(node);
  const flags = type.getFlags();

  return flags === ts.TypeFlags.ESSymbol;
}

/**
 * Create a Symbol.for("typeName") call expression
 */
function createSymbolFor(escapedName: string): ts.CallExpression {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier('Symbol'),
      ts.factory.createIdentifier('for')
    ),
    [],
    [
      ts.factory.createStringLiteral(escapedName)
    ]
  );
}

/**
 * Extract type from call expression type arguments and create Symbol.for() call
 * Returns undefined if type cannot be extracted
 */
function createTypeSymbolFromCallExpressionTypeArguments(node: ts.CallExpression, typeChecker: ts.TypeChecker): ts.CallExpression | undefined {
  let typeSymbol: ts.CallExpression | undefined;

  if (node.typeArguments && node.typeArguments[0]) {
    const typeArgument = node.typeArguments[0];

    if (ts.isTypeReferenceNode(typeArgument)) {
      // Normalize type string by removing whitespace
      const typeString = typeArgument.getText().replace(/\s/g, '');
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
    } else if (ts.isTypeQueryNode(typeArgument)) {
      const typeString = typeArgument.getText();
      typeSymbol = createSymbolFor(typeString);
    }
  }
  else {
    const typeArgument = inferTypeArguments(node, typeChecker);

    if (typeArgument && typeArgument[0] && typeArgument[0].symbol) {
      typeSymbol = createSymbolFor(typeArgument[0].symbol.escapedName.toString());
    }
  }

  return typeSymbol;
}


/**
 * Create a call expression with the type parameter converted to a Symbol.for() argument
 */
function createCallWithInjectedSymbol(node: ts.CallExpression, typeChecker: ts.TypeChecker, visit: (node: ts.Node) => ts.Node): ts.CallExpression | ts.Node {
  const typeSymbol = createTypeSymbolFromCallExpressionTypeArguments(node, typeChecker);

  if (typeSymbol !== undefined) {
    const args: ts.Expression[] = [typeSymbol];
    
    for (const arg of node.arguments) {
      args.push(visit(arg) as ts.Expression);
    }

    return ts.factory.createCallExpression(
      node.expression,
      undefined,
      args
    );
  }

  return node;
}


/**
 * Create toSelf call with auto-inferred constructor parameters
 */
function createSelfCtorCallWithInjectedProviders(node: ts.CallExpression, typeChecker: ts.TypeChecker): ts.CallExpression | ts.Node {
  if (!node.arguments[0]) {
    return node;
  }

  const ctorArg = node.arguments[0];
  const type = typeChecker.getTypeAtLocation(ctorArg);

  if (!type.symbol) {
    throw new Error(`class constructor cannot be located - use explicit providers or disable transpileOnly`);
  }

  if (!type.symbol.valueDeclaration) {
    return node;
  }

  const ctors = getClassConstructSignatures(type as ts.InterfaceType, typeChecker);
  
  if (!ctors || ctors.length === 0) {
    throw new Error(`class ${type.symbol.name} has no constructor signature`);
  }

  const ctor = ctors[0];
  const providerCalls = getConstructorProviders(ctor, typeChecker);

  if (providerCalls.findIndex(x => x === null) !== -1) {
    throw new Error(`class ${type.symbol.name}'s constructor cannot be inferred - use explicit providers`);
  }

  return ts.factory.createCallExpression(
    node.expression,
    undefined,
    [node.arguments[0], ...providerCalls]
  );
}

/**
 * Get constructor signatures for a class type
 */
function getClassConstructSignatures(type: ts.InterfaceType, typeChecker: ts.TypeChecker): readonly ts.Signature[] {
  const symbol = type.symbol;
  
  if (!symbol.valueDeclaration) {
    return [];
  }
  
  const constructorType = typeChecker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
  return constructorType.getConstructSignatures();
}

/**
 * Generate provider calls for constructor parameters
 * Returns null for parameters that cannot be inferred
 */
function getConstructorProviders(ctor: ts.Signature, typeChecker: ts.TypeChecker): (ts.Expression | null)[] {
  const params: (ts.Expression | null)[] = [];
  
  for (const param of ctor.parameters) {
    if (!param.declarations || param.declarations.length === 0) {
      params.push(null);
      continue;
    }

    const paramDecl = param.declarations[0];

    if (!ts.isParameter(paramDecl) || !paramDecl.type) {
      params.push(null);
      continue;
    }

    let paramType = paramDecl.type;
    const paramName = paramDecl.name;
    let isArray = false;

    if (ts.isArrayTypeNode(paramType)) {
      paramType = paramType.elementType;
      isArray = true;
    }

    if (ts.isTypeReferenceNode(paramType)) {
      const symbol = typeChecker.getSymbolAtLocation(paramType.typeName);
      
      if (!symbol) {
        params.push(null);
        continue;
      }
      
      const type = typeChecker.getDeclaredTypeOfSymbol(symbol);
      
      if (!type.symbol) {
        params.push(null);
        continue;
      }
      
      params.push(createProvider(createSymbolFor(type.symbol.name), isArray, paramName.getText()));
    } else if (ts.isToken(paramType)) {
      switch (paramType.kind) {
        case ts.SyntaxKind.StringKeyword:
          params.push(createProvider(createSymbolFor("string"), isArray, paramName.getText()));
          break;
        case ts.SyntaxKind.NumberKeyword:
          params.push(createProvider(createSymbolFor("number"), isArray, paramName.getText()));
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

/**
 * Create a provider arrow function for dependency resolution
 */
function createProvider(symbol: ts.CallExpression, isArray: boolean, name?: string): ts.ArrowFunction {
  const props: ts.ObjectLiteralElementLike[] = [
    ts.factory.createPropertyAssignment("service", symbol)
  ];

  if (name) {
    props.push(
      ts.factory.createPropertyAssignment("name", ts.factory.createStringLiteral(name))
    );
  }

  const request = ts.factory.createObjectLiteralExpression(props);
  const deref = isArray ? "toArray" : "first";

  const elmt = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier("ctx"), 
          ts.factory.createIdentifier("resolve")
        ),
        undefined,
        [request]
      ), 
      ts.factory.createIdentifier(deref)
    ), 
    undefined, 
    []
  );

  return ts.factory.createArrowFunction(
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined, 
        undefined, 
        "ctx", 
        undefined,  
        ts.factory.createTypeReferenceNode('any', [])
      )
    ],
    undefined,
    undefined,
    elmt
  );
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

/**
 * Apply type mapper to a source type (recursive for composite mappers)
 */
function typeMapper(mapper: TypeMapper, source: ts.Type): ts.Type {
  switch (mapper.kind) {
    case TypeMapKind.Simple:
      return mapper.target;
    case TypeMapKind.Array:
      throw new Error("TypeMapKind.Array not implemented");
    case TypeMapKind.Function:
      return mapper.func(source);
    case TypeMapKind.Composite:
    case TypeMapKind.Merged:
      return typeMapper(mapper.mapper2, source);
  }
}

/**
 * Infer type arguments from a call expression using internal TypeScript APIs
 * Note: Accesses private TypeScript compiler internals - may break across versions
 */
function inferTypeArguments(node: ts.CallExpression, typeChecker: ts.TypeChecker): ts.Type[] {
  const signature: ts.Signature = typeChecker.getResolvedSignature(node);
  const targetParams: ts.TypeParameter[] = signature['target'] && signature['target'].typeParameters;

  if (!targetParams) {
    return [];
  }

  if (signature['mapper'] === undefined) {
    return targetParams;
  }

  // TypeScript <= 3.8
  if (typeof signature['mapper'] === "function") {
    return targetParams.map(p => signature['mapper'](p));
  }
  
  // TypeScript >= 3.9
  return targetParams.map(p => typeMapper(signature['mapper'] as TypeMapper, p));
}

/**
 * TypeScript AST transformer for Pigly dependency injection
 * Converts type parameters to Symbol.for() calls at compile time
 * 
 * @see https://github.com/Microsoft/TypeScript/issues/18369
 */
export function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  const typeChecker = program.getTypeChecker();
  const debug = process.env.PIGLY_DEBUG === 'true';
  
  function log(...args: any[]): void {
    if (debug) {
      console.log('[PIGLY_TRANSFORM]', ...args);
    }
  }

  return ((context: ts.TransformationContext) => {    
    function visit(node: ts.Node): ts.Node {    
      if (ts.isCallExpression(node)) {
        const methodArgs = node.arguments;
        const typeArgs = node.typeArguments;
        let methodName: string | undefined;
    
        if (ts.isIdentifier(node.expression)) {          
          methodName = node.expression.escapedText.toString();

          if (!methodName) {
            return node;
          }
          
          log(`Checking identifier method: ${methodName}, typeArgs: ${typeArgs?.length}, methodArgs: ${methodArgs.length}`);
              
          if (methodName === "SymbolFor") {
            log(`Transforming SymbolFor<T>()`);
            return createTypeSymbolFromCallExpressionTypeArguments(node, typeChecker) ?? node;
          }
    
          // Legacy: Standalone function calls like to<T>(), toAll<T>(), injectedInto<T>(), etc.
          if ((methodName === "Inject" || methodName === "to" || methodName === "toAll" || methodName === "injectedInto" || methodName === "hasAncestor") && typeArgs && typeArgs.length === 1 && methodArgs.length === 0) {
            log(`Transforming standalone ${methodName}<T>() to ${methodName}(Symbol.for("T"))`);
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
    
          // Legacy: toSelf(Constructor) with auto-inference
          if (methodName === "toSelf" && methodArgs.length === 1) {
            log(`Transforming toSelf(${methodArgs[0].getText()}) with constructor inference`);
            return createSelfCtorCallWithInjectedProviders(node, typeChecker);
          }
        }
        else if (ts.isPropertyAccessExpression(node.expression)) {
          methodName = node.expression.name.escapedText.toString();
          const objectName = node.expression.expression.getText();
          
          log(`Checking property method: ${objectName}.${methodName}, typeArgs: ${typeArgs?.length}, methodArgs: ${methodArgs.length}`);
          
          // Legacy: Old Kernel.bind<T>(provider) pattern
          if (methodName === "bind" && methodArgs.length > 0 && !isServiceType(methodArgs[0], typeChecker)) {  
            log(`Transforming legacy bind<T>(provider) pattern`);
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
          
          // StandardKernel: kernel.bind<T>() with no arguments
          if (methodName === "bind" && typeArgs && typeArgs.length === 1 && methodArgs.length === 0) {
            log(`Transforming bind<T>() to bind(Symbol.for("T"))`);
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
          
          // StandardKernel: kernel.rebind<T>() with no arguments
          if (methodName === "rebind" && typeArgs && typeArgs.length === 1 && methodArgs.length === 0) {
            log(`Transforming rebind<T>() to rebind(Symbol.for("T"))`);
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
          
          // StandardKernel: inject.to<T>(), fluentBuilder.to<T>()
          if (methodName === "to" && typeArgs && typeArgs.length === 1 && methodArgs.length === 0) {
            log(`Transforming .to<T>() to .to(Symbol.for("T"))`);
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
          
          // StandardKernel: inject.toClass<T>(), fluentBuilder.toClass<T>()
          if (methodName === "toClass" && typeArgs && typeArgs.length === 1) {
            log(`Transforming .toClass<T>() type parameter`);
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
          
          // StandardKernel: inject.toFunc<T>(), fluentBuilder.toFunc<T>()
          if (methodName === "toFunc" && typeArgs && typeArgs.length === 1) {
            log(`Transforming .toFunc<T>() type parameter`);
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
          
          // kernel.get<T>(), kernel.getAll<T>(), kernel.resolve<T>()
          if ((methodName === "get" || methodName === "getAll" || methodName === "resolve") && typeArgs && typeArgs.length === 1 && methodArgs.length === 0) {
            log(`Transforming ${methodName}<T>() to ${methodName}(Symbol.for("T"))`);
            return createCallWithInjectedSymbol(node, typeChecker, visit);
          }
        }
      }
      return ts.visitEachChild(node, visit, context);
    }   
    
    return (sourceFile: ts.SourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
  }) as ts.TransformerFactory<ts.SourceFile>;
}
