"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useState } from "react";

import { usePathname, useRouter } from "@/i18n/server";

const languages = [
  { code: "hy", label: "Հայերեն", flag: "🇦🇲" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (newLocale: string) => {
    const qs =
      typeof window !== "undefined"
        ? window.location.search.slice(1)
        : searchParams.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.replace(href, { locale: newLocale });
    handleClose();
  };

  const currentLanguage = languages.find((l) => l.code === locale) || languages[0];

  return (
    <Box sx={{ flexShrink: 0, minWidth: 40, display: "flex", alignItems: "center" }}>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-label={currentLanguage.label}
        sx={{
          flexShrink: 0,
          minWidth: 48,
          height: 40,
          px: 1,
          borderRadius: "10px",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.3,
          color: "text.primary",
          gap: 0.25,
        }}
      >
        {currentLanguage.code.toUpperCase()}
        <Box
          component="span"
          aria-hidden
          sx={{ fontSize: 10, lineHeight: 1, color: "text.disabled" }}
        >
          ▼
        </Box>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { mt: 1 },
        }}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            selected={locale === lang.code}
            onClick={() => handleChange(lang.code)}
          >
            <ListItemIcon sx={{ minWidth: 30 }}>{lang.flag}</ListItemIcon>
            <ListItemText>{lang.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
