export {};

declare module "@mui/material/styles/createPalette" {
    interface Palette {
        gray: PaletteColor;
        buy: PaletteColor;
        sell: PaletteColor;
    }
    interface PaletteOptions {
        gray?: PaletteColorOptions;
        buy?: PaletteColorOptions;
        sell?: PaletteColorOptions;
    }
}

interface ColorOverrides {
    gray: true;
    buy: true;
    sell: true;
}

declare module "@mui/material/Slider" {
    interface SliderPropsColorOverrides extends ColorOverrides {}
}

declare module "@mui/material/Button" {
    interface ButtonPropsColorOverrides extends ColorOverrides {}
}

declare module "@mui/material/TextField" {
    interface TextFieldPropsColorOverrides extends ColorOverrides {}
}

declare module "@mui/material/CircularProgress" {
    interface CircularProgressPropsColorOverrides extends ColorOverrides {}
}
