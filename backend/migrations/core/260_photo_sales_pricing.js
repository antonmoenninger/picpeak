'use strict';

const { addColumnIfNotExists } = require('../helpers');

exports.up = async function up(knex) {
  await addColumnIfNotExists(knex, 'events', 'is_priced', (table) => {
    table.boolean('is_priced').notNullable().defaultTo(false);
  });
  await addColumnIfNotExists(knex, 'events', 'free_photo_count', (table) => {
    table.integer('free_photo_count').notNullable().defaultTo(0);
  });
  await addColumnIfNotExists(knex, 'events', 'photo_price', (table) => {
    table.decimal('photo_price', 10, 2).nullable().defaultTo(null);
  });
  await addColumnIfNotExists(knex, 'events', 'purchase_access_days', (table) => {
    table.integer('purchase_access_days').notNullable().defaultTo(30);
  });

  if (!(await knex.schema.hasTable('photo_purchases'))) {
    await knex.schema.createTable('photo_purchases', (t) => {
      t.increments('id').primary();
      t.string('order_id', 191).notNullable();
      t.integer('gallery_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
      t.integer('photo_id').notNullable().references('id').inTable('photos').onDelete('CASCADE');
      t.string('buyer_email', 191).notNullable();
      t.string('purchased_at', 32).notNullable();
      t.string('expires_at', 32).notNullable();
      // One order buys N photos → N rows SHARE this token. It must NOT be
      // unique here; uniqueness lives on photo_purchase_orders.access_token.
      t.string('access_token', 191).notNullable();
      t.string('currency', 8).notNullable().defaultTo('EUR');
      t.integer('amount_cents').notNullable().defaultTo(0);
      t.boolean('email_sent').notNullable().defaultTo(false);
      t.timestamp('created_at').nullable().defaultTo(knex.fn.now());
      t.timestamp('updated_at').nullable().defaultTo(knex.fn.now());
      t.unique(['order_id', 'photo_id'], 'photo_purchases_order_photo_uniq');
    });
  }

  if (!(await knex.schema.hasTable('photo_purchase_orders'))) {
    await knex.schema.createTable('photo_purchase_orders', (t) => {
      t.increments('id').primary();
      t.string('order_id', 191).notNullable().unique();
      t.integer('gallery_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
      t.string('buyer_email', 191).notNullable();
      t.integer('total_cents').notNullable().defaultTo(0);
      t.string('currency', 8).notNullable().defaultTo('EUR');
      t.string('status', 32).notNullable().defaultTo('completed');
      t.string('purchased_at', 32).notNullable();
      t.string('expires_at', 32).nullable();
      t.string('access_token', 191).notNullable().unique();
      t.boolean('email_sent').notNullable().defaultTo(false);
      t.timestamp('created_at').nullable().defaultTo(knex.fn.now());
      t.timestamp('updated_at').nullable().defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('photo_purchase_orders');
  await knex.schema.dropTableIfExists('photo_purchases');

  if (await knex.schema.hasColumn('events', 'is_priced')) {
    await knex.schema.alterTable('events', (t) => t.dropColumn('is_priced'));
  }
  if (await knex.schema.hasColumn('events', 'free_photo_count')) {
    await knex.schema.alterTable('events', (t) => t.dropColumn('free_photo_count'));
  }
  if (await knex.schema.hasColumn('events', 'photo_price')) {
    await knex.schema.alterTable('events', (t) => t.dropColumn('photo_price'));
  }
  if (await knex.schema.hasColumn('events', 'purchase_access_days')) {
    await knex.schema.alterTable('events', (t) => t.dropColumn('purchase_access_days'));
  }
};
