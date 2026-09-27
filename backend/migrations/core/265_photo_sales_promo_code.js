'use strict';

/**
 * Migration: one-time promo code for priced galleries (photo sales).
 *
 * Each priced gallery gets a random promo code generated at creation. The
 * code maps to a Snipcart discount (FixedAmount = free_photo_count ×
 * photo_price, max one use) so the free quota is applied by Snipcart's own
 * checkout instead of client-side cart re-pricing. `snipcart_discount_id`
 * remembers the created discount for later updates.
 */

const { addColumnIfNotExists } = require('../helpers');

exports.up = async function up(knex) {
  await addColumnIfNotExists(knex, 'events', 'promo_code', (table) => {
    table.text('promo_code');
  });
  await addColumnIfNotExists(knex, 'events', 'snipcart_discount_id', (table) => {
    table.text('snipcart_discount_id');
  });
};

exports.down = async function down(knex) {
  for (const column of ['promo_code', 'snipcart_discount_id']) {
    if (await knex.schema.hasColumn('events', column)) {
      await knex.schema.alterTable('events', (t) => t.dropColumn(column));
    }
  }
};
