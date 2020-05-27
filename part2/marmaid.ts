import { map, is, reduce, zip, flatten, head } from "ramda";
import { Sexp, Token } from "s-expression";
import { allT, first, second, rest, isEmpty } from "../shared/list";
import { isArray, isString, isNumericString, isIdentifier, isNumber, isBoolean } from "../shared/type-predicates";
import { parse as p, isSexpString, isToken } from "../shared/parser";
import { Result, makeOk, makeFailure, bind, mapResult, safe2, isOk } from "../shared/result";
import { isSymbolSExp, isEmptySExp, isCompoundSExp, isClosure } from './L4-value';
import { makeEmptySExp, makeSymbolSExp, SExpValue, makeCompoundSExp, valueToString } from './L4-value'
import {Parsed,isBoolExp,isNumExp,isStrExp,isLitExp,isVarRef,isProcExp,isIfExp,
    isAppExp,isPrimOp,isLetExp,isLetrecExp,isSetExp,isDefineExp,
    isProgram, isVarDecl, isAtomicExp, Exp, AppExp, IfExp, ProcExp, DefineExp,LetExp,
    CompoundExp,isCompoundExp, CExp, AtomicExp, LitExp, SetExp, LetrecExp, Binding, isExp, Program, parseL4, parseL4Program, parseL4Exp, parseL4Atomic} from './L4-ast'
import {Graph,Node, makeEdge, makeNodeRef,makeNodeDecl, isEdge, makeGraph, makeTD,
    GraphContent, makeAtomicGraph, Edge, CompoundGraph, makeCompoundGraph, NodeDecl, 
    NodeRef, isGraph, isTD, isLR, isAtomicGraph, isCompoundGraph, isNodeDecl, isNodeRef, AtomicGraph} from './marmaid-ast'

export const makeVarGen = (): (v: string) => string => {
    let count: number = 0;
    return (v: string) => {
        count++;
        return `${v}_${count}`;
    };
};
const ProgramGen = makeVarGen();
const AppExpGen = makeVarGen();
const IfExpGen = makeVarGen();
const boolGen = makeVarGen();
const numGen = makeVarGen();
const strGen = makeVarGen();
const primOpGen = makeVarGen();
const varRefGen = makeVarGen();
const litGen = makeVarGen();
const procExpGen = makeVarGen();
const randsGen = makeVarGen();
const defineGen = makeVarGen();
const paramsGen = makeVarGen();
const bodyGen = makeVarGen();

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

export const okGraph = (okcontent : NodeDecl |Edge[]) : Result<Graph> =>
    isArray(okcontent)? makeOk(makeGraph(makeTD(),makeCompoundGraph( okcontent))):
    makeOk(makeGraph(makeTD(),makeAtomicGraph( okcontent)));

export const mapL4toMermaid = (exp: Parsed): Result<Graph>=>
    isExp(exp) ? (isDefineExp(exp) ? bind(singleConvertDefine(exp),okGraph) : (isAtomicExp(exp) ? 
    okGraph(nodeMaker(exp)) : bind(convertSingleExp(exp),okGraph))) :
    isProgram(exp) ? bind (convertProgram(exp,"|exps|"),okGraph):
    exp;



export const convertProgram = (exp : Program,label? :string) :Result <Edge[]> =>{
    const ExpsArrGen = makeVarGen();
    const programToBodyEdge = makeEdge(makeNodeDecl(ProgramGen(`${exp.tag}`),`${exp.tag}`),makeNodeDecl(ExpsArrGen("Exps"),":"),label);
    return safe2((father :Edge, body:Edge[][] )=>makeOk([father].concat(flatten( body))))
    (makeOk(programToBodyEdge), mapResult((x: Exp) => convertExp(x,makeNodeRef(programToBodyEdge.to.id)),exp.exps));

}

export const convertSingleExp = (exp: CompoundExp) :Result <Edge[]> =>
    isAppExp(exp) ? convertSingleAppExp(exp) :
    isIfExp(exp) ? convertSingleIfExp(exp) :
    isProcExp(exp) ? convertSingleProcExp(exp) :
    isLetExp(exp) ? convertSingleLetExp(exp) :
    isLitExp(exp) ? convertSingleLitExp(exp) :
    isLetrecExp(exp) ? convertSingleLetExp(exp) :
    isSetExp(exp) ? convertSingleSetExp(exp) :
    exp;


export const convertExp = (exp: Exp, node :Node, label? :string) :Result < Edge[]> =>
    isBoolExp(exp) ? makeOk([makeEdge(node,nodeMaker(exp),label)]) :
    isNumExp(exp) ? makeOk([makeEdge(node,nodeMaker(exp),label)]) :
    isStrExp(exp) ? makeOk([makeEdge(node,nodeMaker(exp),label)]) :
    isPrimOp(exp) ? makeOk([makeEdge(node,nodeMaker(exp),label)]) :

    isVarRef(exp) ? makeOk([makeEdge(node,nodeMaker(exp),label)]) :

    isLitExp(exp) ? convertLitExp(exp,node, label) :

    isProcExp(exp) ? convertProcExp(exp,node, label) :
    isIfExp(exp) ? convertIfExp(exp,node, label) :
    isAppExp(exp) ? convertAppExp(exp,node, label) :
    isLetExp(exp) ? convertLetExp(exp,node, label) : 
    isLetrecExp(exp) ? convertLetExp(exp,node, label) :
    isSetExp(exp) ? convertSetExp(exp,node, label) :
    isDefineExp(exp) ? convertDefine(exp,node, label):
    exp;


    export const convertSingleProcExp = (exp : ProcExp):Result < Edge[]> => {
        const procParamsEdge = makeEdge(nodeMaker(exp),makeNodeDecl(paramsGen(`Params`),`:`),("|args|"));
        const procBodyEdge = makeEdge(makeNodeRef(procParamsEdge.from.id),makeNodeDecl(bodyGen(`Body`),`:`),("|body|"));
        const paramsTree = map(x=> makeEdge(makeNodeRef(procParamsEdge.to.id),makeNodeDecl(varDeclGen(`VarDecl`),`VarDecl(${x.var})`)),exp.args);

        return safe2((head :Edge[],body: Edge[][]) => makeOk(head.concat(flatten( body))))
        (makeOk([procParamsEdge,procBodyEdge].concat(paramsTree)),mapResult( x=>convertExp(x,procBodyEdge.to) ,exp.body));
    }

export const convertAppExp = (exp :AppExp, node: Node, label? :string):Result < Edge[]> => {
    const parentToAppEdge =isNodeDecl(node)? makeEdge(node,nodeMaker(exp),label) : makeEdge(makeNodeRef(node.id),nodeMaker(exp),label);  
    const parentToRandsEdge= makeEdge(makeNodeRef(parentToAppEdge.to.id),makeNodeDecl(randsGen('rands'),":"),("|rands|"));
    const AppRatorEdge = convertExp(exp.rator,makeNodeRef(parentToAppEdge.to.id),"|rator|");

    return safe2((head:Edge[],tail: Edge[]) =>makeOk(head.concat(tail)))
    (makeOk([parentToAppEdge,parentToRandsEdge]), safe2 ((rator:Edge[],rands: Edge[][]) => makeOk(rator.concat(flatten(rands))))
    (AppRatorEdge,mapResult(x => convertExp(x,makeNodeRef(parentToRandsEdge.to.id)),exp.rands)));
}

export const convertSingleAppExp = (exp : AppExp) :Result < Edge[]> => {
    const parentToRandsEdge= makeEdge(nodeMaker(exp),makeNodeDecl(randsGen('rands'),":"),("|rands|"));
    const AppRatorEdge = convertExp(exp.rator,makeNodeRef(parentToRandsEdge.from.id),"|rator|");

    return safe2((head:Edge[],tail: Edge[]) =>makeOk(head.concat(tail)))
    (makeOk([parentToRandsEdge]), safe2 ((rator:Edge[],rands: Edge[][]) => makeOk(rator.concat(flatten(rands))))
    (AppRatorEdge,mapResult(x => convertExp(x,parentToRandsEdge.to),exp.rands)));
}

export const convertIfExp = (exp : IfExp, node : Node, label? :string):Result < Edge[]> => {
    const parentToIfExp = isNodeDecl(node)? makeEdge(node,nodeMaker(exp),label) : makeEdge(makeNodeRef(node.id),nodeMaker(exp),label);

    return safe2((testBody: Edge[],thenAndAlt: Edge[])=> makeOk([parentToIfExp].concat(testBody).concat(thenAndAlt)))
    (convertExp(exp.test,parentToIfExp.to,"|test|"), safe2((thenBody: Edge[],altBody : Edge[])=> makeOk(thenBody.concat(altBody)))
    (convertExp(exp.then,parentToIfExp.to,"|then|"),convertExp(exp.alt,parentToIfExp.to,"|alt|")));
}

export const convertSingleIfExp = (exp : IfExp) :Result < Edge[]> =>{

    const ifNode = nodeMaker(exp);
    return safe2((testBody: Edge[],thenAndAlt: Edge[])=> makeOk((testBody).concat(thenAndAlt)))
    (convertExp(exp.test,makeNodeRef(ifNode.id),"|test|"), safe2((thenBody: Edge[],altBody : Edge[])=> makeOk(thenBody.concat(altBody)))
    (convertExp(exp.then,ifNode,"|then|"),convertExp(exp.alt,makeNodeRef(ifNode.id),"|alt|")));
}

export const convertProcExp = (exp : ProcExp, node: Node, label? :string):Result < Edge[]> => {
    const parentToProc = isNodeDecl(node)? makeEdge(node,nodeMaker(exp),label) : makeEdge(makeNodeRef(node.id),nodeMaker(exp),label);
    const procParamsEdge = makeEdge(makeNodeRef(parentToProc.to.id),makeNodeDecl(paramsGen(`Params`),`:`),("|args|"));
    const procBodyEdge = makeEdge(makeNodeRef(parentToProc.to.id),makeNodeDecl(bodyGen(`Body`),`:`),("|body|"));
    const paramsTree = map(x=> makeEdge(makeNodeRef(procParamsEdge.to.id),makeNodeDecl(varDeclGen(`VarDecl`),`VarDecl(${x.var})`)),exp.args);

    return safe2((head:Edge[], body : Edge[][]) => makeOk(head.concat(flatten(body))))
    (makeOk([parentToProc,procParamsEdge,procBodyEdge].concat(paramsTree)),mapResult(x=> convertExp(x,makeNodeRef(procBodyEdge.to.id)),exp.body))
}


export const singleConvertDefine = (exp : DefineExp) :Result < Edge[]> =>{
    const defineToVarEdge = makeEdge(makeNodeDecl(defineGen(exp.tag),`${exp.tag}`),makeNodeDecl(varRefGen("Var"), `VarDecl(${exp.var.var})`),"|var|");
    const defineToValEdge = (isAtomicExp(exp.val)) ? makeOk([makeEdge(makeNodeRef(defineToVarEdge.from.id),makeAtomicNode(exp.val),"|val|")]):
    convertExp(exp.val,makeNodeRef(defineToVarEdge.from.id),"|val|");
    return bind(defineToValEdge,(x:Edge[]) => makeOk([defineToVarEdge].concat(x)));

}

export const convertDefine = (exp: DefineExp, node: Node, label? :string):Result < Edge[]> => {
    const parentToDefEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(defineGen(`${exp.tag}`),`${exp.tag}`),label );
    const defineToVarDeclEdge = makeEdge(makeNodeRef( parentToDefEdge.to.id),makeNodeDecl(varRefGen("Var"), `VarDecl(${exp.var.var})`),("|var|"));
    const defineToValEdge = (isAtomicExp(exp.val)) ? makeOk([makeEdge(makeNodeRef( parentToDefEdge.to.id),makeAtomicNode(exp.val),("|val|"))]):
    convertExp(exp.val,makeNodeRef(parentToDefEdge.to.id),"|val|");

    return bind(defineToValEdge, (x:Edge[]) => makeOk([parentToDefEdge,defineToVarDeclEdge].concat(x)));

}

export const convertLitExp = (exp: LitExp, node: Node,label? :string):Result < Edge[]>=>{
    const parentToLitEdge = [makeEdge(makeNodeRef(node.id),makeNodeDecl(defineGen(`${exp.tag}`),`${exp.tag}`),label )];

    return bind(convertSexpValue(exp.val, makeNodeRef(parentToLitEdge[0].to.id),"|val|"),(x:Edge[])  =>makeOk( parentToLitEdge.concat(x)));
}

export const convertSingleLitExp = (exp : LitExp) :Result < Edge[]> => {
    return convertSexpValue(exp.val,nodeMaker(exp),"|val|");
}

export const convertSexpValue = (exp: SExpValue,node: Node, label :string):Result < Edge[]> =>{
    const Edger = [makeEdge(makeNodeRef(node.id),makeNodeDecl(SexpGen(exp),SExpValueEncoder(exp)),label)];

    return (isCompoundSExp(exp)) ? safe2((one :Edge[],two :Edge[]) => makeOk(Edger.concat(one).concat(two)))
    (convertSexpValue(exp.val1,makeNodeRef( Edger[0].to.id),"|val1|"),convertSexpValue(exp.val2,makeNodeRef( Edger[0].to.id),"|val2|")) :
    makeOk(Edger);
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
    isCompoundSExp(val)? `CompoundSExp` :
    isEmptySExp(val) ? val.tag :
    isClosure(val) ? val.tag :
    isNumber(val)? `number(${val.toString()})` :
    isBoolean(val)? `boolean(${val.toString()})` :
    isString(val)? `string(${val.toString()})` :
    isPrimOp(val)? `PrimOp(${val.toString()})`:
    isSymbolSExp(val)? `SymbolSexp` :
    val;



export const convertSetExp = (exp: SetExp, node: Node,label? :string):Result < Edge[]> => {
    const parentToSetEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(setGen(`${exp.tag}`),`${exp.tag}`),label);
    const setToVarEdge = makeEdge(makeNodeRef(parentToSetEdge.to.id),makeNodeDecl(varRefGen(`${exp.var.tag}`),`${exp.var.tag}`),"|var|");
    const setToValEdge = (isAtomicExp(exp.val)) ? makeEdge(makeNodeRef(parentToSetEdge.to.id),nodeMaker(exp.val),("|val|")):
    makeEdge(makeNodeRef(parentToSetEdge.to.id),makeCompoundNode(exp.val),"|val|");
    return isAtomicExp(exp.val)? makeOk([parentToSetEdge,setToVarEdge,setToValEdge]):
    safe2((head:Edge[], body: Edge[]) => makeOk(head.concat(body)))
    (makeOk([parentToSetEdge,setToVarEdge,setToValEdge]), convertExp(exp.val,makeNodeRef(setToValEdge.to.id)));
}

export const convertSingleSetExp = (exp : SetExp) :Result < Edge[]> =>{
    const setToVarEdge = makeEdge(nodeMaker(exp),makeNodeDecl(varRefGen(`${exp.var.tag}`),`${exp.var.tag}`));
    const setToValEdge = (isAtomicExp(exp.val)) ? makeEdge(makeNodeRef(setToVarEdge.from.id),nodeMaker(exp.val),("|val|")):
    makeEdge(makeNodeRef(setToVarEdge.from.id),makeCompoundNode(exp.val));
    return isAtomicExp(exp.val)? makeOk([setToVarEdge,setToValEdge]):
    safe2((head:Edge[], body: Edge[]) => makeOk(head.concat(body)))
    (makeOk([setToVarEdge,setToValEdge]),convertExp(exp.val,makeNodeRef(setToValEdge.to.id)));
}

export const convertLetExp = (exp : LetExp|LetrecExp , node : Node, label? :string):Result < Edge[]> => {
    const multiBindingsGen = makeVarGen();

    const parentToLetEdge = makeEdge(makeNodeRef(node.id),nodeMaker(exp), label);
    const letToBindings = makeEdge(makeNodeRef(parentToLetEdge.to.id),makeNodeDecl(bindingGen(`Bindings`),`:`),(`|bindings|`));
    const letToBodys = makeEdge(makeNodeRef(parentToLetEdge.to.id),makeNodeDecl(bodyGen(`Body`),`:`),(`|body|`));

    const allBindingArr = mapResult(x=> convertBind(x,makeNodeRef( letToBindings.to.id),multiBindingsGen),exp.bindings);
    const allBodysArr = mapResult(x=> (convertExp(x,makeNodeRef( letToBodys.to.id))),exp.body);

    return safe2((bindings:Edge[][],bodies:Edge[][])=> 
    makeOk([parentToLetEdge,letToBindings,letToBodys].concat(flatten(bindings)).concat(flatten(bodies))))
    (allBindingArr,allBodysArr);
}

export const convertSingleLetExp = (exp: LetExp|LetrecExp) :Result < Edge[]> => {
    const multiBindingsGen = makeVarGen();

    const letToBindings = makeEdge(nodeMaker(exp),makeNodeDecl(bindingGen(`Bindings`),`:`),(`|bindings|`));
    const letToBodys = makeEdge(makeNodeRef(letToBindings.from.id),makeNodeDecl(bodyGen(`Body`),`:`),(`|body|`));

    const allBindingArr = mapResult(x=> convertBind(x,makeNodeRef( letToBindings.to.id),multiBindingsGen),exp.bindings);
    const allBodysArr = mapResult(x=> (convertExp(x,makeNodeRef( letToBodys.to.id))),exp.body);

    return safe2((bindings:Edge[][],bodies:Edge[][])=> 
    makeOk([letToBindings,letToBodys].concat(flatten(bindings)).concat(flatten(bodies))))
    (allBindingArr,allBodysArr);
    
}

export const convertBind = (bind : Binding, node :Node,generator: (v:string) => string) :Result < Edge[]> =>{
    const fatherToBindingEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(generator('Binding'),'Binding'));
    const fatherToVarDeclEdge = makeEdge(makeNodeRef(fatherToBindingEdge.to.id),makeNodeDecl(varDeclGen(`VarDecl`),`VarDecl(${bind.var.var})`),(`|var|`));
    
    return  isAtomicExp(bind.val) ? makeOk([fatherToBindingEdge,fatherToVarDeclEdge,makeEdge(makeNodeRef(fatherToBindingEdge.to.id),nodeMaker(bind.val),(`|val|`))]) :
    safe2((head:Edge[], body: Edge[]) => makeOk(head.concat(body)))
    (makeOk([fatherToBindingEdge,fatherToVarDeclEdge]),convertExp(bind.val,makeNodeRef(fatherToBindingEdge.to.id),"|val|"));
}


export const nodeMaker = (exp :CExp) : NodeDecl =>
    isAtomicExp(exp) ? makeAtomicNode(exp):
    isCompoundExp(exp)? makeCompoundNode(exp):
    exp;


export const makeAtomicNode = (exp: AtomicExp): NodeDecl =>
    isNumExp(exp)? makeNodeDecl(numGen(`${exp.tag}`),`${exp.tag}(${exp.val})`):
    isBoolExp(exp)? makeNodeDecl(boolGen(`${exp.tag}`),`${exp.tag}(${exp.val})`):
    isStrExp(exp)? makeNodeDecl(strGen(`${exp.tag}`),`${exp.tag}(${exp.val})`):
    isPrimOp(exp)? makeNodeDecl(primOpGen(`${exp.tag}`),`${exp.tag}(${exp.op})`):
    makeNodeDecl(varRefGen(`${exp.tag}`),`${exp.tag}(${exp.var})`);

export const makeCompoundNode = (exp : CompoundExp): NodeDecl =>
    isIfExp(exp)? makeNodeDecl(IfExpGen(`${exp.tag}`),`${exp.tag}`):
    isAppExp(exp)? makeNodeDecl(AppExpGen(`${exp.tag}`),`${exp.tag}`):
    isProcExp(exp)? makeNodeDecl(procExpGen(`${exp.tag}`),`${exp.tag}`):
    isLetExp(exp)? makeNodeDecl(letGen(`${exp.tag}`),`${exp.tag}`):
    isLitExp(exp)? makeNodeDecl(litGen(`${exp.tag}`),`${exp.tag}`):
    isLetrecExp(exp)? makeNodeDecl(letRecGen(`${exp.tag}`),`${exp.tag}`):
    isSetExp(exp)? makeNodeDecl(setGen(`${exp.tag}`),`${exp.tag}`):
    exp;


export const unparseMermaid = (exp: Graph): Result<string> =>{
    const content = isAtomicGraph(exp.content)? atomicUnparse(exp.content):
    compoundUnparse(exp.content);
    return isOk(content)?  graphConcat(exp.dir.tag,content.value):
    makeFailure("fail");
}

export const atomicUnparse = (exp: AtomicGraph): Result<string> =>
    makeOk(nodeUnparse(exp.content));


export const compoundUnparse = (exp: CompoundGraph): Result<string> =>
    bind(mapResult(edgeUnparse,exp.edges), (vals: string[])=>makeOk(stringConcat(vals)));


export const nodeUnparse = (exp: Node): string =>
    isNodeRef(exp)? exp.id:
    isNodeDecl(exp)? `${exp.id}["${exp.label}"]`:
    exp;


export const edgeUnparse = (exp: Edge): Result<string> =>
    isString(exp.label)? makeOk(`${nodeUnparse(exp.from)} -->${exp.label} ${nodeUnparse(exp.to)}`):
    makeOk(`${nodeUnparse(exp.from)} --> ${nodeUnparse(exp.to)}`);

export const stringConcat = (exp: string[]): string =>
    (exp.length===1)? exp[0]:
    exp.join(`\n`);

export const graphConcat = (dir: string, content: string): Result<string> =>
    makeOk(`graph `.concat(`${dir}\n`).concat(content));



export const L4toMermaid = (concrete: string): Result<string> =>
    bind (bind( bind(p(concrete),ParseProgramOrExp),mapL4toMermaid),unparseMermaid);


export const ParseProgramOrExp = (sexp :Sexp) : Result<Parsed> =>
    isArray(sexp) && (first(sexp)==="L4") ? parseL4Program(sexp) : 
    parseL4Exp(sexp);