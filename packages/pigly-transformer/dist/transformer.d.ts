import * as ts from 'typescript';
export declare function transformer(program: ts.Program): (context: ts.TransformationContext) => (file: ts.Node) => ts.Node;
