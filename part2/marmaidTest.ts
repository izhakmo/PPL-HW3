import { parse as p, isSexpString, isToken } from "../shared/parser";
import { Result, makeOk, isOk, makeFailure, bind, mapResult, safe2 } from "../shared/result";
import {Graph} from './marmaid-ast'
import {mapL4toMermaid,unparseMermaid, ParseProgramOrExp} from './marmaid'
import { writeFile } from "fs";


// let mermaidAST: Result<Graph> = bind (bind(p ("(L4 (define moshe (lambda (x y) (+ x y)))(moshe (* 1 5) (- 4 2)))"), ParseProgramOrExp),mapL4toMermaid)
let mermaidAST: Result<Graph> = bind (bind(p ("(L4 ((lambda (x) (number? x y)) x))"), ParseProgramOrExp),mapL4toMermaid)
isOk(mermaidAST) ? console.log(JSON.stringify(mermaidAST.value, null, '\t')) : console.log(mermaidAST.message)
bind(mermaidAST, (graph: Graph) =>
            bind(unparseMermaid(graph),
                (graphStr: string) => {
                    writeFile ("graph1.mmd", graphStr, (err) =>
                        err ? console.error("Could not write to File", err.message) : null);
                    return makeOk("Meh");
                }));