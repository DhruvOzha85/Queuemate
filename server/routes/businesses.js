const express = require('express');
const Business = require('../models/Business');
const Ticket = require('../models/Ticket');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

async function attachQueueSummary(business) {
  const [waitingCount, calledTicket] = await Promise.all([
    Ticket.countDocuments({ businessId: business._id, status: 'waiting' }),
    Ticket.findOne({ businessId: business._id, status: 'called' }).sort({ calledAt: -1 }),
  ]);

  return {
    ...business.toObject(),
    waitingCount,
    currentServingToken: calledTicket ? calledTicket.tokenNumber : null,
    estimatedWaitMinutes: business.isPaused ? null : waitingCount * business.averageServiceMinutes,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const { search, category, owner } = req.query;
    const filter = {};
    if (category && category !== 'All') filter.category = category;
    if (search) filter.name = { $regex: search.trim(), $options: 'i' };
    if (owner) filter.ownerId = owner;

    const businesses = await Business.find(filter).sort({ createdAt: -1 });
    const enriched = await Promise.all(businesses.map(attachQueueSummary));
    res.json({ businesses: enriched });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    res.json({ business: await attachQueueSummary(business) });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, requireRole('provider'), async (req, res, next) => {
  try {
    const { name, description, category, address, averageServiceMinutes, tokenPrefix } = req.body;
    if (!name || !category || !address) {
      return res.status(400).json({ message: 'Name, category, and address are required' });
    }

    const business = await Business.create({
      name,
      description: description || '',
      category,
      address,
      ownerId: req.user._id,
      averageServiceMinutes: Number(averageServiceMinutes) || 5,
      tokenPrefix: (tokenPrefix || 'A').toUpperCase().slice(0, 3),
    });

    res.status(201).json({ business: await attachQueueSummary(business) });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', protect, requireRole('provider'), async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not own this business' });
    }

    const fields = ['name', 'description', 'category', 'address', 'averageServiceMinutes', 'isOpen', 'isPaused', 'tokenPrefix'];
    for (const f of fields) {
      if (req.body[f] !== undefined) business[f] = req.body[f];
    }
    await business.save();
    res.json({ business: await attachQueueSummary(business) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
