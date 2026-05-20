import * as React from "react"
import { Toggle as TogglePrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Toggle({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn("inline-flex items-center justify-center rounded-md", className)}
      {...props}
    />
  )
}

export { Toggle }
