import { map, zipWith, is, reduce, zip } from "ramda";
import { Sexp, Token } from "s-expression";
import { allT, first, second, rest, isEmpty } from "../shared/list";
import { isArray, isString, isNumericString, isIdentifier, isNumber, isBoolean } from "../shared/type-predicates";
import { parse as p, isSexpString, isToken } from "../shared/parser";
import { Result, makeOk, makeFailure, bind, mapResult, safe2 } from "../shared/result";
import { isSymbolSExp, isEmptySExp, isCompoundSExp, isClosure } from './L4-value';
import { makeEmptySExp, makeSymbolSExp, SExpValue, makeCompoundSExp, valueToString } from './L4-value'
import {Parsed,isBoolExp,isNumExp,isStrExp,isLitExp,isVarRef,isProcExp,isIfExp,
    isAppExp,isPrimOp,isLetExp,isLetrecExp,isSetExp,isDefineExp,
    isProgram, isVarDecl, isAtomicExp, Exp, AppExp, IfExp, ProcExp, DefineExp,
    CompoundExp,isCompoundExp, CExp, AtomicExp, LitExp, SetExp, LetrecExp, Binding} from './L4-ast'
import {Graph,Node, makeEdge, makeNodeRef,makeNodeDecl, isEdge, makeGraph, makeTD,
    GraphContent, makeAtomicGraph, Edge, CompoundGraph, makeCompoundGraph, makeEdgeLabel, NodeDecl, NodeRef} from './marmaid-ast'
import { LetExp } from "../part3/L4-ast";

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
const bindingGen = makeVarGen();



const SexpNumber = makeVarGen();
const SexpBool = makeVarGen();
const SexpString = makeVarGen();
const SexpOP = makeVarGen();
const SexpClosure = makeVarGen();
const SexpSymbol = makeVarGen();
const SexpEmpty = makeVarGen();
const SexpCompound = makeVarGen();



export const mapL4toMermaid = (exp: Parsed): Result<Graph>=>
isProgram(exp) ? makeOk(makeGraph(makeTD(),map(convertExp,exp.exps))):
makeOk(convertExp(exp));


export const convertExp = (exp: Exp, node :Node) : Edge[] =>
isBoolExp(exp) ? makeEdge(makeNodeRef(node.id),nodeMaker(exp)) :
isNumExp(exp) ? makeEdge(makeNodeRef(node.id),nodeMaker(exp)) :
isStrExp(exp) ? makeEdge(makeNodeRef(node.id),nodeMaker(exp)) :
isPrimOp(exp) ? makeEdge(makeNodeRef(node.id),nodeMaker(exp)) :


isLitExp(exp) ? makeNodeRef(litGen(valueToString(exp.val))) :
isVarRef(exp) ? makeNodeRef(varRefGen(exp.tag)) :

isProcExp(exp) ? convertProcExp(exp,makeNodeDecl(procExpGen(`${exp.tag}`),`${exp.tag}`)) :
isIfExp(exp) ? convertIfExp(exp,makeNodeDecl(IfExpGen(`${exp.tag}`),`${exp.tag}`)) :
isAppExp(exp) ? convertAppExp(exp,makeNodeDecl(AppExpGen(`${exp.tag}`),`${exp.tag}`)) :
isLetExp(exp) ? [] : 
isLetrecExp(exp) ? [] :
isSetExp(exp) ? [] :
isDefineExp(exp) ? [] :
isProgram(exp) ? [] :
;


export const convertAppExp = (exp :AppExp, node: Node): Edge[] => {
    //const AppNode = makeNodeDecl("[AppExp]",AppExpGen("AppExp"));
    // const ratorNode = nodeMaker(exp.rator);
    const parentToRandsEdge= makeEdge(makeNodeRef(node.id),makeNodeDecl(randsGen('rands'),"[:]"),makeEdgeLabel("rands"));
    // const randsNode = makeNodeDecl(randsGen('rands'),"[:]");
    const AppRatorEdge = makeEdge(makeNodeRef(node.id),nodeMaker(exp.rator),makeEdgeLabel("rator"));
    //const randsNodeList = map (x=> nodeMaker(x),exp.rands);
    const AppRandsEdges = map(x=> makeEdge(makeNodeRef(parentToRandsEdge.to.id),nodeMaker(x)),exp.rands);
    const expNodeArr = zip(exp.rands,AppRandsEdges);
    const finalRandsTree = expNodeArr.reduce((acc: Edge[],cur)=> (isAtomicExp(cur[0])?acc : acc.concat(convertExp(cur[0],makeNodeRef(cur[1].to.id)))),[]);
    return [parentToRandsEdge, AppRatorEdge].concat(AppRandsEdges).concat(finalRandsTree);
}

export const convertIfExp = (exp : IfExp, node : Node): Edge[] => {
    // const ifnode = makeNodeDecl(exp.tag,IfExpGen(exp.tag));
    // const testNode = makeNodeDecl(exp.test.tag,"Test");
    const parentToIfExp = makeEdge(makeNodeRef(node.id),nodeMaker(exp),makeEdgeLabel(`${exp.tag}`));
    const testEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(testGen("Test"),`${exp.test.tag}`),makeEdgeLabel("Test") );
    const thenEdge = makeEdge(makeNodeRef( node.id),makeNodeDecl(thenGen("Then"),`${exp.then.tag}`),makeEdgeLabel("Then"));
    const altEdge = makeEdge(makeNodeRef( node.id),makeNodeDecl(altGen("Alt"),`${exp.alt.tag}`),makeEdgeLabel("Alt"));
    // const testTree = convertExp(exp.test,testEdge.to);
    // const thenNode = makeNodeDecl(exp.then.tag,"Then");
    // const thenTree = convertExp(exp.then,thenEdge.to);
    // const altNode = makeNodeDecl(exp.then.tag,"Then");
    // const altTree = convertExp(exp.alt,altEdge.to);
    return [parentToIfExp, testEdge,thenEdge,altEdge].concat(convertExp(exp.test,testEdge.to)).
    concat(convertExp(exp.then,thenEdge.to)).concat(convertExp(exp.alt,altEdge.to));
}

export const convertProcExp = (exp : ProcExp, node: Node): Edge[] => {
    // const procNode = makeNodeDecl(procExpGen(exp.tag),`[${exp.tag}]`);
    //params, bodys
    // const paramsNode = makeNodeDecl(paramsGen("Params"),`[:]`);
    // const bodyNode = makeNodeDecl(bodyGen("Body"),`[:]`);
    const procParamsEdge = makeEdge(makeNodeRef( node.id),makeNodeDecl(paramsGen(`Params`),`[:]`),makeEdgeLabel("args"));
    const procBodyEdge = makeEdge(makeNodeRef( node.id),makeNodeDecl(bodyGen(`Body`),`[:]`),makeEdgeLabel("body"));
    const paramsTree = map(x=> makeEdge(makeNodeRef(procParamsEdge.to.id),makeNodeDecl(varDeclGen(`VarDecl`),`varDecl(${x})`)),exp.args);
    const bodyTree = map(x=> makeEdge(makeNodeRef(procBodyEdge.to.id),nodeMaker(exp)),exp.body);
    const expNodeArr = zip(exp.body,bodyTree);
    const finalBodyTree = expNodeArr.reduce((acc:Edge[],cur)=>
    ((isAtomicExp(cur[0])) ? acc  :acc.concat(convertExp(cur[0],makeNodeRef( cur[1].to.id)))),[] ); //what sould i if a body is compound?????
    return [procParamsEdge,procBodyEdge].concat(paramsTree).concat(bodyTree).concat(finalBodyTree);
}


export const convertDefine = (exp: DefineExp, node: Node): Edge[] => {
    // const defineNode = makeNodeDecl(defineGen(`${exp.tag}`),`${exp.tag}`);
    const parentToDefEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(defineGen(`${exp.tag}`),`${exp.tag}`) )
    const varNode = makeNodeDecl(varRefGen("Var"), `VarDecl(${exp.var.var})`);
    const defineToVarDeclEdge = makeEdge(makeNodeRef( parentToDefEdge.to.id),varNode,makeEdgeLabel("var"));
    // const defineRefNode = makeNodeRef(defineNode.id);
    const defineToValEdge = (isAtomicExp(exp.val)) ? makeEdge(makeNodeRef( parentToDefEdge.to.id),makeAtomicNode(exp.val),makeEdgeLabel("val")):
    makeEdge(makeNodeRef( parentToDefEdge.to.id),makeCompoundNode(exp.val));
    return isAtomicExp(exp.val)? [parentToDefEdge,defineToVarDeclEdge,defineToValEdge]:
    [parentToDefEdge,defineToVarDeclEdge,defineToValEdge].concat(convertExp(exp.val,makeNodeRef(defineToValEdge.to.id)));
}

export const convertLitExp = (exp: LitExp, node: Node): Edge[]=>{
    const parentToLitEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(defineGen(`${exp.tag}`),`${exp.tag}`) );
    const LitToValEdge =isCompoundSExp(exp.val)? makeEdge(makeNodeRef(parentToLitEdge.to.id),makeNodeDecl(SexpGen(exp.val),SExpValueEncoder(exp.val))):
    makeEdge(makeNodeRef(parentToLitEdge.to.id),makeNodeDecl(SexpGen(exp.val),SExpValueEncoder(exp.val)));    //TODO check id, label
    return isCompoundSExp(exp.val)? [parentToLitEdge,LitToValEdge].concat(convertSexpValue(exp.val,makeNodeRef( LitToValEdge.to.id))):
    [parentToLitEdge,LitToValEdge];
}

export const convertSexpValue = (exp: SExpValue,node: Node): Edge[] =>{
    const Edger = isCompoundSExp(exp)? [makeEdge(makeNodeRef(node.id),makeNodeDecl(SexpGen(exp.val1),SExpValueEncoder(exp.val1)))]:
    [makeEdge(makeNodeRef(node.id),makeNodeDecl(SexpGen(exp),`${exp.toString}(${exp.valueOf.toString})`))];

    return (isCompoundSExp(exp)) ?Edger.concat(convertSexpValue(exp.val2,makeNodeRef(Edger[0].to.id))) :
    Edger;
}

export const SexpGen = (val : SExpValue): string =>
isNumber(val)? SexpNumber(`number`) :
isBoolean(val)? SexpBool(`boolean`) :
isString(val)? SexpString(`string`) :
isPrimOp(val)? SexpOP(`PrimOp`):
isClosure(val)? SexpClosure(`Closure`):
isSymbolSExp(val)? SexpSymbol(`SymbolSexp`) :
isEmptySExp(val)? SexpEmpty(`EmptySexp`) :
isCompoundSExp(val)? SexpCompound(`CompoundSExp`):
val;



export const SExpValueEncoder = (val : SExpValue): string =>
isNumber(val)? `number(${val.toString})` :
isBoolean(val)? `boolean(${val.toString})` :
isString(val)? `string(${val.toString})` :
isPrimOp(val)? `PrimOp(${val.toString})`:
isClosure(val)? `Closure`:              //TODO check !!!!!!
isSymbolSExp(val)? `SymbolSexp` :
isEmptySExp(val)? `EmptySexp` :
isCompoundSExp(val)? `CompoundSExp`:
val;



export const convertSetExp = (exp: SetExp, node: Node): Edge[] => {
    const parentToSetEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(setGen(`${exp.tag}`),`${exp.tag}`));
    const setToVarEdge = makeEdge(makeNodeRef(parentToSetEdge.to.id),makeNodeDecl(varRefGen(`${exp.var.tag}`),`${exp.var.tag}`))
    const setToValEdge = (isAtomicExp(exp.val)) ? makeEdge(makeNodeRef(parentToSetEdge.to.id),nodeMaker(exp.val),makeEdgeLabel("val")):
    makeEdge(makeNodeRef(parentToSetEdge.to.id),makeCompoundNode(exp.val));
    return isAtomicExp(exp.val)? [parentToSetEdge,setToVarEdge,setToValEdge]:
    [parentToSetEdge,setToVarEdge,setToValEdge].concat(convertExp(exp.val,makeNodeRef(setToValEdge.to.id)));
}


export const convertLetExp = (exp : LetExp|LetrecExp , node : Node): Edge[] => {
    const multiBindingsGen = makeVarGen();
    const internalBodyGen = makeVarGen();
    const parentToLetEdge = makeEdge(makeNodeRef(node.id),nodeMaker(exp),makeEdgeLabel(`${exp.tag}`));
    const letToBindings = makeEdge(makeNodeRef(parentToLetEdge.to.id),makeNodeDecl(bindingGen(`Bindings`),`[:]`),makeEdgeLabel(`bindings`));
    const letToBodys = makeEdge(makeNodeRef(parentToLetEdge.to.id),makeNodeDecl(bodyGen(`Body`),`[:]`),makeEdgeLabel(`body`));
    const 


}

export const convertBind = (bind : Binding,node :Node) :Edge[] =>{
    
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