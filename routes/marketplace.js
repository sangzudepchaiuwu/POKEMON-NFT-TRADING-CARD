const express = require('express');
const router = express.Router();
const svc = require('../src/services/marketplaceService');

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error('marketplace:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

router.get('/listings', wrap(async (req, res) => {
  const listings = await svc.listActiveListings(req.query);
  res.json({ success: true, listings, total: listings.length });
}));

router.get('/listings/:id', wrap(async (req, res) => {
  const listing = await svc.getListingFull(Number(req.params.id));
  if (!listing) return res.status(404).json({ success: false, error: 'Listing không tồn tại' });
  res.json({ success: true, listing });
}));

router.post('/list', wrap(async (req, res) => {
  const { packId, cardIndex, sellerAddress, price, nftTokenId, onChainListingId, listTxHash } = req.body;
  const listing = await svc.createListing({
    packId: Number(packId),
    cardIndex: Number(cardIndex),
    sellerAddress,
    price: Number(price),
    nftTokenId,
    onChainListingId,
    listTxHash,
  });
  res.json({ success: true, listing });
}));

router.post('/listings/:id/cancel', wrap(async (req, res) => {
  const { sellerAddress, txHash } = req.body;
  const listing = await svc.cancelListing({
    listingId: Number(req.params.id),
    sellerAddress,
    txHash,
  });
  res.json({ success: true, listing });
}));

router.post('/listings/:id/buy', wrap(async (req, res) => {
  const { buyerAddress, txHash } = req.body;
  const listing = await svc.buyListing({
    listingId: Number(req.params.id),
    buyerAddress,
    txHash,
  });
  res.json({ success: true, listing });
}));

router.post('/listings/:id/offers', wrap(async (req, res) => {
  const { offererAddress, offerPrice, message, onChainOfferId, makeTxHash } = req.body;
  const offer = await svc.makeOffer({
    listingId: Number(req.params.id),
    offererAddress,
    offerPrice: Number(offerPrice),
    message,
    onChainOfferId,
    makeTxHash,
  });
  res.json({ success: true, offer });
}));

router.post('/offers/:id/accept', wrap(async (req, res) => {
  const { sellerAddress, txHash } = req.body;
  const result = await svc.acceptOffer({
    offerId: Number(req.params.id),
    sellerAddress,
    txHash,
  });
  res.json({ success: true, ...result });
}));

router.post('/offers/:id/cancel', wrap(async (req, res) => {
  const { offererAddress, txHash } = req.body;
  const offer = await svc.cancelOffer({
    offerId: Number(req.params.id),
    offererAddress,
    txHash,
  });
  res.json({ success: true, offer });
}));

router.get('/my/:address', wrap(async (req, res) => {
  const data = await svc.getMyMarketData(req.params.address);
  res.json({ success: true, ...data });
}));

router.get('/activity', wrap(async (req, res) => {
  const activity = await svc.getActivity({
    address: req.query.address,
    limit: Number(req.query.limit) || 50,
  });
  res.json({ success: true, activity });
}));

// Legacy: DELETE /listings/:id ≈ cancel (giữ cho tương thích)
router.delete('/listings/:id', wrap(async (req, res) => {
  const { sellerAddress } = req.body;
  const listing = await svc.cancelListing({
    listingId: Number(req.params.id),
    sellerAddress,
  });
  res.json({ success: true, listing });
}));

module.exports = router;
