const express = require('express');
const Business = require('../models/Business');
const Ticket = require('../models/Ticket');
const { protect, requireRole } = require('../middleware/auth');
const { emitQueueUpdate, getSmartAvgMinutes } = require('./queue');

const router = express.Router();

router.use(protect, requireRole('provider'));

async function verifyBusinessOwner(businessId, userId) {
  const business = await Business.findById(businessId);
  if (!business) return { error: { status: 404, message: 'Business not found' } };
  if (business.ownerId.toString() !== userId.toString()) {
    return { error: { status: 403, message: 'You do not own this business' } };
  }
  return { business };
}

// Provider: Full queue dashboard for a business
router.get('/queue/:businessId', async (req, res, next) => {
  try {
    const { business, error } = await verifyBusinessOwner(req.params.businessId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const today = new Date().toISOString().slice(0, 10);
    const [currentServing, waitingTickets, completedCount, avgMinutes] = await Promise.all([
      Ticket.findOne({ businessId: business._id, status: 'called' })
        .populate('userId', 'name email')
        .sort({ calledAt: -1 }),
      Ticket.find({ businessId: business._id, status: 'waiting' })
        .populate('userId', 'name email')
        .sort({ isPriority: -1, createdAt: 1 }),
      Ticket.countDocuments({ businessId: business._id, queueDate: today, status: 'completed' }),
      getSmartAvgMinutes(business),
    ]);

    res.json({
      business,
      currentServing,
      waitingTickets,
      completedCount,
      averageServiceMinutes: avgMinutes,
      estimatedWaitMinutes: business.isPaused ? null : waitingTickets.length * avgMinutes,
    });
  } catch (err) {
    next(err);
  }
});

// Provider: Call next customer
router.post('/queue/:businessId/next', async (req, res, next) => {
  try {
    const { business, error } = await verifyBusinessOwner(req.params.businessId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });
    if (business.isPaused) return res.status(400).json({ message: 'Resume the queue before calling next' });

    // Auto-complete any currently called ticket
    await Ticket.updateMany(
      { businessId: business._id, status: 'called' },
      { $set: { status: 'completed', completedAt: new Date() } }
    );

    const nextTicket = await Ticket.findOneAndUpdate(
      { businessId: business._id, status: 'waiting' },
      { $set: { status: 'called', calledAt: new Date() } },
      { new: true, sort: { isPriority: -1, createdAt: 1 } }
    ).populate('userId', 'name email');

    emitQueueUpdate(req, business._id);
    res.json({ ticket: nextTicket || null, message: nextTicket ? 'Next customer called' : 'Queue is empty' });
  } catch (err) {
    next(err);
  }
});

// Provider: Complete a ticket
router.put('/ticket/:id/complete', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const { error } = await verifyBusinessOwner(ticket.businessId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    if (ticket.status !== 'called') {
      return res.status(400).json({ message: `Only a called ticket can be completed (current: ${ticket.status})` });
    }

    ticket.status = 'completed';
    ticket.completedAt = new Date();
    await ticket.save();

    emitQueueUpdate(req, ticket.businessId);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

// Provider: Skip a ticket
router.put('/ticket/:id/skip', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const { error } = await verifyBusinessOwner(ticket.businessId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    if (!['waiting', 'called'].includes(ticket.status)) {
      return res.status(400).json({ message: `Cannot skip a ${ticket.status} ticket` });
    }

    ticket.status = 'skipped';
    await ticket.save();

    emitQueueUpdate(req, ticket.businessId);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

// Provider: Toggle priority on a waiting ticket
router.put('/ticket/:id/priority', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const { error } = await verifyBusinessOwner(ticket.businessId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    if (ticket.status !== 'waiting') {
      return res.status(400).json({ message: 'Only waiting tickets can change priority' });
    }

    ticket.isPriority = !ticket.isPriority;
    await ticket.save();

    emitQueueUpdate(req, ticket.businessId);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

// Provider: Pause queue
router.put('/queue/:businessId/pause', async (req, res, next) => {
  try {
    const { business, error } = await verifyBusinessOwner(req.params.businessId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    business.isPaused = true;
    await business.save();

    emitQueueUpdate(req, business._id);
    res.json({ business });
  } catch (err) {
    next(err);
  }
});

// Provider: Resume queue
router.put('/queue/:businessId/resume', async (req, res, next) => {
  try {
    const { business, error } = await verifyBusinessOwner(req.params.businessId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    business.isPaused = false;
    await business.save();

    emitQueueUpdate(req, business._id);
    res.json({ business });
  } catch (err) {
    next(err);
  }
});

// Provider: Verify QR ticket
router.post('/ticket/verify-qr', async (req, res, next) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ message: 'ticketId is required' });

    const ticket = await Ticket.findById(ticketId).populate('userId', 'name email');
    if (!ticket) return res.status(404).json({ message: 'Invalid ticket QR' });

    const { error } = await verifyBusinessOwner(ticket.businessId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    res.json({
      valid: ['waiting', 'called'].includes(ticket.status),
      ticket,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
