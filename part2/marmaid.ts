import { map, zipWith, is, reduce, zip } from "ramda";
import { Sexp, Token } from "s-expression";
import { allT, first, second, rest, isEmpty } from "../shared/list";
import { isArray, isString, isNumericString, isIdentifier } from "../shared/type-predicates";
import { parse as p, isSexpString, isToken } from "../shared/parser";
import { Result, makeOk, makeFailure, bind, mapResult, safe2 } from "../shared/result";
import { isSymbolSExp, isEmptySExp, isCompoundSExp } from './L4-value';
import { makeEmptySExp, makeSymbolSExp, SExpValue, makeCompoundSExp, valueToString } from './L4-value'
import {Parsed,isBoolExp,isNumExp,isStrExp,isLitExp,isVarRef,isProcExp,isIfExp,
    isAppExp,isPrimOp,isLetExp,isLetrecExp,isSetExp,isDefineExp,
    isProgram, isVarDecl, isAtomicExp, Exp, AppExp, IfExp, ProcExp, DefineExp,
    CompoundExp,isCompoundExp, CExp, AtomicExp} from './L4-ast'
import {Graph,Node, makeEdge, makeNodeRef,makeNodeDecl, isEdge, makeGraph, makeTD,
    GraphContent, makeAtomicGraph, Edge, CompoundGraph, makeCompoundGraph, makeEdgeLabel, NodeDecl, NodeRef} from './marmaid-ast'

export const makeVarGen = (): (v: string) => string => {
    let count: number = 0;
    return (v: string) => {
        count++;
        return `${v}__${count}`;
    };
};

const AppExpGen = makeVarGen();
const IfExpGen = makeVarGen();
const boolGen = makeVarGen();
const numGen = makeVarGen();
const strGen = makeVarGen();
const primOpGen = makeVarGen();
const varRefGen = makeVarGen();
const litGen = makeVarGen();
const procExpGen = makeVarGen();
const ratorGen = makeVarGen();
const randsGen = makeVarGen();
const defineGen = makeVarGen();
const paramsGen = makeVarGen();
const bodyGen = makeVarGen();
const testGen = makeVarGen();
const thenGen = makeVarGen();
const altGen = makeVarGen();
const varDeclGen = makeVarGen();
const letGen = makeVarGen();
const letRecGen = makeVarGen();
const setGen = makeVarGen();



export const mapL4toMermaid = (exp: Parsed): Result<Graph>=>
isProgram(exp) ? makeOk(makeGraph(makeTD(),map(convertExp,exp.exps))):
makeOk(convertExp(exp));


export const convertExp = (exp: Exp, node :Node) : Edge[] =>
isBoolExp(exp) ? makeNodeDecl("BoolExp(".concat(valueToString (exp.val)).concat(")"),boolGen(exp.tag)) :
isNumExp(exp) ? makeNodeDecl("NumExp(".concat(valueToString (exp.val)).concat(")"),numGen(exp.tag)) :
isStrExp(exp) ? makeNodeDecl("StrExp(".concat(valueToString (exp.val)).concat(")"),strGen(exp.tag)) :
isLitExp(exp) ? makeNodeRef(litGen(valueToString(exp.val))) :
isVarRef(exp) ? makeNodeRef(varRefGen(exp.tag)) :
isPrimOp(exp) ? makeNodeDecl("PrimOp(".concat(valueToString (exp.op)).concat(")"),primOpGen(exp.tag)) :

isProcExp(exp) ? convertProcExp(exp,makeNodeDecl(procExpGen(`${exp.tag}`),`${exp.tag}`)) :
isIfExp(exp) ? convertIfExp(exp,makeNodeDecl(IfExpGen(`${exp.tag}`),`${exp.tag}`)) :
isAppExp(exp) ? convertAppExp(exp,makeNodeDecl(AppExpGen(`${exp.tag}`),`${exp.tag}`)) :
isLetExp(exp) ?  : 
isLetrecExp(exp) ?  :
isSetExp(exp) ?  :
isDefineExp(exp) ?  : convertDefine(exp,makeNodeDecl(AppExpGen(`${exp.tag}`),`${exp.tag}`))
isProgram(exp) ?  :
"";


export const convertProcExp = (exp : ProcExp, node: Node): Edge[] => {
    // const procNode = makeNodeDecl(procExpGen(exp.tag),`[${exp.tag}]`);
    //params, bodys
    // const paramsNode = makeNodeDecl(paramsGen("Params"),`[:]`);
    // const bodyNode = makeNodeDecl(bodyGen("Body"),`[:]`);
    const procParamsEdge = makeEdge(node,makeNodeDecl(paramsGen(`Params`),`[:]`),makeEdgeLabel("args"));
    const procBodyEdge = makeEdge(makeNodeRef( node.id),makeNodeDecl(bodyGen(`Body`),`[:]`),makeEdgeLabel("body"));
    const paramsTree = map(x=> makeEdge(makeNodeRef(procParamsEdge.to.id),makeNodeDecl(varDeclGen(`VarDecl`),`varDecl(${x})`)),exp.args);
    const bodyTree = map(x=> makeEdge(makeNodeRef(procBodyEdge.to.id),nodeMaker(exp)),exp.body);

    const expNodeArr = zip(exp.body,bodyTree);

    const finalBodyTree = expNodeArr.reduce((acc:Edge[],cur)=> ((isAtomicExp(cur[0])) ?acc  :acc.concat(convertExp(cur[0],cur[1].to))),[] ); //what sould i if a body is compound?????
    
    return [procParamsEdge,procBodyEdge].concat(paramsTree).concat(bodyTree).concat(finalBodyTree);
}

export const convertAppExp = (exp :AppExp, node: Node): Edge[] => {
    //const AppNode = makeNodeDecl("[AppExp]",AppExpGen("AppExp"));
    const ratorNode = nodeMaker(exp.rator);
    const randsNode = makeNodeDecl(randsGen('rands'),"[:]");
    const AppRatorEdge = makeEdge(makeNodeRef(node.id),ratorNode,makeEdgeLabel("rator"));   //check the ratorNode ?? should be Decl here?????
    
    //const randsNodeList = map (x=> nodeMaker(x),exp.rands);

    const AppRandsEdges = map(x=> makeEdge(makeNodeRef(randsNode.id),nodeMaker(x)),exp.rands);

    const expNodeArr = zip(exp.rands,AppRandsEdges);
    
    const finalRandsTree = expNodeArr.reduce((acc: Edge[],cur)=> ((isAtomicExp(cur[0])?acc : acc.concat(convertExp(cur[0],cur[1].to)))),[]);
    return [AppRatorEdge].concat(AppRandsEdges).concat(finalRandsTree);

}



export const convertIfExp = (exp : IfExp, node : Node): Edge[] => {
    // const ifnode = makeNodeDecl(exp.tag,IfExpGen(exp.tag));
    // const testNode = makeNodeDecl(exp.test.tag,"Test");
    const testEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(testGen("Test"),`${exp.test.tag}`),makeEdgeLabel("Test") );
    const thenEdge = makeEdge(makeNodeRef( node.id),makeNodeDecl(thenGen("Then"),`${exp.then.tag}`),makeEdgeLabel("Then"));
    const altEdge = makeEdge(makeNodeRef( node.id),makeNodeDecl(altGen("Alt"),`${exp.alt.tag}`),makeEdgeLabel("Alt"));
    const testTree = convertExp(exp.test,testEdge.to);
    // const thenNode = makeNodeDecl(exp.then.tag,"Then");
    const thenTree = convertExp(exp.then,thenEdge.to);

    // const altNode = makeNodeDecl(exp.then.tag,"Then");
    const altTree = convertExp(exp.alt,altEdge.to);



    return [testEdge,thenEdge,altEdge].concat(testTree).concat(thenTree).concat(altTree);
}


export const convertDefine = (exp: DefineExp, node: Node): Edge[] => {
    const defineNode = makeNodeDecl(defineGen("DefineExp"),"DefineExp");
    const varNode = makeNodeDecl(varRefGen("Var"), `VarDecl(${exp.var.var})`);
    const defineToVarDecl = makeEdge(defineNode,varNode,makeEdgeLabel("var"));
    const defineRefNode = makeNodeRef(defineNode.id);
    const defineToVal = (isAtomicExp(exp.val)) ? makeEdge(defineRefNode,convertExp(exp.val),makeEdgeLabel("val")):
    makeEdge(defineNode,makeNodeDecl("TODO func for makeVarGen for compound",`${exp.val.tag}`));

    (isCompoundExp(exp.val)) ? map(x=> makeEdge(makeNodeRef(defineToVal.to.id),x),)
    return makeCompoundGraph([defineToVarDecl,defineToVal]);
}

export const nodeMaker = (exp :CExp) : Node =>
isAtomicExp(exp) ? makeAtomicNode(exp):
isCompoundExp(exp)? makeCompoundNode(exp):
exp;


export const makeAtomicNode = (exp: AtomicExp): Node =>
isNumExp(exp)? makeNodeDecl(numGen(`${exp.tag}`),`${exp.tag}(${exp.val})`):
isBoolExp(exp)? makeNodeDecl(boolGen(`${exp.tag}`),`${exp.tag}(${exp.val})`):
isStrExp(exp)? makeNodeDecl(strGen(`${exp.tag}`),`${exp.tag}(${exp.val})`):
isPrimOp(exp)? makeNodeDecl(primOpGen(`${exp.tag}`),`${exp.tag}(${exp.op})`):
makeNodeDecl(varRefGen(`${exp.tag}`),`${exp.tag}(${exp.var})`);

export const makeCompoundNode = (exp : CompoundExp): Node =>
isIfExp(exp)? makeNodeDecl(IfExpGen(`${exp.tag}`),`${exp.tag}`):
isAppExp(exp)? makeNodeDecl(AppExpGen(`${exp.tag}`),`${exp.tag}`):
isProcExp(exp)? makeNodeDecl(procExpGen(`${exp.tag}`),`${exp.tag}`):
isLetExp(exp)? makeNodeDecl(letGen(`${exp.tag}`),`${exp.tag}`):
isLitExp(exp)? makeNodeDecl(litGen(`${exp.tag}`),`${exp.tag}`):
isLetrecExp(exp)? makeNodeDecl(letRecGen(`${exp.tag}`),`${exp.tag}`):
isSetExp(exp)? makeNodeDecl(setGen(`${exp.tag}`),`${exp.tag}`):
exp;