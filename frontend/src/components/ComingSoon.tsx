import { type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ComingSoonProps {
  title: string
  description: string
  actions?: ReactNode
}

export function ComingSoon({ title, description, actions }: ComingSoonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl border border-memopyk-dark-blue/15 bg-white p-10 shadow-sm"
    >
      <h1 className="text-2xl font-semibold text-memopyk-dark-blue">{title}</h1>
      <p className="mt-3 text-memopyk-blue-gray">{description}</p>
      {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
      <div className="mt-8 rounded-2xl border border-dashed border-memopyk-dark-blue/25 bg-memopyk-cream/60 p-6 text-sm text-memopyk-blue-gray">
        <p className="font-medium text-memopyk-dark-blue">Écran à venir</p>
        <p>
          Cette vue affichera les données administratives réelles une fois connectée à l’API MEMOPYK.
          Les interactions sont simulées pour l’instant.
        </p>
      </div>
    </motion.div>
  )
}
