'use strict';

/**
 * Migration: photo-sales watermark preview cache columns.
 *
 * Paid photos in priced galleries are watermarked on-the-fly until a
 * background job persists the composited lightbox preview (see
 * src/modules/photoSales/salesRenditions.js). These columns remember which
 * rendition is persisted and under which settings fingerprint, so serving
 * can skip sharp when nothing changed and stale files can be replaced.
 */

const { addColumnIfNotExists } = require('../helpers');

exports.up = async function up(knex) {
  await addColumnIfNotExists(knex, 'photos', 'photo_sales_preview_key', (table) => {
    table.text('photo_sales_preview_key');
  });
  await addColumnIfNotExists(knex, 'photos', 'photo_sales_preview_path', (table) => {
    table.text('photo_sales_preview_path');
  });
};

exports.down = async function down(knex) {
  for (const column of ['photo_sales_preview_key', 'photo_sales_preview_path']) {
    if (await knex.schema.hasColumn('photos', column)) {
      await knex.schema.alterTable('photos', (t) => t.dropColumn(column));
    }
  }
};
