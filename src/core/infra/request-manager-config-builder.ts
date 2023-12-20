/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { combineObjects, identity } from "~/core/utils";
import { type MakeOptional } from "~/core/utils/type-utils";
import {
    type AnyRequest,
    type AnyRequestManagerConfig,
    type ContentType,
    RequestManager,
    requestManagerBaseConfig,
    type RequestManagerConfig,
    type RequestMethod,
    type RequestRawData,
    type UnknownRequest,
} from "./request-manager";

export type RmcRequest<Rmc extends AnyRequestManagerConfig> = Rmc extends RequestManagerConfig<
    infer Request,
    any
>
    ? Request
    : never;
export type RmcResponse<Rmc extends AnyRequestManagerConfig> = Rmc extends RequestManagerConfig<
    any,
    infer Response
>
    ? Response
    : never;

export type MakeContentTypeOptional<
    Request extends Partial<UnknownRequest>,
    CT extends ContentType,
> =
    | (MakeOptional<Request & { contentType: CT }, "contentType"> & Partial<UnknownRequest>)
    | (Request & { contentType: Exclude<ContentType, CT> });

export class RequestManagerConfigBuilder<Rmc extends AnyRequestManagerConfig> {
    public constructor(protected config: Rmc) {}

    public static start() {
        return new RequestManagerConfigBuilder(requestManagerBaseConfig).customizeFetch(identity);
    }

    public clone() {
        return new RequestManagerConfigBuilder<Rmc>({ ...this.config }) as this;
    }

    public build() {
        return this.config;
    }

    public buildManager() {
        return new RequestManager<RmcRequest<Rmc>, RmcResponse<Rmc>>(this.config);
    }

    protected changeType<Rmc extends AnyRequestManagerConfig>(): RequestManagerConfigBuilder<Rmc> {
        return this as RequestManagerConfigBuilder<any>;
    }

    public baseUrl(baseUrl: string) {
        if (!baseUrl.endsWith("/")) {
            // eslint-disable-next-line no-param-reassign
            baseUrl += "/";
        }
        return this.transformRequestAny((request: UnknownRequest) => {
            let url = request.url;
            url = url.replace(/^\.\//, "");
            if (!url.startsWith("/")) {
                url = baseUrl + url;
            }
            request.url = url;
            return request;
        });
    }

    public baseSpread(
        base:
            | ((
                  request: RmcRequest<Rmc>,
              ) => Pick<UnknownRequest, "headers" | "params"> & { body?: object })
            | (Pick<UnknownRequest, "headers" | "params"> & { body?: object }),
    ) {
        return this.transformRequestAny((request: UnknownRequest) => {
            const baseObj = typeof base === "function" ? base(request as any) : base;

            request.headers = combineObjects(baseObj.headers, request.headers);
            request.params = combineObjects(baseObj.params, request.params);
            request.body =
                typeof request.body === "object" &&
                request.body !== null &&
                !Array.isArray(request.body)
                    ? combineObjects(baseObj.body as never, request.body)
                    : request.body;

            return request;
        });
    }

    public defaultContentType<CT extends ContentType>(contentType: CT) {
        return this.transformRequestTyped<MakeContentTypeOptional<RmcRequest<Rmc>, CT>>(
            (request: UnknownRequest) => {
                request.contentType ??= contentType;
                return request as any;
            },
        );
    }

    public defaultMethod(method: (request: RmcRequest<Rmc>) => RequestMethod) {
        return this.transformRequestTyped<MakeOptional<RmcRequest<Rmc>, "method">>(
            (request: UnknownRequest) => {
                request.method ??= method(request as any);
                return request as any;
            },
        );
    }

    public defaultMethodGetPost() {
        return this.defaultMethod((req: UnknownRequest) =>
            req.body === undefined ? "GET" : "POST",
        );
    }

    public defaultTimeout(ms: number) {
        return this.transformRequestAny((request: UnknownRequest) => {
            request.timeout ??= ms;
            return request;
        });
    }

    public statusHandler(
        status: number | number[],
        handler: (
            response: RmcResponse<Rmc>,
            request: RmcRequest<Rmc>,
            e: Parameters<NonNullable<Rmc["onResponse"]>>[0],
        ) => void,
    ) {
        const statuses = typeof status === "number" ? [status] : status;
        return this.onResponse((e) => {
            if (statuses.includes((e.transformedResponse as Response).status)) {
                handler(e.transformedResponse, e.initialRequest, e);
            }
        });
    }

    public customizeFetch(
        transformer: (
            requestInit: RequestInit & { url: RequestInfo | URL },
            data: RequestRawData,
        ) => RequestInit & { url: RequestInfo | URL },
    ) {
        return this.customSendRequest((data) => {
            const initialReqInit: RequestInit & { url: RequestInfo | URL } = {
                url: data.url,
                method: data.method,
                body: data.body,
                headers: data.headers,
                signal:
                    data.request.timeout === undefined
                        ? undefined
                        : AbortSignal.timeout(data.request.timeout),
            };
            const { url, ...reqInit } = transformer(initialReqInit, data);
            return fetch(url, reqInit);
        });
    }

    public transformRequest(
        transformer: (request: RmcRequest<Rmc>) => RmcRequest<Rmc> | Promise<RmcRequest<Rmc>>,
    ) {
        return this.transformRequestAny(
            // @ts-expect-error transformer force cast
            transformer,
        );
    }

    public transformResponse(
        transformer: (response: RmcResponse<Rmc>) => RmcResponse<Rmc> | Promise<RmcResponse<Rmc>>,
    ) {
        return this.transformResponseAny(
            // @ts-expect-error transformer force cast
            transformer,
        );
    }

    public transformRequestTyped<Request = RmcRequest<Rmc>>(
        transformer: (request: RmcRequest<Rmc>) => Request | Promise<Request>,
    ) {
        return this.changeType<
            RequestManagerConfig<Request & Partial<UnknownRequest>, RmcResponse<Rmc>>
        >().transformRequestAny(
            // @ts-expect-error transformer force cast
            transformer,
        );
    }

    public transformResponseTyped<Response = RmcResponse<Rmc>>(
        transformer: (response: RmcResponse<Rmc>) => Response | Promise<Response>,
    ) {
        return this.changeType<
            RequestManagerConfig<RmcRequest<Rmc>, Response & Partial<globalThis.Response>>
        >().transformResponseAny(
            // @ts-expect-error transformer force cast
            transformer,
        );
    }

    protected transformRequestAny(
        transformer: (request: AnyRequest) => Partial<AnyRequest> | Promise<Partial<AnyRequest>>,
    ) {
        const cfg = this.config;
        this.config = {
            getRequestRawData: cfg.getRequestRawData,
            sendRequest: cfg.sendRequest,
            async transformRequest(request) {
                // eslint-disable-next-line no-param-reassign
                request = await cfg.transformRequest(request);
                return transformer(request );
            },
            transformResponse: cfg.transformResponse,
            onRequest: cfg.onRequest,
            onResponse: cfg.onResponse,
        } as Rmc;
        return this;
    }

    protected transformResponseAny(
        transformer: (
            response: globalThis.Response,
        ) => Partial<globalThis.Response> | Promise<Partial<globalThis.Response>>,
    ) {
        const cfg = this.config;
        this.config = {
            getRequestRawData: cfg.getRequestRawData,
            sendRequest: cfg.sendRequest,
            transformRequest: cfg.transformRequest,
            async transformResponse(response) {
                // eslint-disable-next-line no-param-reassign
                response = await cfg.transformResponse(response);
                return transformer(response as any);
            },
            onRequest: cfg.onRequest,
            onResponse: cfg.onResponse,
        } as Rmc;
        return this;
    }

    public transformRequestRawData(
        transformer: (data: RequestRawData) => RequestRawData | Promise<RequestRawData>,
    ) {
        const cfg = this.config;
        this.config = {
            async getRequestRawData(request) {
                const data = await cfg.getRequestRawData(request);
                return transformer(data);
            },
            sendRequest: cfg.sendRequest,
            transformRequest: cfg.transformRequest,
            transformResponse: cfg.transformResponse,
            onRequest: cfg.onRequest,
            onResponse: cfg.onResponse,
        } as Rmc;
        return this;
    }

    public customSendRequest(sendRequest: Rmc["sendRequest"]) {
        const cfg = this.config;
        this.config = {
            getRequestRawData: cfg.getRequestRawData,
            sendRequest: sendRequest,
            transformRequest: cfg.transformRequest,
            transformResponse: cfg.transformResponse,
            onRequest: cfg.onRequest,
            onResponse: cfg.onResponse,
        } as Rmc;
        return this;
    }

    public onRequest(listener: NonNullable<Rmc["onRequest"]>) {
        const cfg = this.config;
        this.config = {
            getRequestRawData: cfg.getRequestRawData,
            sendRequest: cfg.sendRequest,
            transformRequest: cfg.transformRequest,
            transformResponse: cfg.transformResponse,
            onRequest(d) {
                cfg.onRequest?.(d);
                listener(d);
            },
            onResponse: cfg.onResponse,
        } as Rmc;
        return this;
    }

    public onResponse(listener: NonNullable<Rmc["onResponse"]>) {
        const cfg = this.config;
        this.config = {
            getRequestRawData: cfg.getRequestRawData,
            sendRequest: cfg.sendRequest,
            transformRequest: cfg.transformRequest,
            transformResponse: cfg.transformResponse,
            onRequest: cfg.onRequest,
            onResponse(d) {
                cfg.onResponse?.(d);
                listener(d);
            },
        } as Rmc;
        return this;
    }
}
