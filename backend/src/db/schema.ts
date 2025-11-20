import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const quoteStatusEnum = pgEnum('quote_status', [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
]);

export const quoteVersionStatusEnum = pgEnum('quote_version_status', [
  'draft',
  'current',
  'archived',
]);

export const quoteLineKindEnum = pgEnum('quote_line_kind', [
  'product',
  'service',
  'text',
]);

export const activityTypeEnum = pgEnum('quote_activity_type', [
  'created',
  'updated',
  'status_changed',
  'line_changed',
  'version_published',
  'attachment_added',
  'attachment_removed',
  'freeze',
  'send',
  'view',
  'accept',
  'decline',
  'sync_conflict',
  'offline_write',
  'version_locked',
  'version_limit_reached',
  'public_link_updated',
  'pin_failed',
  'pin_locked',
  'pin_verified',
]);

export const attachmentKindEnum = pgEnum('attachment_kind', [
  'general',
  'signed_acceptance',
  'supporting',
]);

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    number: varchar('number', { length: 32 }).notNull(),
    clientId: uuid('client_id'),
    status: quoteStatusEnum('status').notNull().default('draft'),
    acceptanceMode: text('acceptance_mode'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByName: text('accepted_by_name'),
    title: text('title'),
    customerName: text('customer_name'),
    summary: text('summary'),
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    validUntil: date('valid_until'),
    depositPct: numeric('deposit_pct', { precision: 5, scale: 4 }).default('0'),
    currentVersionId: uuid('current_version_id'),
    metadata: jsonb('metadata'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    numberUniqueIdx: uniqueIndex('quotes_number_unique').on(table.number),
    statusIdx: index('quotes_status_idx').on(table.status),
    createdIdx: index('quotes_created_at_idx').on(table.createdAt),
  })
);

export const quoteNumberCounters = pgTable('quote_number_counters', {
  year: integer('year').notNull().primaryKey(),
  lastSeq: integer('last_seq').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const quoteVersions = pgTable(
  'quote_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quoteId: uuid('quote_id').notNull(),
    versionNumber: integer('version_number').notNull(),
    label: text('label'),
    status: quoteVersionStatusEnum('status').notNull().default('draft'),
    title: text('title').notNull(),
    intro: text('intro'),
    notes: text('notes'),
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    validityDate: date('validity_date'),
    depositPct: numeric('deposit_pct', { precision: 5, scale: 4 }).default('0'),
    totalsNetCents: integer('totals_net_cents').default(0).notNull(),
    totalsTaxCents: integer('totals_tax_cents').default(0).notNull(),
    totalsGrossCents: integer('totals_gross_cents').default(0).notNull(),
    totalsDepositCents: integer('totals_deposit_cents').default(0).notNull(),
    totalsBalanceCents: integer('totals_balance_cents').default(0).notNull(),
    isLocked: boolean('is_locked').default(false).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueVersionIdx: uniqueIndex('quote_versions_quote_number_unique').on(
      table.quoteId,
      table.versionNumber,
    ),
    statusIdx: index('quote_versions_status_idx').on(table.status),
  })
);

export const quoteLines = pgTable(
  'quote_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    versionId: uuid('version_id').notNull(),
    kind: quoteLineKindEnum('kind').notNull(),
    refId: text('ref_id'),
    label: text('label').notNull(),
    description: text('description'),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
    unitPriceCents: integer('unit_price_cents').notNull().default(0),
    taxRatePct: numeric('tax_rate_pct', { precision: 5, scale: 4 }).notNull().default('0'),
    discountPct: numeric('discount_pct', { precision: 5, scale: 4 }).notNull().default('0'),
    optional: boolean('optional').notNull().default(false),
    position: integer('position').notNull(),
    netAmountCents: integer('net_amount_cents').notNull().default(0),
    taxAmountCents: integer('tax_amount_cents').notNull().default(0),
    grossAmountCents: integer('gross_amount_cents').notNull().default(0),
    metadata: jsonb('metadata'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    versionPositionIdx: uniqueIndex('quote_lines_version_position_unique').on(
      table.versionId,
      table.position,
    ),
  })
);

export const quoteLineRelations = relations(quoteLines, ({ one }) => ({
  version: one(quoteVersions, {
    fields: [quoteLines.versionId],
    references: [quoteVersions.id],
  }),
}));

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quoteId: uuid('quote_id').notNull(),
    versionId: uuid('version_id'),
    type: activityTypeEnum('type').notNull(),
    actor: text('actor'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    quoteIdx: index('activities_quote_id_idx').on(table.quoteId),
  })
);

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quoteId: uuid('quote_id').notNull(),
    versionId: uuid('version_id'),
    fileName: text('file_name').notNull(),
    url: text('url').notNull(),
    kind: attachmentKindEnum('kind').notNull().default('general'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    quoteIdx: index('attachments_quote_id_idx').on(table.quoteId),
  })
);

export const quotePublicLinks = pgTable(
  'quote_public_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quoteId: uuid('quote_id').notNull(),
    token: text('token').notNull(),
    pinHash: text('pin_hash'),
    pinFailedAttempts: integer('pin_failed_attempts').notNull().default(0),
    pinLockedUntil: timestamp('pin_locked_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    quoteIdx: index('quote_public_links_quote_id_idx').on(table.quoteId),
    tokenUniqueIdx: uniqueIndex('quote_public_links_token_unique').on(table.token),
  })
);

export const taxRates = pgTable(
  'tax_rates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    rateBps: integer('rate_bps').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeUniqueIdx: uniqueIndex('tax_rates_code_unique').on(table.code),
    defaultActiveIdx: index('tax_rates_default_active_idx').on(table.isDefault, table.isActive),
  }),
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    internalCode: text('internal_code'),
    name: text('name').notNull(),
    description: text('description'),
    defaultUnitPriceCents: integer('default_unit_price_cents'),
    defaultTaxRateId: uuid('default_tax_rate_id'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    internalCodeUniqueIdx: uniqueIndex('products_internal_code_unique').on(table.internalCode),
    activeIdx: index('products_active_idx').on(table.isActive),
  }),
);

export const brandingConfigs = pgTable(
  'branding_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    label: text('label').notNull(),
    companyName: text('company_name'),
    logoUrl: text('logo_url'),
    primaryColor: text('primary_color'),
    secondaryColor: text('secondary_color'),
    pdfFooterText: text('pdf_footer_text'),
    defaultValidityDays: integer('default_validity_days'),
    defaultDepositPct: integer('default_deposit_pct'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    labelUniqueIdx: uniqueIndex('branding_configs_label_unique').on(table.label),
  }),
);

export const pdfJobs = pgTable(
  'pdf_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quoteId: uuid('quote_id').notNull(),
    versionId: uuid('version_id').notNull(),
    status: text('status').notNull(),
    fileUrl: text('file_url'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => ({
    quoteVersionIdx: index('pdf_jobs_quote_version_idx').on(table.quoteId, table.versionId),
    statusIdx: index('pdf_jobs_status_idx').on(table.status),
  }),
);

export const quotesRelations = relations(quotes, ({ many, one }) => ({
  versions: many(quoteVersions),
  activities: many(activities),
  attachments: many(attachments),
   publicLinks: many(quotePublicLinks),
  currentVersion: one(quoteVersions, {
    fields: [quotes.currentVersionId],
    references: [quoteVersions.id],
  }),
}));

export const quoteVersionsRelations = relations(quoteVersions, ({ many, one }) => ({
  quote: one(quotes, {
    fields: [quoteVersions.quoteId],
    references: [quotes.id],
  }),
  lines: many(quoteLines),
  attachments: many(attachments),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  quote: one(quotes, {
    fields: [activities.quoteId],
    references: [quotes.id],
  }),
  version: one(quoteVersions, {
    fields: [activities.versionId],
    references: [quoteVersions.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  quote: one(quotes, {
    fields: [attachments.quoteId],
    references: [quotes.id],
  }),
  version: one(quoteVersions, {
    fields: [attachments.versionId],
    references: [quoteVersions.id],
  }),
}));

export const quotePublicLinksRelations = relations(quotePublicLinks, ({ one }) => ({
  quote: one(quotes, {
    fields: [quotePublicLinks.quoteId],
    references: [quotes.id],
  }),
}));

export const pdfJobsRelations = relations(pdfJobs, ({ one }) => ({
  quote: one(quotes, {
    fields: [pdfJobs.quoteId],
    references: [quotes.id],
  }),
  version: one(quoteVersions, {
    fields: [pdfJobs.versionId],
    references: [quoteVersions.id],
  }),
}));

export type Quote = typeof quotes.$inferSelect;
export type QuoteInsert = typeof quotes.$inferInsert;
export type QuoteVersion = typeof quoteVersions.$inferSelect;
export type QuoteVersionInsert = typeof quoteVersions.$inferInsert;
export type QuoteLine = typeof quoteLines.$inferSelect;
export type QuoteLineInsert = typeof quoteLines.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type QuotePublicLink = typeof quotePublicLinks.$inferSelect;
export type TaxRate = typeof taxRates.$inferSelect;
export type Product = typeof products.$inferSelect;
export type BrandingConfig = typeof brandingConfigs.$inferSelect;
export type PdfJob = typeof pdfJobs.$inferSelect;
export type PdfJobStatus = 'pending' | 'processing' | 'ready' | 'failed';
