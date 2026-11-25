const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenNumber: { type: String, required: true },
    queueDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['waiting', 'called', 'completed', 'skipped', 'cancelled'],
      default: 'waiting',
      index: true,
    },
    isPriority: { type: Boolean, default: false },
    calledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ticketSchema.index({ businessId: 1, queueDate: 1, tokenNumber: 1 }, { unique: true });
ticketSchema.index(
  { businessId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['waiting', 'called'] } } }
);

module.exports = mongoose.model('Ticket', ticketSchema);
