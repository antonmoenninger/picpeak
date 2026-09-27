/**
 * Migration: heal photo_purchases.access_token uniqueness (photo sales).
 *
 * The original photo_purchases DDL in migration 260 marked `access_token`
 * UNIQUE — but one order buys N photos, so N rows legitimately share the
 * same token and the second insert of a multi-photo order failed with a
 * unique violation. The token is unique on the ORDER row
 * (photo_purchase_orders.access_token), which is the correct place.
 *
 * Postgres: drop the constraint by name. SQLite cannot drop constraints, so
 * the table is rebuilt without the bad index. Idempotent — no-op on
 * databases where 260 already landed in its corrected form.
 */

exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable('photo_purchases'))) return;

  const client = knex.client.config.client || '';

  if (client === 'pg' || client === 'postgresql' || client === 'postgres') {
    await knex.raw(
      'ALTER TABLE photo_purchases DROP CONSTRAINT IF EXISTS photo_purchases_access_token_uniq'
    ).catch(() => { /* already gone */ });
    console.log('  dropped photo_purchases_access_token_uniq (Postgres)');
    return;
  }

  // SQLite branch.
  const rows = await knex.raw(
    "SELECT name FROM sqlite_master WHERE type='index' AND name='photo_purchases_access_token_uniq'"
  );
  const has = Array.isArray(rows) && rows.length > 0;
  if (!has) {
    console.log('  photo_purchases_access_token_uniq already absent (SQLite) — skipping');
    return;
  }

  await knex.schema.createTable('photo_purchases_new', (t) => {
    t.increments('id').primary();
    t.string('order_id', 191).notNullable();
    t.integer('gallery_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
    t.integer('photo_id').notNullable().references('id').inTable('photos').onDelete('CASCADE');
    t.string('buyer_email', 191).notNullable();
    t.string('purchased_at', 32).notNullable();
    t.string('expires_at', 32).notNullable();
    t.string('access_token', 191).notNullable();
    t.string('currency', 8).notNullable().defaultTo('EUR');
    t.integer('amount_cents').notNullable().defaultTo(0);
    t.boolean('email_sent').notNullable().defaultTo(false);
    t.timestamp('created_at').nullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').nullable().defaultTo(knex.fn.now());
    t.unique(['order_id', 'photo_id'], 'photo_purchases_order_photo_uniq');
  });

  await knex.raw(`
    INSERT INTO photo_purchases_new
      (id, order_id, gallery_id, photo_id, buyer_email, purchased_at, expires_at,
       access_token, currency, amount_cents, email_sent, created_at, updated_at)
    SELECT
      id, order_id, gallery_id, photo_id, buyer_email, purchased_at, expires_at,
      access_token, currency, amount_cents, email_sent, created_at, updated_at
    FROM photo_purchases
  `);

  await knex.schema.dropTable('photo_purchases');
  await knex.schema.renameTable('photo_purchases_new', 'photo_purchases');
  console.log('  rebuilt photo_purchases without the access_token unique index (SQLite)');
};

exports.down = async function down() {
  // No-op: restoring the broken constraint would reintroduce the bug.
};
