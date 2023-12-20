import { getComponentName } from "~/core/utils/react-utils";
import { type MakeOptional } from "~/core/utils/type-utils";
import { type ComponentType, type FunctionComponent } from "react";

export function withDefaultProps<Props extends object, DefaultProps extends Partial<Props>>(
    component: FunctionComponent<Props>,
    defaultProps: DefaultProps,
) {
    const name = `${getComponentName(component as ComponentType)}_withDefalutProps`;
    const rComponent = {
        [name]: function (props: Props, context?: any) {
            return component({ ...defaultProps, ...props }, context);
        } as FunctionComponent<MakeOptional<Props, keyof DefaultProps & keyof Props>>,
    }[name]!;
    rComponent.propTypes = component.propTypes as never;
    rComponent.contextTypes = component.contextTypes;
    rComponent.defaultProps = component.defaultProps;
    rComponent.displayName = name;
    return rComponent;
}
