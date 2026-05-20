import * as React from "react"

import { cn } from "@/lib/utils"

function Toast({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="toast" className={cn(className)} {...props} />
}

export { Toast }
