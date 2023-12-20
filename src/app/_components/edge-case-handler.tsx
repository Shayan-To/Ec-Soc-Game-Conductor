import { Button, CircularProgress } from "@mui/material";
import { EdgeCaseHandler as BaseEdgeCaseHandler } from "~/core/components/edge-case-handler";
import { withDefaultProps } from "~/core/components/with-default-props";

export const EdgeCaseHandler = withDefaultProps(BaseEdgeCaseHandler, {
    edgeCaseContainer(children) {
        return <div className="padding-tb-5 lcontent-center xitems-center">{children}</div>;
    },
    loadingContainer: (message) => (
        <>
            <CircularProgress />
            {message}
        </>
    ),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    errorMessage: (e: any) => (typeof e === "object" ? e?.message + "" : "خطای ناشناخته"),
    errorContainer(message, retry) {
        return (
            <>
                <span className="margin-b-3 text-center">{message}</span>
                <Button onClick={retry}>تلاش مجدد</Button>
            </>
        );
    },
    emptyMessage: "موردی یافت نشد.",
    emptyContainer: (message) => <span className="color-gray text-center">{message}</span>,
});
