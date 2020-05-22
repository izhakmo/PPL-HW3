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
    GraphContent, makeAtomicGraph, Edge, CompoundGraph, makeCompoundGraph, makeEdgeLabel, NodeDecl, NodeRef} from './marmaid-ast'
import {mapL4toMermaid} from './marmaid'



let mermaidAST: Result<Graph> = bind(parseL4("(L4 (+ 1 2) (define x 5) (+ x 5))"), (exp: Parsed) => mapL4toMermaid(exp))
isOk(mermaidAST) ? console.log(JSON.stringify(mermaidAST.value, null, '\t')) : console.log(":(")