'use client'

import { composeRenderProps } from 'react-aria-components'
import { cn } from '@/lib/utils'

export function cx<T = unknown>(
  ...classes: [...string[], ((v: T) => string) | string | undefined]
): string | ((v: T) => string) {
  const className = classes.pop() as string | ((v: T) => string) | undefined
  return composeRenderProps(className, (className) => cn(...(classes as string[]), className as string))
}
