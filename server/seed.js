require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Business = require('./models/Business');

async function seed() {
  await connectDB();

  let provider = await User.findOne({ email: 'provider@queuemate.demo' });
  if (!provider) {
    provider = await User.create({
      name: 'Demo Provider',
      email: 'provider@queuemate.demo',
      password: 'password123',
      role: 'provider',
    });
  }

  let customer = await User.findOne({ email: 'customer@queuemate.demo' });
  if (!customer) {
    customer = await User.create({
      name: 'Demo Customer',
      email: 'customer@queuemate.demo',
      password: 'password123',
      role: 'customer',
    });
  }

  const sampleBusinesses = [
    {
      name: 'City Care Clinic',
      description: 'General physician & walk-in consultations.',
      category: 'Clinics',
      address: '14 MG Road, Ground Floor',
      averageServiceMinutes: 8,
      tokenPrefix: 'C',
    },
    {
      name: 'Studio Trim Salon',
      description: 'Haircuts, styling, and grooming.',
      category: 'Salons',
      address: '22 Park Street, Suite 3',
      averageServiceMinutes: 15,
      tokenPrefix: 'S',
    },
    {
      name: 'Campus North Canteen',
      description: 'Fresh meals, snacks, and beverages.',
      category: 'College Canteens',
      address: 'Engineering Block B',
      averageServiceMinutes: 3,
      tokenPrefix: 'F',
    },
    {
      name: 'QuickPrint & Xerox',
      description: 'Document printing, binding, and scanning.',
      category: 'Photocopy Shops',
      address: 'Opposite Main Gate',
      averageServiceMinutes: 4,
      tokenPrefix: 'P',
    },
    {
      name: 'TechFix Service Centre',
      description: 'Phone & laptop diagnostics and repairs.',
      category: 'Service Centres',
      address: '88 Residency Lane',
      averageServiceMinutes: 12,
      tokenPrefix: 'T',
    },
  ];

  for (const b of sampleBusinesses) {
    const exists = await Business.findOne({ name: b.name });
    if (!exists) {
      await Business.create({ ...b, ownerId: provider._id });
    }
  }

  console.log('Seed complete. Demo accounts: provider@queuemate.demo / customer@queuemate.demo (password: password123)');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
