'use strict';

/**
 * Migration: track whether a gallery's one-time promo code was actually used.
 *
 * The free quota is a one-time giveaway: the promo code should work on the
 * FIRST order that applies it — not necessarily the very first order (a buyer
 * who forgets the code must not burn the quota for everyone else). Promo use
 * is recorded per purchase order so the webhook honours the code exactly once
 * per gallery, matching the Snipcart discount's maxNumberOfUsages=1.
 */

const { addColumnIfNotExists } = require('../helpers');

exports.up = async function up(knex) {
  await addColumnIfNotExists(knex, 'photo_purchase_orders', 'promo_used', (table) => {
    table.boolean('promo_used').notNullable().defaultTo(false);
  });
};

exports.down = async function down(knex) {
  if (await knex.schema.hasColumn('photo_purchase_orders', 'promo_used')) {
    await knex.schema.alterTable('photo_purchase_orders', (t) => t.dropColumn('promo_used'));
  }
};
