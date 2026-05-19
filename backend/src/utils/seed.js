require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const Author = require('../models/Author');
const Admin = require('../models/Admin');
const Ticket = require('../models/Ticket');


const SAMPLE_ADMINS = [
  {
    admin_id: 'ADM001',
    name: 'Sujit Kumar',
    email: 'sujit.kumar@bookleaf.com',
    password: 'adminpass123',
    role: 'super_admin',
  },
  {
    admin_id: 'ADM002',
    name: 'Ram Gupta',
    email: 'ram.gupta@bookleaf.com',
    password: 'adminpass123',
    role: 'super_admin',
  },
];

async function seed() {
  await connectDB();
  console.log('🌱 Starting seed...');

  const adminDocs = await Promise.all(
    SAMPLE_ADMINS.map(async (a) => {
      const hashed = await bcrypt.hash(a.password, 10);
      return { ...a, password: hashed };
    })
  );
  const createdAdmins = await Admin.insertMany(adminDocs);
  console.log(`✅ Created ${createdAdmins.length} admins`);

  // Sample tickets
  const sampleTickets = [
    {
      ticket_id: 'TKT-SEED-001',
      author_id: 'AUTH001',
      author_name: 'Priya Sharma',
      author_email: 'priya.sharma@email.com',
      book_id: 'BK001',
      book_title: 'Whispers of the Ganges',
      subject: 'Royalty pending for 3 months — no payment received',
      description:
        'My royalty of ₹3,570 has been pending since October 2025. The portal shows it as pending but I have not received any bank transfer. My bank details are correct. Please help.',
      category: 'Royalty & Payments',
      priority: 'Critical',
      status: 'Open',
      ai_meta: {
        suggested_category: 'Royalty & Payments',
        category_confidence: 0.97,
        suggested_priority: 'Critical',
        priority_reasoning: 'Unpaid royalties outstanding for 3+ months represent significant financial impact.',
      },
    },
    {
      ticket_id: 'TKT-SEED-002',
      author_id: 'AUTH002',
      author_name: 'Rohit Kapoor',
      author_email: 'rohit.kapoor@email.com',
      book_id: null,
      book_title: null,
      subject: 'Can I update my author bio on the website?',
      description: 'I would like to update my author biography on the BookLeaf website. How do I do that?',
      category: 'General Inquiry',
      priority: 'Low',
      status: 'Resolved',
      ai_meta: {
        suggested_category: 'General Inquiry',
        category_confidence: 0.92,
        suggested_priority: 'Low',
        priority_reasoning: 'Non-urgent informational request with no financial or operational impact.',
      },
      responses: [
        {
          sent_by: 'admin',
          sender_id: 'ADM001',
          sender_name: 'Sujit Kumar',
          message:
            'Hello Rohit! You can update your author bio directly from your Author Portal under Profile Settings. If you face any issues, please let us know. — BookLeaf Support Team',
          is_internal_note: false,
        },
      ],
    },
    {
      ticket_id: 'TKT-SEED-003',
      author_id: 'AUTH003',
      author_name: 'Ananya Reddy',
      author_email: 'ananya.reddy@email.com',
      book_id: 'BK004',
      book_title: 'Monsoon Letters',
      subject: 'Book not showing on Amazon India after 45 days of publication',
      description:
        'My book Monsoon Letters was published on 1st June 2024. It has been over 45 days and the book is still not visible on Amazon India. It only shows on BookLeaf Store. When will it be available on Amazon?',
      category: 'Distribution & Availability',
      priority: 'High',
      status: 'In Progress',
      assigned_to: 'ADM001',
      assigned_to_name: 'Sujit Kumar',
      assigned_at: new Date(),
      ai_meta: {
        suggested_category: 'Distribution & Availability',
        category_confidence: 0.95,
        suggested_priority: 'High',
        priority_reasoning: 'Book unavailable on major sales platform 45 days after publication directly impacts sales.',
      },
    },
  ];

  await Ticket.insertMany(sampleTickets);
  console.log(`✅ Created ${sampleTickets.length} sample tickets`);

  console.log('\n🎉 Seed complete!\n');
  console.log('\nAdmin logins:');
  SAMPLE_ADMINS.forEach((a) => console.log(`  ${a.email} / adminpass123`));

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});