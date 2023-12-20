import { identity, removeUndefinds } from "~/core/utils";
import { toQueryParams } from "~/core/utils/web-utils";

export interface ContentBodyType {
    json: object | string | number | boolean | null;
    urlEncoded: object;
    raw: string;
}
export type ContentType = keyof ContentBodyType;

export type RequestMethod = "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";

export interface Request<
    CT extends ContentType,
    Body extends ContentBodyType[CT] = ContentBodyType[CT],
> {
    method: RequestMethod;
    url: string;
    contentType: CT;
    headers?: Record<string, string>;
    params?: object;
    body?: Body;
    timeout?: number;
}

export type UnknownRequest = { [CT in ContentType]: Request<CT> }[ContentType];
export type AnyRequest = Request<any, any>;
export type AnyRequestManagerConfig = RequestManagerConfig<any, any>;

export interface RequestRawData {
    method: RequestMethod;
    url: string;
    body?: RequestInit["body"];
    headers?: RequestInit["headers"];
    request: UnknownRequest;
}

interface RequestEventData<Req extends Partial<UnknownRequest>> {
    initialRequest: Req;
    transformedRequest: UnknownRequest;
    requestRawData: RequestRawData;
}

interface ResponseEventData<Req extends Partial<UnknownRequest>, Resp extends Partial<Response>>
    extends RequestEventData<Req> {
    initialResponse: Response;
    transformedResponse: Resp;
}

export interface RequestManagerConfig<
    Req extends Partial<UnknownRequest>,
    Resp extends Partial<Response>,
> {
    getRequestRawData(request: UnknownRequest): RequestRawData | Promise<RequestRawData>;
    sendRequest(data: RequestRawData): Promise<Response>;
    transformRequest(request: Req): UnknownRequest | Promise<UnknownRequest>;
    transformResponse(response: Response): Resp | Promise<Resp>;
    onRequest?(d: RequestEventData<Req>): void;
    onResponse?(d: ResponseEventData<Req, Resp>): void;
}

interface ContentTypeData {
    headers:
        | Record<string, string>
        | ((request: UnknownRequest) => Record<string, string>)
        | undefined;
    formatter: (o: ContentBodyType[ContentType]) => string;
}

const contentTypeData: {
    [CT in ContentType]?: ContentTypeData;
} = {};

export function registerContentType<CT extends ContentType>(
    contentType: CT,
    headers:
        | Record<string, string>
        | ((request: Request<CT>) => Record<string, string>)
        | undefined,
    formatter: (o: ContentBodyType[CT]) => string,
) {
    contentTypeData[contentType] = { headers, formatter } as ContentTypeData;
}

export function getContentTypeData(contentType: ContentType) {
    const d = contentTypeData[contentType];
    if (d === undefined) {
        throw new Error("Undefined contentType.");
    }
    return d;
}

registerContentType("raw", undefined, (o) => {
    if (typeof o !== "string") {
        throw new Error("A 'raw' body needs to be a string.");
    }
    return o;
});
registerContentType("json", { "Content-Type": "application/json" }, (o) => {
    return JSON.stringify(o);
});
registerContentType("urlEncoded", { "Content-Type": "application/x-www-form-urlencoded" }, (o) => {
    if (typeof o !== "object" || o === null) {
        throw new Error("A 'urlEncoded' body needs to be an object.");
    }
    return toQueryParams(o).toString();
});

export class RequestManager<Req extends Partial<UnknownRequest>, Resp extends Partial<Response>> {
    public constructor(public readonly config: RequestManagerConfig<Req, Resp>) {}

    public async invoke<T>(iReq: Req) {
        const req = await this.config.transformRequest(iReq);
        const reqData = await this.config.getRequestRawData(req);
        const iRespPr = this.config.sendRequest(reqData);
        this.config.onRequest?.({
            initialRequest: iReq,
            transformedRequest: req,
            requestRawData: reqData,
        });
        const iResp = await iRespPr;
        const resp = await this.config.transformResponse(iResp);
        this.config.onResponse?.({
            initialRequest: iReq,
            transformedRequest: req,
            initialResponse: iResp,
            transformedResponse: resp,
            requestRawData: reqData,
        });
        const out = await resp.json!();
        if (resp.ok) {
            return out as T;
        }
        throw out;
    }
}

export const requestManagerBaseConfig: RequestManagerConfig<UnknownRequest, Response> = {
    transformRequest: identity,
    transformResponse: identity,
    getRequestRawData(req) {
        const ctData = getContentTypeData(req.contentType);
        return {
            method: req.method,
            url:
                req.url +
                (req.params ? `?${toQueryParams(removeUndefinds(req.params)).toString()}` : ""),
            body: req.body !== undefined ? ctData.formatter(removeUndefinds(req.body)) : null,
            headers:
                req.body !== undefined
                    ? {
                          ...req.headers,
                          ...(typeof ctData.headers === "function"
                              ? ctData.headers(req )
                              : ctData.headers),
                      }
                    : req.headers,
            request: req,
        };
    },
    sendRequest: undefined!,
};
