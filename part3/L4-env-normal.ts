// Environment for L4 (support for Letrec)
// =======================================
// An environment represents a partial function from symbols (variable names) to values.
// It supports the operation: apply-env(env,var)
// which either returns the value of var in the environment, or else throws an error.
//
// Env is defined inductively by the following cases:
// * <env> ::= <empty-env> | <extended-env> | <rec-env>
// * <empty-env> ::= (empty-env) // empty-env()
// * <extended-env> ::= (env (symbol+) (value+) next-env) // env(vars:List(Symbol), vals:List(Value), next-env: Env)
// * <rec-ext-env> ::= (rec-env (symbol+) (params+) (bodies+) next-env)
//       // rec-env(vars:List(Symbol), paramss:List(List(var-decl)), bodiess:List(List(cexp)), next-env: Env)
//
// The key operation on env is apply-env(var) which returns the value associated to var in env
// or throw an error if var is not defined in env.

import { VarDecl, CExp, makeProcExp } from './L4-ast';
import { makeClosure, Value } from './L4-value';
import { Result, makeOk, makeFailure } from '../shared/result';

// ========================================================
// Environment data type
export type Env = EmptyEnv | ExtEnv | RecEnv;
export interface EmptyEnv {tag: "EmptyEnv" }
export interface ExtEnv {
    tag: "ExtEnv";
    vars: string[];
    vals: (CExp|CexpEnv)[];
    nextEnv: Env;
}
export interface RecEnv {
    tag: "RecEnv";
    vars: string[];
    paramss: VarDecl[][];
    bodiess: CExp[][];
    nextEnv: Env;
}

export interface CexpEnv {
    tag: "CexpEnv";
    exp: CExp;
    env: Env;
}

export const makeEmptyEnv = (): EmptyEnv => ({tag: "EmptyEnv"});
export const makeExtEnv = (vs: string[], vals: (CExp|CexpEnv)[], env: Env): ExtEnv =>
    ({tag: "ExtEnv", vars: vs, vals: vals, nextEnv: env});
export const makeRecEnv = (vs: string[], paramss: VarDecl[][], bodiess: CExp[][], env: Env): RecEnv =>
    ({tag: "RecEnv", vars: vs, paramss: paramss, bodiess: bodiess, nextEnv: env});
    
export const makeCexpEnv = (exp: CExp, env: Env): CexpEnv => ({tag: "CexpEnv", exp: exp, env: env});

export const isEmptyEnv = (x: any): x is EmptyEnv => x.tag === "EmptyEnv";
export const isExtEnv = (x: any): x is ExtEnv => x.tag === "ExtEnv";
export const isRecEnv = (x: any): x is RecEnv => x.tag === "RecEnv";

const isCexpEnv = (x: any): x is CexpEnv => x.tag === "CexpEnv";

export const isEnv = (x: any): x is Env => isEmptyEnv(x) || isExtEnv(x) || isRecEnv(x);

// Apply-env
export const applyEnv = (env: Env, v: string): Result<CexpEnv|CExp> =>
    isEmptyEnv(env) ? makeFailure(`var not found ${v}`) :
    isExtEnv(env) ? applyExtEnv(env, v) :
    applyRecEnv(env, v);

const applyExtEnv = (env: ExtEnv, v: string): Result<CexpEnv|CExp> =>
    env.vars.includes(v) ? makeOk( env.vals[env.vars.indexOf(v)]) :
    applyEnv(env.nextEnv, v);

const applyRecEnv = (env: RecEnv, v: string): Result<CexpEnv|CExp> =>
    env.vars.includes(v) ? makeOk( makeCexpEnv(makeProcExp(env.paramss[env.vars.indexOf(v)],
                                                env.bodiess[env.vars.indexOf(v)]),env)) :
                                              
    applyEnv(env.nextEnv, v);
