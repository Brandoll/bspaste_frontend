"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  checked,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  const isChecked = checked === true

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      checked={checked}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 shadow-inner transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-5 w-9" : "h-6 w-11",
        isChecked ? "bg-primary" : "bg-slate-300 dark:bg-slate-700",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "block rounded-full bg-white shadow-sm transition-transform",
          size === "sm" ? "size-4" : "size-5",
          isChecked ? (size === "sm" ? "translate-x-4" : "translate-x-5") : "translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
