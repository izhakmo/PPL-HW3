import { map, is, reduce, zip, flatten } from "ramda";
import { Sexp, Token } from "s-expression";
import { allT, first, second, rest, isEmpty } from "../shared/list";
import { isArray, isString, isNumericString, isIdentifier, isNumber, isBoolean } from "../shared/type-predicates";
import { parse as p, isSexpString, isToken } from "../shared/parser";
import { Result, makeOk, makeFailure, bind, mapResult, safe2, isOk } from "../shared/result";
import { isSymbolSExp, isEmptySExp, isCompoundSExp, isClosure } from './L4-value';
import { makeEmptySExp, makeSymbolSExp, SExpValue, makeCompoundSExp, valueToString } from './L4-value'
import {Parsed,isBoolExp,isNumExp,isStrExp,isLitExp,isVarRef,isProcExp,isIfExp,
    isAppExp,isPrimOp,isLetExp,isLetrecExp,isSetExp,isDefineExp,
    isProgram, isVarDecl, isAtomicExp, Exp, AppExp, IfExp, ProcExp, DefineExp,
    CompoundExp,isCompoundExp, CExp, AtomicExp, LitExp, SetExp, LetrecExp, Binding, isExp, Program, parseL4, parseL4Program, parseL4Exp, parseL4Atomic} from './L4-ast'
import {Graph,Node, makeEdge, makeNodeRef,makeNodeDecl, isEdge, makeGraph, makeTD,
    GraphContent, makeAtomicGraph, Edge, CompoundGraph, makeCompoundGraph, NodeDecl, 
    NodeRef, isGraph, isTD, isLR, isAtomicGraph, isCompoundGraph, isNodeDecl, isNodeRef, AtomicGraph} from './marmaid-ast'

// import {makeEdgeLabel, isEdgeLabel} from './marmaid-ast'
import { LetExp } from "../part3/L4-ast";

export const makeVarGen = (): (v: string) => string => {
    let count: number = 0;
    return (v: string) => {
        count++;
        return `${v}__${count}`;
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
    isExp(exp) ? (isDefineExp(exp) ? makeOk( makeGraph(makeTD(),makeCompoundGraph
    (singleConvertDefine(exp)))): (isAtomicExp(exp)? 

    makeOk( makeGraph(makeTD(),makeAtomicGraph(nodeMaker(exp)))) :
    makeOk(makeGraph(makeTD(),makeCompoundGraph(convertSingleExp(exp)))) )) :
    
    isProgram(exp) ? makeOk( makeGraph(makeTD(),makeCompoundGraph
    (convertProgram(exp,"|exps|")))):
    exp;



export const convertProgram = (exp : Program,label? :string) : Edge[] =>{
    const ExpsArrGen = makeVarGen();
    const programToBodyEdge = makeEdge(makeNodeDecl(ProgramGen(`${exp.tag}`),`${exp.tag}`),makeNodeDecl(ExpsArrGen("Exps"),":"),label);
    const bodyExpArr = exp.exps.reduce((acc :Edge[] , cur)=>acc.concat(convertExp(cur,makeNodeRef(programToBodyEdge.to.id))) ,[]);
    return [programToBodyEdge].concat(flatten(bodyExpArr));
}

export const convertSingleExp = (exp: CompoundExp) : Edge[] =>
    isAppExp(exp) ? convertSingleAppExp(exp) :
    isIfExp(exp) ? convertSingleIfExp(exp) :
    isProcExp(exp) ? convertSingleProcExp(exp) :
    isLetExp(exp) ? convertSingleLetExp(exp) :
    isLitExp(exp) ? convertSingleLitExp(exp) :
    isLetrecExp(exp) ? convertSingleLetExp(exp) :
    isSetExp(exp) ? convertSingleSetExp(exp) :
    exp;

export const convertExp = (exp: Exp, node :Node, label? :string) : Edge[] =>
    isBoolExp(exp) ? [makeEdge(makeNodeRef(node.id),nodeMaker(exp),label)] :
    isNumExp(exp) ? [makeEdge(makeNodeRef(node.id),nodeMaker(exp),label)] :
    isStrExp(exp) ? [makeEdge(makeNodeRef(node.id),nodeMaker(exp),label)] :
    isPrimOp(exp) ? [makeEdge(makeNodeRef(node.id),nodeMaker(exp),label)] :

    isVarRef(exp) ? [makeEdge(makeNodeRef(node.id),nodeMaker(exp),label)] :

    isLitExp(exp) ? convertLitExp(exp,makeNodeRef(node.id), label) :

    isProcExp(exp) ? convertProcExp(exp,makeNodeRef(node.id), label) :
    isIfExp(exp) ? convertIfExp(exp,makeNodeRef(node.id), label) :
    isAppExp(exp) ? convertAppExp(exp,makeNodeRef(node.id), label) :
    isLetExp(exp) ? convertLetExp(exp,makeNodeRef(node.id), label) : 
    isLetrecExp(exp) ? convertLetExp(exp,makeNodeRef(node.id), label) :
    isSetExp(exp) ? convertSetExp(exp,makeNodeRef(node.id), label) :
    isDefineExp(exp) ? convertDefine(exp,makeNodeRef(node.id), label):
    exp;


    export const convertSingleProcExp = (exp : ProcExp): Edge[] => {
        const node = nodeMaker(exp);
        const procParamsEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(paramsGen(`Params`),`:`),("|args|"));
        const procBodyEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(bodyGen(`Body`),`:`),("|body|"));
        const paramsTree = map(x=> makeEdge(makeNodeRef(procParamsEdge.to.id),makeNodeDecl(varDeclGen(`VarDecl`),`varDecl(${x.var})`)),exp.args);
        const bodyTree = reduce( (acc: Edge[], curr: CExp) => acc.concat(convertExp(curr, makeNodeRef(procBodyEdge.to.id))), [], exp.body);
        return [procParamsEdge,procBodyEdge].concat(paramsTree).concat(flatten(bodyTree));
    }

export const convertAppExp = (exp :AppExp, node: Node, label? :string): Edge[] => {
    const parentToAppEdge = makeEdge(makeNodeRef(node.id),nodeMaker(exp),label);  
    //const AppNode = makeNodeDecl("[AppExp]",AppExpGen("AppExp"));
    // const ratorNode = nodeMaker(exp.rator);
    const parentToRandsEdge= makeEdge(makeNodeRef(parentToAppEdge.to.id),makeNodeDecl(randsGen('rands'),":"),("|rands|"));
    // const randsNode = makeNodeDecl(randsGen('rands'),"[:]");

    // const AppRatorEdge = makeEdge(makeNodeRef(parentToAppEdge.to.id),nodeMaker(exp.rator),("|rator|"));

    
    const AppRatorEdge = convertExp(exp.rator,makeNodeRef(parentToAppEdge.to.id),"|rator|");


    //const randsNodeList = map (x=> nodeMaker(x),exp.rands);
    // const AppRandsEdges = map(x=> makeEdge(makeNodeRef(parentToRandsEdge.to.id),nodeMaker(x)),exp.rands);
    // const expNodeArr = zip(exp.rands,AppRandsEdges);
    // const finalRandsTree = expNodeArr.reduce((acc: Edge[],cur)=> (isAtomicExp(cur[0])?acc : acc.concat(convertExp(cur[0],makeNodeRef(cur[1].to.id)))),[]);
    const AppRandsEdges = reduce((acc: Edge[], curr: CExp) => acc.concat(convertExp(curr, makeNodeRef(parentToRandsEdge.to.id))), [],exp.rands);
    return [parentToAppEdge, parentToRandsEdge].concat(flatten(AppRandsEdges)).concat(flatten(AppRatorEdge));
}

export const convertSingleAppExp = (exp : AppExp) : Edge[] => {
    const node = nodeMaker(exp);
    const parentToRandsEdge= makeEdge(makeNodeRef(node.id),makeNodeDecl(randsGen('rands'),":"),("|rands|"));
    const AppRatorEdge = convertExp(exp.rator,makeNodeRef(node.id),"|rator|");
    const AppRandsEdges = reduce((acc: Edge[], curr: CExp) => acc.concat(convertExp(curr, makeNodeRef(parentToRandsEdge.to.id))), [],exp.rands);
    return [parentToRandsEdge].concat(flatten(AppRatorEdge)).concat(flatten(AppRandsEdges));

    return [];
}

export const convertIfExp = (exp : IfExp, node : Node, label? :string): Edge[] => {
    // const ifnode = makeNodeDecl(exp.tag,IfExpGen(exp.tag));
    // const testNode = makeNodeDecl(exp.test.tag,"Test");
    const parentToIfExp = makeEdge(makeNodeRef(node.id),nodeMaker(exp),label);
    const testEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(testGen("Test"),`${exp.test.tag}`),("|Test|") );
    const thenEdge = makeEdge(makeNodeRef( node.id),makeNodeDecl(thenGen("Then"),`${exp.then.tag}`),("|Then|"));
    const altEdge = makeEdge(makeNodeRef( node.id),makeNodeDecl(altGen("Alt"),`${exp.alt.tag}`),("|Alt|"));

    return [parentToIfExp, testEdge,thenEdge,altEdge].concat(convertExp(exp.test,testEdge.to)).
    concat(convertExp(exp.then,thenEdge.to)).concat(convertExp(exp.alt,altEdge.to));
}

export const convertSingleIfExp = (exp : IfExp) : Edge[] =>{
    const testEdge = makeEdge(nodeMaker(exp),makeNodeDecl(testGen("Test"),`${exp.test.tag}`),("|Test|") );
    const thenEdge = makeEdge(makeNodeRef(testEdge.from.id),makeNodeDecl(thenGen("Then"),`${exp.then.tag}`),("|Then|"));
    const altEdge = makeEdge(makeNodeRef(testEdge.from.id),makeNodeDecl(altGen("Alt"),`${exp.alt.tag}`),("|Alt|"));
    return [testEdge,thenEdge,altEdge].concat(convertExp(exp.test,testEdge.to)).
    concat(convertExp(exp.then,thenEdge.to)).concat(convertExp(exp.alt,altEdge.to));
}

export const convertProcExp = (exp : ProcExp, node: Node, label? :string): Edge[] => {
    // const procNode = makeNodeDecl(procExpGen(exp.tag),`[${exp.tag}]`);
    //params, bodys
    // const paramsNode = makeNodeDecl(paramsGen("Params"),`[:]`);
    // const bodyNode = makeNodeDecl(bodyGen("Body"),`[:]`);
    const parentToProc = makeEdge(makeNodeRef(node.id),nodeMaker(exp),label);
    const procParamsEdge = makeEdge(makeNodeRef(parentToProc.to.id),makeNodeDecl(paramsGen(`Params`),`:`),("|args|"));
    const procBodyEdge = makeEdge(makeNodeRef(parentToProc.to.id),makeNodeDecl(bodyGen(`Body`),`:`),("|body|"));
    const paramsTree = map(x=> makeEdge(makeNodeRef(procParamsEdge.to.id),makeNodeDecl(varDeclGen(`VarDecl`),`varDecl(${x.var})`)),exp.args);
    //const bodyTree = map(x=> makeEdge(makeNodeRef(procBodyEdge.to.id),nodeMaker(exp)),exp.body);
    //const expNodeArr = zip(exp.body,bodyTree);
    //const finalBodyTree = expNodeArr.reduce((acc:Edge[],cur)=>
    //((isAtomicExp(cur[0])) ? acc  :acc.concat(convertExp(cur[0],makeNodeRef( cur[1].to.id)))),[] ); //what sould i if a body is compound?????
    //return [procParamsEdge,procBodyEdge].concat(paramsTree).concat(bodyTree).concat(finalBodyTree);
    const bodyTree = reduce( (acc: Edge[], curr: CExp) => acc.concat(convertExp(curr, makeNodeRef(procBodyEdge.to.id))), [], exp.body);
    return [parentToProc,procParamsEdge,procBodyEdge].concat(paramsTree).concat(flatten(bodyTree));
}


export const singleConvertDefine = (exp : DefineExp) : Edge[] =>{
    const defineToVarEdge = makeEdge(makeNodeDecl(defineGen(exp.tag),`${exp.tag}`),makeNodeDecl(varRefGen("Var"), `VarDecl(${exp.var.var})`),"|var|");
    const defineToValEdge = (isAtomicExp(exp.val)) ? [makeEdge(makeNodeRef(defineToVarEdge.from.id),makeAtomicNode(exp.val),"|val|")]:
    convertExp(exp.val,makeNodeRef(defineToVarEdge.from.id),"|val|");
    return [defineToVarEdge].concat(defineToValEdge);

}

export const convertDefine = (exp: DefineExp, node: Node, label? :string): Edge[] => {
    // const defineNode = makeNodeDecl(defineGen(`${exp.tag}`),`${exp.tag}`);
    const parentToDefEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(defineGen(`${exp.tag}`),`${exp.tag}`),label );
    // const varNode = makeNodeDecl(varRefGen("Var"), `VarDecl(${exp.var.var})`);
    const defineToVarDeclEdge = makeEdge(makeNodeRef( parentToDefEdge.to.id),makeNodeDecl(varRefGen("Var"), `VarDecl(${exp.var.var})`),("|var|"));
    // const defineRefNode = makeNodeRef(defineNode.id);
    const defineToValEdge = (isAtomicExp(exp.val)) ? [makeEdge(makeNodeRef( parentToDefEdge.to.id),makeAtomicNode(exp.val),("|val|"))]:
    // makeEdge(makeNodeRef( parentToDefEdge.to.id),makeCompoundNode(exp.val));
    convertExp(exp.val,makeNodeRef(parentToDefEdge.to.id));
    return  [parentToDefEdge,defineToVarDeclEdge].concat(defineToValEdge);

    // return isAtomicExp(exp.val)? [parentToDefEdge,defineToVarDeclEdge].concat(defineToValEdge):
    // [parentToDefEdge,defineToVarDeclEdge,defineToValEdge].concat(convertExp(exp.val,makeNodeRef(defineToValEdge.to.id)));
}

export const convertLitExp = (exp: LitExp, node: Node,label? :string): Edge[]=>{
    const parentToLitEdge = [makeEdge(makeNodeRef(node.id),makeNodeDecl(defineGen(`${exp.tag}`),`${exp.tag}`),label )];
    // const LitToValEdge =isCompoundSExp(exp.val)? makeEdge(makeNodeRef(parentToLitEdge.to.id),makeNodeDecl(SexpGen(exp.val),SExpValueEncoder(exp.val))):
    // makeEdge(makeNodeRef(parentToLitEdge.to.id),makeNodeDecl(SexpGen(exp.val),SExpValueEncoder(exp.val)));    //TODO check id, label
    // return isCompoundSExp(exp.val)? [parentToLitEdge,LitToValEdge].concat(convertSexpValue(exp.val,makeNodeRef( LitToValEdge.to.id))):
    // [parentToLitEdge,LitToValEdge];

    return parentToLitEdge.concat(convertSexpValue(exp.val, makeNodeRef(parentToLitEdge[0].to.id),"|val|"));
}

export const convertSingleLitExp = (exp : LitExp) : Edge[] => {
    // const parentToLitEdge = [makeEdge(nodeMaker(exp),makeNodeDecl(defineGen(`${exp.tag}`),`${exp.tag}`) )];
    return convertSexpValue(exp.val,nodeMaker(exp),"|val|");
}

export const convertSexpValue = (exp: SExpValue,node: Node, label :string): Edge[] =>{
    const Edger = [makeEdge(makeNodeRef(node.id),makeNodeDecl(SexpGen(exp),SExpValueEncoder(exp)),label)];
    return (isCompoundSExp(exp)) ? Edger.concat(convertSexpValue(exp.val1,makeNodeRef( Edger[0].to.id),"|val1|")).
    concat(convertSexpValue(exp.val2,makeNodeRef( Edger[0].to.id),"|val2|")) :
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
    isCompoundSExp(val)? val.tag :
    isEmptySExp(val) ? val.tag :
    isClosure(val) ? val.tag :
    isNumber(val)? `number(${val.toString()})` :
    isBoolean(val)? `boolean(${val.toString()})` :
    isString(val)? `string(${val.toString()})` :
    isPrimOp(val)? `PrimOp(${val.toString()})`:
    isSymbolSExp(val)? `SymbolSexp` :
    val;



export const convertSetExp = (exp: SetExp, node: Node,label? :string): Edge[] => {
    const parentToSetEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(setGen(`${exp.tag}`),`${exp.tag}`),label);
    const setToVarEdge = makeEdge(makeNodeRef(parentToSetEdge.to.id),makeNodeDecl(varRefGen(`${exp.var.tag}`),`${exp.var.tag}`));
    const setToValEdge = (isAtomicExp(exp.val)) ? makeEdge(makeNodeRef(parentToSetEdge.to.id),nodeMaker(exp.val),("|val|")):
    makeEdge(makeNodeRef(parentToSetEdge.to.id),makeCompoundNode(exp.val));
    return isAtomicExp(exp.val)? [parentToSetEdge,setToVarEdge,setToValEdge]:
    [parentToSetEdge,setToVarEdge,setToValEdge].concat(convertExp(exp.val,makeNodeRef(setToValEdge.to.id)));
}

export const convertSingleSetExp = (exp : SetExp) : Edge[] =>{
    const setToVarEdge = makeEdge(nodeMaker(exp),makeNodeDecl(varRefGen(`${exp.var.tag}`),`${exp.var.tag}`));
    const setToValEdge = (isAtomicExp(exp.val)) ? makeEdge(makeNodeRef(setToVarEdge.from.id),nodeMaker(exp.val),("|val|")):
    makeEdge(makeNodeRef(setToVarEdge.from.id),makeCompoundNode(exp.val));
    return isAtomicExp(exp.val)? [setToVarEdge,setToValEdge]:
    [setToVarEdge,setToValEdge].concat(convertExp(exp.val,makeNodeRef(setToValEdge.to.id)));
}

export const convertLetExp = (exp : LetExp|LetrecExp , node : Node, label? :string): Edge[] => {
    const multiBindingsGen = makeVarGen();

    const parentToLetEdge = makeEdge(makeNodeRef(node.id),nodeMaker(exp), label);
    const letToBindings = makeEdge(makeNodeRef(parentToLetEdge.to.id),makeNodeDecl(bindingGen(`Bindings`),`:`),(`|bindings|`));
    const letToBodys = makeEdge(makeNodeRef(parentToLetEdge.to.id),makeNodeDecl(bodyGen(`Body`),`:`),(`|body|`));
    const allBindingArr = exp.bindings.reduce((acc : Edge[], cur) =>  
    acc.concat(convertBind(cur,makeNodeRef( letToBindings.to.id),multiBindingsGen)),[]);
    
    const allBodysArr = map(x=> (convertExp(x,makeNodeRef( letToBodys.to.id))),exp.body);

    return [parentToLetEdge,letToBindings,letToBodys].concat(flatten(allBindingArr)).concat(flatten(allBodysArr));
}

export const convertSingleLetExp = (exp: LetExp|LetrecExp) : Edge[] => {
    const multiBindingsGen = makeVarGen();

    // const parentToLetEdge = makeEdge(makeNodeRef(node.id),nodeMaker(exp),(`${exp.tag}`));
    const letToBindings = makeEdge(nodeMaker(exp),makeNodeDecl(bindingGen(`Bindings`),`:`),(`|bindings|`));
    const letToBodys = makeEdge(makeNodeRef(letToBindings.from.id),makeNodeDecl(bodyGen(`Body`),`:`),(`|body|`));
    const allBindingArr = exp.bindings.reduce((acc : Edge[], cur) =>  
    acc.concat(convertBind(cur,makeNodeRef( letToBindings.to.id),multiBindingsGen)),[]);
    
    const allBodysArr = map(x=> (convertExp(x,makeNodeRef( letToBodys.to.id))),exp.body);

    return [letToBindings,letToBodys].concat(flatten(allBindingArr)).concat(flatten(allBodysArr));
}

export const convertBind = (bind : Binding, node :Node,generator: (v:string) => string) :Edge[] =>{
    const fatherToBindingEdge = makeEdge(makeNodeRef(node.id),makeNodeDecl(generator('Binding'),'Binding'));
    const fatherToVarDeclEdge = makeEdge(makeNodeRef(fatherToBindingEdge.to.id),makeNodeDecl(varDeclGen(`VarDecl`),`VarDecl(${bind.var.var})`),(`|var|`));
    const fatherToValEdge =makeEdge(makeNodeRef(fatherToBindingEdge.to.id),nodeMaker(bind.val),(`|val|`));
    
    return  isAtomicExp(bind.val) ? [fatherToBindingEdge,fatherToVarDeclEdge,fatherToValEdge] :
    [fatherToBindingEdge,fatherToVarDeclEdge,fatherToValEdge].concat(convertExp(bind.val,makeNodeRef(fatherToValEdge.to.id)));
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
    // isEdgeLabel(exp.label) ? makeOk(`${nodeUnparse(exp.from)} --> ${nodeUnparse(exp.to)}`):
    isString(exp.label)? makeOk(`${nodeUnparse(exp.from)} -->${exp.label} ${nodeUnparse(exp.to)}`):
    makeOk(`${nodeUnparse(exp.from)} --> ${nodeUnparse(exp.to)}`);

export const stringConcat = (exp: string[]): string =>
    (exp.length===1)? exp[0]:
    exp.join(`\n`);

export const graphConcat = (dir: string, content: string): Result<string> =>
    makeOk(`graph `.concat(`${dir}\n`).concat(content));



export const L4toMermaid = (concrete: string): Result<string> =>
    // const parsedOrExpArr = 
    bind (bind( bind(p(concrete),ParseProgramOrExp),mapL4toMermaid),unparseMermaid);
    // isOk(parsedOrExpArr)?( isArray(parsedOrExpArr.value)? parsedOrExpArr.value.reduce((acc,cur)=>
    // acc.concat(),[]) ):
    // parsedOrExpArr;
    // bind(bind(parseL4(concrete),mapL4toMermaid),unparseMermaid);



export const ParseProgramOrExp = (sexp :Sexp) : Result<Parsed> =>
    isArray(sexp) && (first(sexp)==="L4") ? parseL4Program(sexp) : 
    parseL4Exp(sexp);




// export const L4toMermaid = (concrete: string): Result<string> => 
// bind((bind(expOrProgram(concrete),mapL4toMermaid)),unparseMermaid);

// export const expOrProgram = (x: string): Result<headers.Parsed> =>{
//     const bl:Result<Boolean>= bind(p(x),(sexp:Sexp): Result<Boolean>=>isArray(sexp) ? (first(sexp)==="L4" && !isEmpty(rest(sexp)))? makeOk(true) : makeOk(false) : makeOk(false)  );// if not array cloud be a exp but not a program
//     return bind (bl,(t:Boolean): Result<Parsed> => t===true ? headers.parseL4(x) : bind(p(x), headers.parseL4Exp));//if true program ,if false Exp or failure
// }