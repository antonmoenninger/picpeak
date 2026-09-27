const express = require('express');
const { db } = require('../../database/db');
const { errorResponse } = require('../../utils/routeHelpers');
const { verifyPurchaseAccess, buildPurchasedDownloadUrl } = require('../../modules/photoSales/purchaseAccess');

const router = express.Router();

router.get('/purchased-downloads/:accessToken', async (req, res) => {
  try {
    const { accessToken } = req.params;
    const order = await db('photo_purchase_orders')
      .where({ access_token: accessToken })
      .first();

    if (!order) {
      return res.status(404).json({ error: 'Purchase link not found' });
    }

    if (!verifyPurchaseAccess(order)) {
      return res.status(403).json({ error: 'Access expired' });
    }

    const gallery = await db('events')
      .where({ id: order.gallery_id })
      .first('id', 'slug', 'event_name');

    const accessRows = await db('photo_purchases')
      .where({ order_id: order.order_id, access_token: accessToken })
      .select('id', 'photo_id', 'expires_at', 'gallery_id', 'access_token');

    const activeRows = accessRows.filter((row) => verifyPurchaseAccess(row));
    if (!activeRows.length) {
      return res.status(403).json({ error: 'Access expired' });
    }

    const photoIds = activeRows.map((row) => row.photo_id);
    const photos = await db('photos')
      .whereIn('id', photoIds)
      .where('event_id', order.gallery_id)
      .select('*');

    const byId = new Map(photos.map((photo) => [Number(photo.id), photo]));
    const validPhotos = photoIds
      .map((id) => byId.get(Number(id)))
      .filter(Boolean);

    return res.json({
      access_token: accessToken,
      order_id: order.order_id,
      gallery_id: order.gallery_id,
      gallery_slug: gallery?.slug || null,
      buyer_email: order.buyer_email,
      expires_at: order.expires_at,
      photo_ids: validPhotos.map((photo) => Number(photo.id)),
      photos: validPhotos.map((photo) => ({
        id: Number(photo.id),
        filename: photo.original_filename || photo.filename || null,
        photo_url: gallery?.slug
          ? `/api/gallery/${gallery.slug}/download/${photo.id}?access_token=${encodeURIComponent(accessToken)}`
          : null,
      })),
      download_url: buildPurchasedDownloadUrl({ accessToken }),
    });
  } catch (error) {
    errorResponse(res, error, 500, 'Failed to load purchased download access');
  }
});

module.exports = router;
