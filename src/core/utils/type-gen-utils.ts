export interface ParamHolder1<T1> {
    $_$param1$_$: T1
}

export interface ParamHolder2<T1, T2> extends ParamHolder1<T1> {
    $_$param2$_$: T2
}

export interface ParamHolder3<T1, T2, T3> extends ParamHolder2<T1, T2> {
    $_$param3$_$: T3
}

export interface ParamHolder4<T1, T2, T3, T4> extends ParamHolder3<T1, T2, T3> {
    $_$param4$_$: T4
}

export type UnholdParam1<T> = T extends ParamHolder1<infer P> ? P : never;
export type UnholdParam2<T> = T extends ParamHolder2<any, infer P> ? P : never;
export type UnholdParam3<T> = T extends ParamHolder3<any, any, infer P> ? P : never;
export type UnholdParam4<T> = T extends ParamHolder4<any, any, any, infer P> ? P : never;
