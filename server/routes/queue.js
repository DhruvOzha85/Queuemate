const express = require('express');
const Business = require('../models/Business');
const Ticket = require('../models/Ticket');
const { protect } = require('../middleware/auth');

const router = express.Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function emitQueueUpdate(req, businessId) {
  const io = req.app.get('io');
  if (io) io.to(`business:${businessId}`).emit('queue:updated', { businessId: String(businessId) });
}

async function getSmartAvgMinutes(business) {
  const completed = await Ticket.find({
    businessId: business._id,
    status: 'completed',
    calledAt: { $ne: null },
    completedAt: { $ne: null },
  })
    .sort({ completedAt: -1 })
    .limit(10);

  if (completed.length < 3) return business.averageServiceMinutes;

  const totalMins = completed.reduce((sum, t) => {
    const mins = (t.completedAt.getTime() - t.calledAt.getTime()) / 60000;
    return sum + Math.max(1, Math.min(mins, 120));
  }, 0);
  return Math.round(totalMins / completed.length);
}

// Customer: Join queue
router.post('/:businessId/join', protect, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (!business.isOpen) return res.status(400).json({ message: 'Business is currently closed' });
    if (business.isPaused) return res.status(400).json({ message: 'Queue is currently paused' });

    const existing = await Ticket.findOne({
      businessId,
      userId: req.user._id,
      status: { $in: ['waiting', 'called'] },
    });
    if (existing) {
      return res.status(409).json({ message: 'You already have an active ticket for this business', ticket: existing });
    }

    const today = todayStr();
    let updatedBiz;
    if (business.lastTokenDate !== today) {
      updatedBiz = await Business.findOneAndUpdate(
        { _id: businessId },
        { $set: { lastTokenDate: today, lastTokenSeq: 1 } },
        { new: true }
      );
    } else {
      updatedBiz = await Business.findOneAndUpdate(
        { _id: businessId },
        { $inc: { lastTokenSeq: 1 } },
        { new: true }
      );
    }

    const seq = String(updatedBiz.lastTokenSeq).padStart(3, '0');
    const tokenNumber = `${updatedBiz.tokenPrefix || 'A'}-${seq}`;

    const ticket = await Ticket.create({
      businessId,
      userId: req.user._id,
      tokenNumber,
      queueDate: today,
      status: 'waiting',
    });

    emitQueueUpdate(req, businessId);
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
});

// Customer: My active ticket(s)
router.get('/my-ticket', protect, async (req, res, next) => {
  try {
    const tickets = await Ticket.find({
      userId: req.user._id,
      status: { $in: ['waiting', 'called'] },
    })
      .populate('businessId')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      tickets.map(async (t) => {
        const biz = t.businessId;
        const [waitingList, calledTicket, avgMinutes] = await Promise.all([
          Ticket.find({ businessId: biz._id, status: 'waiting' }).sort({ isPriority: -1, createdAt: 1 }),
          Ticket.findOne({ businessId: biz._id, status: 'called' }).sort({ calledAt: -1 }),
          getSmartAvgMinutes(biz),
        ]);

        const idx = waitingList.findIndex((w) => w._id.toString() === t._id.toString());
        const peopleAhead = t.status === 'called' ? 0 : idx >= 0 ? idx : 0;
        const position = t.status === 'called' ? 0 : peopleAhead + 1;

        return {
          ...t.toObject(),
          business: biz,
          currentServingToken: calledTicket ? calledTicket.tokenNumber : null,
          peopleAhead,
          position,
          totalWaiting: waitingList.length,
          estimatedWaitMinutes: biz.isPaused ? null : peopleAhead * avgMinutes,
        };
      })
    );

    res.json({ tickets: enriched });
  } catch (err) {
    next(err);
  }
});

// Customer: Queue history
router.get('/history', protect, async (req, res, next) => {
  try {
    const tickets = await Ticket.find({
      userId: req.user._id,
      status: { $in: ['completed', 'skipped', 'cancelled'] },
    })
      .populate('businessId', 'name category address')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

// Public/Customer: Business queue summary
router.get('/:businessId', async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });

    const [waitingList, calledTicket, avgMinutes] = await Promise.all([
      Ticket.find({ businessId: business._id, status: 'waiting' })
        .select('tokenNumber isPriority status createdAt')
        .sort({ isPriority: -1, createdAt: 1 }),
      Ticket.findOne({ businessId: business._id, status: 'called' }).sort({ calledAt: -1 }),
      getSmartAvgMinutes(business),
    ]);

    res.json({
      business,
      currentServingToken: calledTicket ? calledTicket.tokenNumber : null,
      waitingCount: waitingList.length,
      estimatedWaitMinutes: business.isPaused ? null : waitingList.length * avgMinutes,
      waitingList,
    });
  } catch (err) {
    next(err);
  }
});

// Customer: Cancel own ticket
router.put('/ticket/:id/cancel', protect, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this ticket' });
    }
    if (!['waiting', 'called'].includes(ticket.status)) {
      return res.status(400).json({ message: `Cannot cancel a ${ticket.status} ticket` });
    }

    ticket.status = 'cancelled';
    await ticket.save();

    emitQueueUpdate(req, ticket.businessId);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.emitQueueUpdate = emitQueueUpdate;
module.exports.getSmartAvgMinutes = getSmartAvgMinutes;
