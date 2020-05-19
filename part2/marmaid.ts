import { map, zipWith, is } from "ramda";
import { Sexp, Token } from "s-expression";
import { allT, first, second, rest, isEmpty } from "../shared/list";
import { isArray, isString, isNumericString, isIdentifier } from "../shared/type-predicates";
import { parse as p, isSexpString, isToken } from "../shared/parser";
import { Result, makeOk, makeFailure, bind, mapResult, safe2 } from "../shared/result";
import { isSymbolSExp, isEmptySExp, isCompoundSExp } from './L4-value';
import { makeEmptySExp, makeSymbolSExp, SExpValue, makeCompoundSExp, valueToString } from './L4-value'
import {Parsed,isBoolExp,isNumExp,isStrExp,isLitExp,isVarRef,isProcExp,isIfExp,isAppExp,isPrimOp,isLetExp,isLetrecExp,isSetExp,isDefineExp,isProgram, isVarDecl, isAtomicExp, Exp, AppExp, IfExp} from './L4-ast'
import {Graph,Node, makeEdge, makeNodeRef,makeNodeDecl, isEdge, makeGraph, makeTD,GraphContent, makeAtomicGraph, Edge, CompoundGraph, makeCompoundGraph} from './marmaid-ast'

export const makeVarGen = (): (v: string) => string => {
    let count: number = 0;
    return (v: string) => {
        count++;
        return `${v}__${count}`;
    };
};

const AppExpGen = makeVarGen();
const IfExpGen = makeVarGen();
const AtomicGen = makeVarGen();
const boolGen = makeVarGen();
const numGen = makeVarGen();
const stringGen = makeVarGen();
const primOpGen = makeVarGen();
const varRefGen = makeVarGen();
const litGen = makeVarGen();
const procExp = makeVarGen();
const randsGen = makeVarGen();

export const mapL4toMermaid = (exp: Parsed): Result<Graph>=>
isProgram(exp) ? makeOk(makeGraph(makeTD(),map(convertExp,exp.exps))):
makeOk(convertExp(exp));


export const convertExp = (exp: Exp) : Node =>
isBoolExp(exp) ? makeNodeDecl("BoolExp(".concat(valueToString (exp.val)).concat(")"),boolGen(exp.tag)) :
isNumExp(exp) ? makeNodeDecl("NumExp(".concat(valueToString (exp.val)).concat(")"),numGen(exp.tag)) :
isStrExp(exp) ? makeNodeDecl("StrExp(".concat(valueToString (exp.val)).concat(")"),stringGen(exp.tag)) :
isLitExp(exp) ? makeNodeRef(litGen(valueToString(exp.val))) :
isVarRef(exp) ? makeNodeRef(varRefGen(exp.tag)) :
isPrimOp(exp) ? makeNodeDecl("PrimOp(".concat(valueToString (exp.op)).concat(")"),primOpGen(exp.tag)) :

isProcExp(exp) ? makeEdge(makeNodeDecl(":","args"),) :
isIfExp(exp) ? convertIfExp(exp) :
isAppExp(exp) ? convertAppExp(exp) :
isLetExp(exp) ?  :
isLetrecExp(exp) ?  :
isSetExp(exp) ?  :
isDefineExp(exp) ?  :
isProgram(exp) ?  :
"";


export const convertAppExp = (exp :AppExp): CompoundGraph => {
    const AppNode = makeNodeDecl("[AppExp]",AppExpGen("AppExp"));
    const ratorNode = makeNodeDecl(`[${exp.tag}()]`,procExp(exp.tag));
    const randsNode = makeNodeDecl(randsGen('rands'),"[:]");
    const AppRatorEdge = makeEdge(AppNode,convertExp(exp.rator),"rator");
    const AppRandsEdge = map(x=> makeEdge(randsNode,convertExp(x),"rands"),exp.rands);
    return makeCompoundGraph([AppRatorEdge].concat(AppRandsEdge));

}



export const convertIfExp = (exp : IfExp): CompoundGraph => {
    const ifnode = makeNodeDecl(exp.tag,IfExpGen(exp.tag));
    const testNode = makeNodeDecl(exp.test.tag,"Test");
    const testEdge = makeEdge(ifnode,convertExp(exp.test),"Test" );
    const thenNode = makeNodeDecl(exp.then.tag,"Then");
    const thenEdge = makeEdge(ifnode,convertExp(exp.then),"Then");
    const altNode = makeNodeDecl(exp.then.tag,"Then");
    const altEdge = makeEdge(ifnode,convertExp(exp.then),"Then");
    return makeCompoundGraph([testEdge,thenEdge,altEdge]);
}