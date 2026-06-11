"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
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
    const qs = searchParams.toString();
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
        sx={{ flexShrink: 0, minWidth: 40, width: 40, height: 40 }}
      >
        {currentLanguage.flag}
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
