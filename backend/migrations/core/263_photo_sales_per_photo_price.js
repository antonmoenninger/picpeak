'use strict';

/**
 * Migration: per-photo price override for priced galleries (photo sales).
 *
 * `photos.photo_price` is NULL by default and means "use the gallery's
 * photo_price". An explicit value overrides the gallery default for that
 * one photo — the photographer can re-price individual photos later.
 */

const { addColumnIfNotExists } = require('../helpers');

exports.up = async function up(knex) {
  await addColumnIfNotExists(knex, 'photos', 'photo_price', (table) => {
    table.decimal('photo_price', 10, 2).nullable().defaultTo(null);
  });
};

exports.down = async function down(knex) {
  if (await knex.schema.hasColumn('photos', 'photo_price')) {
    await knex.schema.alterTable('photos', (t) => t.dropColumn('photo_price'));
  }
};
