import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { MainLayout } from './layouts/MainLayout'
import { HomePage } from './pages/HomePage'
import { AdminLayout } from './layouts/AdminLayout'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { ProductsPage } from './pages/admin/ProductsPage'
import { BundlesPage } from './pages/admin/BundlesPage'
import { ContentBlocksPage } from './pages/admin/ContentBlocksPage'
import { TaxRatesPage } from './pages/admin/TaxRatesPage'
import { CurrenciesFxPage } from './pages/admin/CurrenciesFxPage'
import { BrandingPage } from './pages/admin/BrandingPage'
import { QuoteEditorPage } from './pages/quotes/QuoteEditorPage'
import { PublicQuoteViewPage } from './pages/public/PublicQuoteViewPage'
import { NotFoundPage } from './pages/NotFoundPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboardPage />,
          },
          {
            path: 'products',
            element: <ProductsPage />,
          },
          {
            path: 'bundles',
            element: <BundlesPage />,
          },
          {
            path: 'content-blocks',
            element: <ContentBlocksPage />,
          },
          {
            path: 'tax-rates',
            element: <TaxRatesPage />,
          },
          {
            path: 'currencies-fx',
            element: <CurrenciesFxPage />,
          },
          {
            path: 'branding',
            element: <BrandingPage />,
          },
        ],
      },
      {
        path: 'devis/:id',
        element: <QuoteEditorPage />,
      },
      {
        path: 'p/:token',
        element: <PublicQuoteViewPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
