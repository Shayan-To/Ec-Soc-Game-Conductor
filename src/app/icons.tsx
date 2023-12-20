import ForestIcon from '@mui/icons-material/Forest';
import GavelIcon from '@mui/icons-material/Gavel';
import TakeoutDiningIcon from '@mui/icons-material/TakeoutDining';
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import { ReactElement } from "react";
import { Asset } from "~/base/entities";

export const assetIcons: { [asset in Asset]: ReactElement } = {
    coin: <MonetizationOnIcon />,
    food: <TakeoutDiningIcon />,
    iron: <GavelIcon />,
    lumber: <ForestIcon />,
};
