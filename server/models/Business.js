const mongoose = require('mongoose');

const CATEGORIES = [
  'Clinics',
  'Salons',
  'College Canteens',
  'Photocopy Shops',
  'Service Centres',
];

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    address: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    averageServiceMinutes: { type: Number, default: 5, min: 1, max: 180 },
    isOpen: { type: Boolean, default: true },
    isPaused: { type: Boolean, default: false },
    tokenPrefix: { type: String, default: 'A', trim: true, uppercase: true, maxlength: 3 },
    lastTokenSeq: { type: Number, default: 0 },
    lastTokenDate: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Business', businessSchema);
module.exports.CATEGORIES = CATEGORIES;
