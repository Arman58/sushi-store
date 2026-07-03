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

export type AdminNavItem = {
    href: string;
    label: string;
    icon: SvgIconComponent;
    openInNewTab?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
    {
        href: "/admin/dashboard",
        label: "Аналитика",
        icon: BarChartOutlinedIcon,
    },
    {
        href: "/admin/orders",
        label: "Заказы",
        icon: ListAltIcon,
    },
    {
        href: "/admin/products",
        label: "Товары",
        icon: StorefrontIcon,
    },
    {
        href: "/admin/categories",
        label: "Категории",
        icon: CategoryOutlinedIcon,
    },
    {
        href: "/admin/banners",
        label: "Баннеры",
        icon: CampaignOutlinedIcon,
    },
    {
        href: "/admin/reviews",
        label: "Отзывы",
        icon: RateReviewOutlinedIcon,
    },
    {
        href: "/admin/delivery-zones",
        label: "Зоны доставки",
        icon: LocalShippingIcon,
    },
    {
        href: "/admin/promocodes",
        label: "Промокоды",
        icon: DiscountIcon,
    },
    {
        href: "/admin/kitchen",
        label: "Экран кухни",
        icon: RestaurantIcon,
        openInNewTab: true,
    },
];

export function resolveAdminPageTitle(pathname: string): string {
    const item = ADMIN_NAV_ITEMS.find(
        ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
    );
    return item?.label ?? "Админка";
}
