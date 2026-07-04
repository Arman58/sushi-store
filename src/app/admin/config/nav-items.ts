import type { SvgIconComponent } from "@mui/icons-material";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import DiscountIcon from "@mui/icons-material/Discount";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import StorefrontIcon from "@mui/icons-material/Storefront";

/** labelKey - ключ в неймспейсе `admin.nav` (перевод в SidebarNav/тайтле). */
export type AdminNavItem = {
    href: string;
    labelKey: string;
    icon: SvgIconComponent;
    openInNewTab?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
    { href: "/admin/dashboard", labelKey: "dashboard", icon: BarChartOutlinedIcon },
    { href: "/admin/orders", labelKey: "orders", icon: ListAltIcon },
    { href: "/admin/products", labelKey: "products", icon: StorefrontIcon },
    { href: "/admin/categories", labelKey: "categories", icon: CategoryOutlinedIcon },
    { href: "/admin/banners", labelKey: "banners", icon: CampaignOutlinedIcon },
    { href: "/admin/reviews", labelKey: "reviews", icon: RateReviewOutlinedIcon },
    { href: "/admin/delivery-zones", labelKey: "deliveryZones", icon: LocalShippingIcon },
    { href: "/admin/promocodes", labelKey: "promocodes", icon: DiscountIcon },
    {
        href: "/admin/kitchen",
        labelKey: "kitchen",
        icon: RestaurantIcon,
        openInNewTab: true,
    },
];

/** Возвращает labelKey активного пункта (или null для дефолтного тайтла). */
export function resolveAdminNavKey(pathname: string): string | null {
    const item = ADMIN_NAV_ITEMS.find(
        ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
    );
    return item?.labelKey ?? null;
}
