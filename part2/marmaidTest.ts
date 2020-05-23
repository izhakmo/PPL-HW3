import { map, is, reduce, zip, flatten } from "ramda";
import { Sexp, Token } from "s-expression";
import { allT, first, second, rest, isEmpty } from "../shared/list";
import { isArray, isString, isNumericString, isIdentifier, isNumber, isBoolean } from "../shared/type-predicates";
import { parse as p, isSexpString, isToken } from "../shared/parser";
import { Result, makeOk, isOk, makeFailure, bind, mapResult, safe2 } from "../shared/result";
import { isSymbolSExp, isEmptySExp, isCompoundSExp, isClosure } from './L4-value';
import { makeEmptySExp, makeSymbolSExp, SExpValue, makeCompoundSExp, valueToString } from './L4-value'
import {Parsed,isBoolExp,isNumExp,isStrExp,isLitExp,isVarRef,isProcExp,isIfExp,
    isAppExp,isPrimOp,isLetExp,isLetrecExp,isSetExp,isDefineExp,
    isProgram, isVarDecl, isAtomicExp, Exp, AppExp, IfExp, ProcExp, DefineExp,parseL4,
    CompoundExp,isCompoundExp, CExp, AtomicExp, LitExp, SetExp, LetrecExp, Binding, isExp, Program} from './L4-ast'
import {Graph,Node, makeEdge, makeNodeRef,makeNodeDecl, isEdge, makeGraph, makeTD,
    GraphContent, makeAtomicGraph, Edge, CompoundGraph, makeCompoundGraph, NodeDecl, NodeRef} from './marmaid-ast'
import {mapL4toMermaid,unparseMermaid, ParseProgramOrExp} from './marmaid'
import { writeFile } from "fs";


// let mermaidAST: Result<Graph> = bind (bind(p ("(* (+ 1 2) (+ 3 2))"), ParseProgramOrExp),mapL4toMermaid)
let mermaidAST: Result<Graph> = bind (bind(p ("(define my-list '(1 2))"), ParseProgramOrExp),mapL4toMermaid)
isOk(mermaidAST) ? console.log(JSON.stringify(mermaidAST.value, null, '\t')) : console.log(":(")
bind(mermaidAST, (graph: Graph) =>
            bind(unparseMermaid(graph),
                (graphStr: string) => {
                    writeFile ("graph1.mmd", graphStr, (err) =>
                        err ? console.error("Could not write to File", err.message) : null);
                    return makeOk("Meh");
                }));