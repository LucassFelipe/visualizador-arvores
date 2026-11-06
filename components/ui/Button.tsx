"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";
import styles from "./ui.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "dangerGhost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: IconName;
  iconRight?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      icon,
      iconRight,
      className,
      children,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          styles.button,
          styles[variant],
          size === "sm" && styles.sm,
          className,
        )}
        {...props}
      >
        {icon ? <Icon name={icon} size={size === "sm" ? 14 : 16} /> : null}
        {children ? <span>{children}</span> : null}
        {iconRight ? (
          <Icon name={iconRight} size={size === "sm" ? 14 : 16} />
        ) : null}
      </button>
    );
  },
);

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  size?: "sm" | "md";
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { icon, label, size = "md", active, className, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        data-active={active || undefined}
        className={cx(
          styles.iconButton,
          size === "sm" && styles.iconButtonSm,
          className,
        )}
        {...props}
      >
        <Icon name={icon} size={size === "sm" ? 15 : 18} />
      </button>
    );
  },
);
