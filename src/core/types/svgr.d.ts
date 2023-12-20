declare module "*.svg?r" {
    import { type ComponentType, type SVGProps } from "react";
    const Svg: ComponentType<SVGProps<SVGSVGElement>>;
    export default Svg;
}
