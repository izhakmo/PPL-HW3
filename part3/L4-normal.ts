// ========================================================
// L4 normal eval
import { Sexp } from "s-expression";
import { map } from "ramda";
import { CExp, Exp, IfExp, Program, parseL4Exp, isLetExp } from "./L4-ast";
import { isAppExp, isBoolExp, isCExp, isDefineExp, isIfExp, isLitExp, isNumExp,
         isPrimOp, isProcExp, isStrExp, isVarRef } from "./L4-ast";
import { applyEnv, makeEmptyEnv, makeExtEnv, Env, CexpEnv, isEmptyEnv, isExtEnv, isRecEnv, makeRecEnv, makeCexpEnv } from './L4-env-normal';
import { applyPrimitive } from "./evalPrimitive";
import { isClosure, makeClosure, Value } from "./L4-value";
import { first, rest, isEmpty } from '../shared/list';
import { Result, makeOk, makeFailure, bind, mapResult } from "../shared/result";
import { parse as p } from "../shared/parser";


export const evalNormalProgram = (program: Program): Result<Value> =>
    evalExps(program.exps, makeEmptyEnv());

export const L4normalEval = (exp: CExp, env: Env): Result<Value> =>
isBoolExp(exp) ? makeOk(exp.val) :
isNumExp(exp) ? makeOk(exp.val) :
isStrExp(exp) ? makeOk(exp.val) :
isPrimOp(exp) ? makeOk(exp) :
isLitExp(exp) ? makeOk(exp.val) :
isVarRef(exp) ? handleVarRef(env, exp.var) :
isIfExp(exp) ? evalIf(exp, env) :
isProcExp(exp) ? makeOk(makeClosure(exp.args, exp.body,env)) :
isAppExp(exp) ? bind(L4normalEval(exp.rator, env), (proc :Value) => L4normalApplyProc(proc, exp.rands, env)) :
isLetExp(exp) ? evalExps(exp.body,makeExtEnv(map(x =>x.var.var, exp.bindings),map(x =>makeCexpEnv( x.val,env),exp.bindings),env)):
makeFailure(`Bad ast: ${exp}`);


// Evaluate a sequence of expressions (in a program)
export const evalExps = (exps: Exp[], env: Env): Result<Value> =>
isEmpty(exps) ? makeFailure("Empty program") :
isDefineExp(first(exps)) ? evalDefineExps(first(exps), rest(exps), env) :
evalCExps(first(exps), rest(exps), env);


export const handleVarRef = (env : Env, ref: string ) : Result<Value> =>
bind( applyEnv(env,ref),(exp:CexpEnv|CExp) => (isCExp(exp))? L4normalEval(exp,env): L4normalEval(exp.exp,exp.env));


const evalDefineExps = (def: Exp, exps: Exp[], env: Env): Result<Value> =>
isDefineExp(def) ? (isProcExp(def.val)? evalExps(exps,makeRecEnv([def.var.var],[def.val.args],[def.val.body],env)) :
evalExps(exps,makeExtEnv([def.var.var],[def.val],env))):
makeFailure("Unexpected " + def);


const evalCExps = (exp1: Exp, exps: Exp[], env: Env): Result<Value> =>
isCExp(exp1) && isEmpty(exps) ? L4normalEval(exp1, env) :
isCExp(exp1) ? bind(L4normalEval(exp1, env), _ => evalExps(exps, env)) :
makeFailure("Never");


export const evalNormalParse = (s: string): Result<Value> =>
    bind(p(s),
         (parsed: Sexp) => bind(parseL4Exp(parsed),
                                (exp: Exp) => evalExps([exp], makeEmptyEnv())));






const evalIf = (exp: IfExp, env: Env): Result<Value> =>
bind(L4normalEval(exp.test, env),
        test => isTrueValue(test) ? L4normalEval(exp.then, env) : L4normalEval(exp.alt, env));

/*
===========================================================
Normal Order Application handling

Purpose: Apply a procedure to NON evaluated arguments.
Signature: L4-normalApplyProcedure(proc, args)
Pre-conditions: proc must be a prim-op or a closure value
*/

const L4normalApplyProc = (proc: Value, args: CExp[], env: Env): Result<Value> => {
if (isPrimOp(proc)) {
    const argVals: Result<Value[]> = mapResult((arg) => L4normalEval(arg, env), args);
    return bind(argVals, (args: Value[]) => applyPrimitive(proc, args));
} else if (isClosure(proc)) {

    return (proc.params.length===args.length)?
    //makeExtEnv : list of proc.params, ==> forEach args that we got as input- we need to eval with the CURRENT env 
    //the env of ExtEnv -is proc.env ==> WHEN PROC WAS CREATED

    L4normalEvalSeq(proc.body, makeExtEnv(map((p) => p.var ,proc.params),map(x=>makeCexpEnv(x,env),args),proc.env)):       //TODO TODO TODO
    
    makeFailure(`ApplyProc - wrong number of args: ${args.length} instead of ${proc.params.length} `);
} else {
    return makeFailure(`Bad proc applied ${proc}`);
}
};


/*
Purpose: Evaluate a sequence of expressions
Signature: L3-normal-eval-sequence(exps, env)
Type: [List(CExp) * Env -> Value]
Pre-conditions: exps is not empty
*/
const L4normalEvalSeq = (exps: CExp[], env: Env): Result<Value> => {
if (isEmpty(rest(exps)))
    return L4normalEval(first(exps), env);
else {
    L4normalEval(first(exps), env);
    return L4normalEvalSeq(rest(exps), env);
}
};

export const isTrueValue = (x: Value): boolean =>
    ! (x === false);