// ===========================================================
// AST type models
import { map, zipWith } from "ramda";
import { Sexp, Token } from "s-expression";
import { allT, first, second, rest, isEmpty } from "../shared/list";
import { isArray, isString, isNumericString, isIdentifier } from "../shared/type-predicates";
import { parse as p, isSexpString, isToken } from "../shared/parser";
import { Result, makeOk, makeFailure, bind, mapResult, safe2 } from "../shared/result";
import { isSymbolSExp, isEmptySExp, isCompoundSExp } from './L4-value';
import { makeEmptySExp, makeSymbolSExp, SExpValue, makeCompoundSExp, valueToString } from './L4-value'

/*
<graph> ::= <header> <graphContent> // Graph(dir: Dir, content: GraphContent)
<header> ::= graph (TD|LR)<newline> // Direction can be TD or LR
<graphContent> ::= <atomicGraph> | <compoundGraph>
<atomicGraph> ::= <nodeDecl>
<compoundGraph> ::= <edge>+
<edge> ::= <node> --><edgeLabel>? <node><newline> // <edgeLabel> is optional
// Edge(from: Node, to: Node, label?: string)
<node> ::= <nodeDecl> | <nodeRef>
<nodeDecl> ::= <identifier>["<string>"] // NodeDecl(id: string, label: string)
<nodeRef> ::= <identifier> // NodeRef(id: string)
<edgeLabel> ::= |<identifier>| // string

*/

export type Dir = TD |LR ;
export type GraphContent = AtomicGraph | CompoundGraph;
export type Node = NodeDecl | NodeRef;

export interface Graph {tag: "Graph"; dir: Dir; content: GraphContent ;}
// export interface header {tag: "TD"|"LR"}
export interface TD {tag: "TD";}
export interface LR {tag: "LR";}
// export interface graphContent {tag:}
export interface AtomicGraph {tag: "AtomicGraph"; content: NodeDecl;}
export interface CompoundGraph {tag: "CompoundGraph"; edges: Edge[];}
export interface Edge {tag: "Edge"; from: Node; to: Node; label?: EdgeLabel;}
export interface NodeDecl {tag: "NodeDecl"; id: string; label: string}
export interface NodeRef {tag: "NodeRef"; id: string}
export interface EdgeLabel {tag: "EdgeLabel"; var: string}

//Constructors

export const makeGraph = (dir: Dir, graphcont: GraphContent): Graph => ({tag: "Graph", dir: dir, content: graphcont});
export const makeTD = (): TD => ({tag: "TD"});
export const makeLR = (): LR => ({tag: "LR"});
export const makeAtomicGraph = (content: NodeDecl): AtomicGraph => ({tag: "AtomicGraph", content: content});
export const makeCompoundGraph = (edges: Edge[]): CompoundGraph => ({tag: "CompoundGraph", edges: edges});
export const makeEdge = (from: Node, to: Node, label?: EdgeLabel): Edge => ({tag: "Edge", from: from, to: to, label: label});
export const makeNodeDecl = (id: string, label: string): NodeDecl => ({tag: "NodeDecl", id: id, label: label});
export const makeNodeRef = (id: string): NodeRef => ({tag: "NodeRef", id: id});
export const makeEdgeLabel = (label: string): EdgeLabel => ({tag: "EdgeLabel", var: "|"+label+"|"});


//Predicates
export const isGraph = (x: any): x is Graph =>x.tag==="Graph";
export const isTD = (x: any): x is TD => x.tag==="TD";
export const isLR = (x: any): x is LR => x.tag==="LR";
export const isHeader = (x: any): x is Dir=> isTD(x) || isLR(x);

export const isAtomicGraph = (x: any): x is AtomicGraph=> x.tag==="AtomicGraph";
export const isCompoundGraph = (x: any): x is CompoundGraph=> x.tag==="CompoundGraph";
export const isGraphContent = (x: any): x is GraphContent=> isAtomicGraph(x) || isCompoundGraph(x);

export const isEdge = (x: any): x is Edge=> x.tag==="Edge";

export const isNodeDecl = (x: any): x is NodeDecl=> x.tag==="NodeDecl";
export const isNodeRef = (x: any): x is NodeRef=> x.tag==="NodeRef";
export const isNode = (x: any): x is Node=> isNodeDecl(x) || isNode(x);

export const isEdgeLabel = (x: any): x is EdgeLabel=> x.tag==="EdgeLabel";