import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

const shortcuts = [
  {
    title: 'Configurer les produits',
    description: 'Gérez le catalogue des prestations et ajoutez de nouveaux services.',
    to: '/admin/products',
  },
  {
    title: 'Mettre à jour les packs',
    description: 'Composez des offres combinées avec prix préférentiels.',
    to: '/admin/bundles',
  },
  {
    title: 'Actualiser les blocs de contenu',
    description: 'Rédigez les sections éditoriales réutilisables pour les devis.',
    to: '/admin/content-blocks',
  },
]

export function AdminDashboardPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl font-semibold text-memopyk-dark-blue"
        >
          Espace administration MEMOPYK
        </motion.h1>
        <p className="max-w-2xl text-sm text-memopyk-blue-gray">
          Configurez le catalogue, les taxes, les devises étrangères et l’identité visuelle. Chaque écran
          affiche des données fictives jusqu’à la connexion à l’API.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {shortcuts.map((shortcut) => (
          <Card key={shortcut.to}>
            <CardHeader>
              <CardTitle>{shortcut.title}</CardTitle>
              <CardDescription>{shortcut.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="accent" asChild>
                <NavLink to={shortcut.to}>Ouvrir</NavLink>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des actions</CardTitle>
          <CardDescription>Journal mock affiché ici après intégration avec `/api/admin/activities`.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-memopyk-blue-gray">
            <p>Aucune activité pour le moment. Connectez-vous plus tard pour consulter les journaux.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
