// Order tables for Stripe Checkout: orders, order_items and the processed
// Stripe webhook event log.
//
// Prices are snapshotted from products at checkout time; Stripe is only told
// what these rows say. Status changes are made by the server from verified
// Stripe data, never from the browser.
//
// drizzle-kit loads this file directly, so use relative imports only.

import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { products } from "./catalog";
import { user } from "./schema";

// pending:    Checkout Session open, stock reserved.
// processing: session completed, a delayed payment method is still settling;
//             stock stays reserved.
// paid:       payment confirmed by Stripe (server-verified).
// failed:     delayed payment failed; stock released.
// expired:    session expired unpaid; stock released.
// canceled:   customer cancelled or the session couldn't be created; stock
//             released.
export const orderStatus = pgEnum("order_status", [
  "pending",
  "processing",
  "paid",
  "failed",
  "expired",
  "canceled",
]);

export type OrderShipping = {
  name: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
};

export const orders = pgTable(
  "orders",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    // Public reference used in URLs, e.g. AT-7K3M9QX2.
    number: text().notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: orderStatus().notNull().default("pending"),
    currency: text().notNull().default("usd"),
    subtotalCents: integer("subtotal_cents").notNull(),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    // Stripe references. Unique so a session or payment can map to one order.
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    // Filled from the Stripe Checkout Session once paid.
    email: text(),
    shipping: jsonb().$type<OrderShipping>(),
    // When the Checkout Session (and the stock reservation) lapses.
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("orders_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("orders_status_idx").on(table.status),
    check("orders_number_format", sql`${table.number} ~ '^AT-[0-9A-Z]{8}$'`),
    check("orders_currency_format", sql`${table.currency} ~ '^[a-z]{3}$'`),
    check("orders_subtotal_cents_nonnegative", sql`${table.subtotalCents} >= 0`),
    check("orders_tax_cents_nonnegative", sql`${table.taxCents} >= 0`),
    check(
      "orders_total_matches",
      sql`${table.totalCents} = ${table.subtotalCents} + ${table.taxCents}`,
    ),
    // A paid order always records when it was paid and which Stripe session
    // and payment it was paid through.
    check(
      "orders_paid_has_payment_details",
      sql`${table.status} <> 'paid' OR (${table.paidAt} IS NOT NULL AND ${table.stripeCheckoutSessionId} IS NOT NULL AND ${table.stripePaymentIntentId} IS NOT NULL)`,
    ),
    check(
      "orders_paid_at_only_when_paid",
      sql`${table.paidAt} IS NULL OR ${table.status} = 'paid'`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    // Snapshot at checkout: later catalog edits don't change past orders.
    productName: text("product_name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer().notNull(),
  },
  (table) => [
    unique("order_items_order_id_product_id_unique").on(table.orderId, table.productId),
    index("order_items_product_id_idx").on(table.productId),
    check("order_items_unit_price_cents_nonnegative", sql`${table.unitPriceCents} >= 0`),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

// Stripe webhook events already handled, so redeliveries are skipped.
// State transitions are idempotent on their own; this is the audit trail and
// short-circuit.
export const stripeEvents = pgTable("stripe_events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  eventId: text("event_id").notNull().unique(),
  type: text().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));
