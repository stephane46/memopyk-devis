import type { FC } from 'react'

import { cn } from '../../lib/utils'

export type StepItem = {
  label: string
  sub?: string
}

export interface StepsProps {
  title?: string
  steps: StepItem[]
  className?: string
}

export const Steps: FC<StepsProps> = ({ title = 'Prochaines étapes', steps, className }) => {
  if (!steps || steps.length === 0) {
    return null
  }

  return (
    <section
      className={cn(
        'rounded-3xl border border-memopyk-dark-blue/10 bg-white p-6 shadow-sm',
        className,
      )}
    >
      <h2 className="text-lg font-semibold text-memopyk-dark-blue">{title}</h2>
      <ol className="mt-4 space-y-4">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1

          return (
            <li key={index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-memopyk-sky-blue/30 text-sm font-semibold text-memopyk-dark-blue">
                  {index + 1}
                </div>
                {!isLast && (
                  <div className="mt-1 h-8 w-px bg-memopyk-sky-blue/30" aria-hidden="true" />
                )}
              </div>

              <div className="ml-2 flex-1">
                <p className="text-sm font-medium text-memopyk-dark-blue">{step.label}</p>
                {step.sub && <p className="mt-1 text-xs text-memopyk-blue-gray">{step.sub}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
