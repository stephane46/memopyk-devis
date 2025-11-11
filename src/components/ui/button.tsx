import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        default:
          'bg-memopyk-dark-blue text-memopyk-cream hover:bg-memopyk-navy focus-visible:ring-memopyk-sky-blue',
        accent:
          'bg-memopyk-orange text-memopyk-navy hover:bg-memopyk-dark-blue hover:text-memopyk-cream focus-visible:ring-memopyk-orange',
        outline:
          'border border-memopyk-dark-blue text-memopyk-dark-blue hover:bg-memopyk-dark-blue/10 focus-visible:ring-memopyk-sky-blue',
        ghost: 'text-memopyk-dark-blue hover:bg-memopyk-dark-blue/10 focus-visible:ring-memopyk-sky-blue',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'

