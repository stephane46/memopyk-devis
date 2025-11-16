import { useEffect, useState } from 'react'
import { useCreateLine, useDeleteLine, useUpdateLine } from '../../../lib/useQuoteLines'

type QuoteLine = {
  id: string
  position: number
  description: string
  quantity: number
  unit_cents: number
  tax_rate_pct: number
  totals_gross_cents: number
  discount_pct?: number
}

type QuoteLinesPanelProps = {
  quoteId: string
  versionId: string
  lines: QuoteLine[]
  currencyCode: string
}

export function QuoteLinesPanel({ quoteId, versionId, lines, currencyCode }: QuoteLinesPanelProps) {
  const [draftLines, setDraftLines] = useState<QuoteLine[]>(() => lines ?? [])

  useEffect(() => {
    setDraftLines(lines ?? [])
  }, [lines])

  const updateLineField = <K extends keyof QuoteLine>(
    lineId: string,
    field: K,
    value: QuoteLine[K],
  ) => {
    setDraftLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)),
    )
  }

  const createLineMutation = useCreateLine(quoteId, versionId)
  const updateLineMutation = useUpdateLine(quoteId, versionId)
  const deleteLineMutation = useDeleteLine(quoteId, versionId)

  const currentError =
    (createLineMutation.isError && createLineMutation.error?.message) ||
    (updateLineMutation.isError && updateLineMutation.error?.message) ||
    (deleteLineMutation.isError && deleteLineMutation.error?.message) ||
    null

  const sortedDraftLines = [...draftLines].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  )

  const handleMoveLine = (lineId: string, direction: 'up' | 'down') => {
    const sorted = [...draftLines].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    const currentIndex = sorted.findIndex((line) => line.id === lineId)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sorted.length) return

    const current = sorted[currentIndex]
    const target = sorted[targetIndex]

    const newCurrentPosition = target.position
    const newTargetPosition = current.position

    // Optimistic local swap
    setDraftLines((prev) =>
      prev.map((line) => {
        if (line.id === current.id) {
          return { ...line, position: newCurrentPosition }
        }
        if (line.id === target.id) {
          return { ...line, position: newTargetPosition }
        }
        return line
      }),
    )

    // Persist both position changes; totals + canonical order are refreshed via invalidation
    updateLineMutation.mutate({
      lineId: current.id,
      payload: { position: newCurrentPosition },
    })
    updateLineMutation.mutate({
      lineId: target.id,
      payload: { position: newTargetPosition },
    })
  }

  if (!draftLines || draftLines.length === 0) {
    return (
      <section className="mt-8 rounded-xl border border-memopyk-blue-gray/30 bg-memopyk-cream px-4 py-3">
        <h2 className="text-sm font-semibold text-memopyk-dark-blue">Lignes du devis</h2>
        {currentError && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            Une erreur est survenue lors de la mise à jour des lignes. Merci de vérifier vos données et de
            réessayer.
          </div>
        )}
        <p className="mt-2 text-sm text-memopyk-blue-gray">
          Aucune ligne pour le moment. Vous pouvez ajouter une première ligne pour ce devis.
        </p>
        <button
          type="button"
          className="mt-3 inline-flex items-center rounded-full bg-memopyk-dark-blue px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() =>
            createLineMutation.mutate({
              description: 'Nouvelle ligne',
              qty: 1,
              unit_amount_cents: 0,
              tax_rate_bps: 0,
            })
          }
          disabled={createLineMutation.isPending}
        >
          + Ajouter une ligne
        </button>
      </section>
    )
  }

  return (
    <section className="mt-8 rounded-3xl border border-memopyk-dark-blue/10 bg-white px-4 py-4 shadow-sm">
      <h2 className="text-base font-semibold text-memopyk-dark-blue">Lignes du devis</h2>

      {currentError && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Une erreur est survenue lors de la mise à jour des lignes. Merci de vérifier vos données et de
          réessayer.
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full divide-y divide-memopyk-dark-blue/10 text-sm">
          <thead className="bg-memopyk-cream/70">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                Description
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                Qté
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                PU HT
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                TVA %
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                Remise %
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                Total TTC
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-memopyk-blue-gray">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedDraftLines.map((line, index) => {
              const original = lines.find((l) => l.id === line.id)
              const isDirty =
                !!original &&
                (original.description !== line.description ||
                  original.quantity !== line.quantity ||
                  original.unit_cents !== line.unit_cents ||
                  original.tax_rate_pct !== line.tax_rate_pct)

              const isFirst = index === 0
              const isLast = index === sortedDraftLines.length - 1

              const unitPriceDisplay = (line.unit_cents ?? 0) / 100
              const totalDisplay = (line.totals_gross_cents ?? 0) / 100

              return (
                <tr key={line.id} className="border-b border-memopyk-cream/70">
                  <td className="px-3 py-2 text-left align-top text-sm text-memopyk-dark-blue">
                    {line.position}
                  </td>
                  <td className="px-3 py-2 text-left align-top">
                    <div className="flex items-center gap-2">
                      {isDirty && (
                        <span
                          className="inline-block h-2 w-2 rounded-full bg-memopyk-orange"
                          aria-hidden="true"
                        />
                      )}
                      <input
                        className="w-full rounded-md border border-memopyk-cream bg-white px-2 py-1 text-sm text-memopyk-dark-blue shadow-inner focus:border-memopyk-sky-blue focus:outline-none"
                        type="text"
                        value={line.description ?? ''}
                        onChange={(e) => {
                          if (updateLineMutation.isError) {
                            updateLineMutation.reset()
                          }
                          updateLineField(line.id, 'description', e.target.value)
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <input
                      className="w-20 rounded-md border border-memopyk-cream bg-white px-2 py-1 text-right text-sm text-memopyk-dark-blue shadow-inner focus:border-memopyk-sky-blue focus:outline-none"
                      type="number"
                      min={0}
                      step={1}
                      value={line.quantity ?? 0}
                      onChange={(e) => {
                        if (updateLineMutation.isError) {
                          updateLineMutation.reset()
                        }
                        updateLineField(
                          line.id,
                          'quantity',
                          Number(e.target.value) || 0,
                        )
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 text-right align-top whitespace-nowrap">
                    <input
                      className="w-28 rounded-md border border-memopyk-cream bg-white px-2 py-1 text-right text-sm text-memopyk-dark-blue shadow-inner focus:border-memopyk-sky-blue focus:outline-none"
                      type="number"
                      min={0}
                      step={0.01}
                      value={unitPriceDisplay.toFixed(2)}
                      onChange={(e) => {
                        if (updateLineMutation.isError) {
                          updateLineMutation.reset()
                        }
                        const floatVal = parseFloat(e.target.value.replace(',', '.'))
                        const cents = Number.isNaN(floatVal)
                          ? 0
                          : Math.round(floatVal * 100)
                        updateLineField(line.id, 'unit_cents', cents)
                      }}
                    />
                    <span className="ml-1 text-xs text-memopyk-blue-gray">{currencyCode}</span>
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <input
                      className="w-20 rounded-md border border-memopyk-cream bg-white px-2 py-1 text-right text-sm text-memopyk-dark-blue shadow-inner focus:border-memopyk-sky-blue focus:outline-none"
                      type="number"
                      min={0}
                      step={0.1}
                      value={line.tax_rate_pct ?? 0}
                      onChange={(e) => {
                        if (updateLineMutation.isError) {
                          updateLineMutation.reset()
                        }
                        updateLineField(
                          line.id,
                          'tax_rate_pct',
                          Number(e.target.value) || 0,
                        )
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <span className="inline-block min-w-[3ch] text-right text-sm text-memopyk-dark-blue">
                      –
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right align-top whitespace-nowrap text-memopyk-dark-blue">
                    {totalDisplay.toFixed(2)} {currencyCode}
                  </td>
                  <td className="px-3 py-2 text-right align-top whitespace-nowrap text-xs">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="text-memopyk-blue-gray underline disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleMoveLine(line.id, 'up')}
                        disabled={isFirst || updateLineMutation.isPending}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="text-memopyk-blue-gray underline disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleMoveLine(line.id, 'down')}
                        disabled={isLast || updateLineMutation.isPending}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="text-memopyk-dark-blue underline disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          const taxRateBps = Math.max(
                            0,
                            Math.min(2500, Math.round((line.tax_rate_pct ?? 0) * 100)),
                          )
                          updateLineMutation.mutate({
                            lineId: line.id,
                            payload: {
                              description: line.description,
                              qty: line.quantity,
                              unit_amount_cents: line.unit_cents,
                              tax_rate_bps: taxRateBps,
                            },
                          })
                        }}
                        disabled={updateLineMutation.isPending || !isDirty}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="text-red-600 underline disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => deleteLineMutation.mutate(line.id)}
                        disabled={deleteLineMutation.isPending}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <button
          type="button"
          className="inline-flex items-center rounded-full bg-memopyk-dark-blue px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() =>
            createLineMutation.mutate({
              description: 'Nouvelle ligne',
              qty: 1,
              unit_amount_cents: 0,
              tax_rate_bps: 0,
            })
          }
          disabled={createLineMutation.isPending}
        >
          + Ajouter une ligne
        </button>
      </div>

      <p className="mt-2 text-xs text-memopyk-blue-gray">
        Les points orange indiquent des lignes modifiées localement. Cliquez sur « Enregistrer » pour
        une ligne donnée afin de mettre à jour le serveur et recalculer automatiquement les totaux.
      </p>
    </section>
  )
}
