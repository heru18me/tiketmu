import { PrismaClient, Role, EventStatus, TransactionStatus, DiscountType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addHours, addDays, addMonths, subDays, subMonths } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  await clearData();

  const categories = await seedCategories();
  const { organizers, customers } = await seedUsers();
  const events = await seedEvents(organizers, categories);
  await seedVouchers(events, organizers);
  await seedTransactions(customers, events);
  await seedReviews(customers, events);

  console.log('✅ Seed completed!');
}

// ============================================================
// CLEAR DATA
// ============================================================
async function clearData() {
  await prisma.review.deleteMany();
  await prisma.paymentProof.deleteMany();
  await prisma.transactionDetail.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.point.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.event.deleteMany();
  await prisma.eventCategory.deleteMany();
  await prisma.user.deleteMany();
}

// ============================================================
// CATEGORIES (10 kategori)
// ============================================================
async function seedCategories() {
  const categoryNames = [
    'Teknologi', 'Musik', 'Olahraga', 'Kuliner', 'Seni & Budaya',
    'Bisnis', 'Pendidikan', 'Kesehatan', 'Hiburan', 'Lingkungan'
  ];

  const categories = await Promise.all(
    categoryNames.map(name =>
      prisma.eventCategory.create({ data: { name } })
    )
  );
  console.log(`  ✓ Created ${categories.length} categories`);
  return categories;
}

// ============================================================
// USERS (30 users: 8 organizer + 22 customer)
// ============================================================
async function seedUsers() {
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const organizerData = [
    { name: 'EO Jakarta Kreatif', email: 'eo.jakarta@tiketmu.com', referralCode: 'EOJAKRTA' },
    { name: 'Surabaya Events Pro', email: 'eo.surabaya@tiketmu.com', referralCode: 'EOSBYPRO' },
    { name: 'Bandung Festival Hub', email: 'eo.bandung@tiketmu.com', referralCode: 'EOBDGFST' },
    { name: 'Bali Experience', email: 'eo.bali@tiketmu.com', referralCode: 'EOBALIXP' },
    { name: 'Yogya Budaya Event', email: 'eo.yogya@tiketmu.com', referralCode: 'EOYGYBDY' },
    { name: 'Medan Prime Event', email: 'eo.medan@tiketmu.com', referralCode: 'EOMDNPRM' },
    { name: 'Makassar Event Co', email: 'eo.makassar@tiketmu.com', referralCode: 'EOMKSEVC' },
    { name: 'Semarang Event Hub', email: 'eo.semarang@tiketmu.com', referralCode: 'EOSMRHUB' },
  ];

  const customerData = [
    { name: 'Budi Santoso', email: 'budi@tiketmu.com', referralCode: 'BUDISNT1' },
    { name: 'Siti Rahayu', email: 'siti@tiketmu.com', referralCode: 'SITIRAY1' },
    { name: 'Ahmad Fauzi', email: 'ahmad@tiketmu.com', referralCode: 'AHMADFZ1' },
    { name: 'Dewi Lestari', email: 'dewi@tiketmu.com', referralCode: 'DEWILST1' },
    { name: 'Rizky Pratama', email: 'rizky@tiketmu.com', referralCode: 'RZKYPRT1' },
    { name: 'Nurul Aini', email: 'nurul@tiketmu.com', referralCode: 'NURLAINI1' },
    { name: 'Fajar Hidayat', email: 'fajar@tiketmu.com', referralCode: 'FJRHIDAY1' },
    { name: 'Putri Handayani', email: 'putri@tiketmu.com', referralCode: 'PTRHDAY1' },
    { name: 'Dian Saputra', email: 'dian@tiketmu.com', referralCode: 'DIANSPTR1' },
    { name: 'Eko Wahyudi', email: 'eko@tiketmu.com', referralCode: 'EKOWAHYD1' },
    { name: 'Fitri Anggraini', email: 'fitri@tiketmu.com', referralCode: 'FTRIANGG1' },
    { name: 'Galih Prayoga', email: 'galih@tiketmu.com', referralCode: 'GLHPRYG1' },
    { name: 'Hendra Kusuma', email: 'hendra@tiketmu.com', referralCode: 'HNDRKSMQ1' },
    { name: 'Indah Permata', email: 'indah@tiketmu.com', referralCode: 'INDAHPMT1' },
    { name: 'Joko Susilo', email: 'joko@tiketmu.com', referralCode: 'JOKOSUS1' },
    { name: 'Kartini Wulandari', email: 'kartini@tiketmu.com', referralCode: 'KRTIWLD1' },
    { name: 'Lukman Hakim', email: 'lukman@tiketmu.com', referralCode: 'LKMNHKM1' },
    { name: 'Maya Sari', email: 'maya@tiketmu.com', referralCode: 'MAYASRI1' },
    { name: 'Nanda Pratiwi', email: 'nanda@tiketmu.com', referralCode: 'NNDAPRTW1' },
    { name: 'Ogi Firmansyah', email: 'ogi@tiketmu.com', referralCode: 'OGIFRM1' },
    { name: 'Pita Suwanda', email: 'pita@tiketmu.com', referralCode: 'PITASWD1' },
    { name: 'Qori Amalia', email: 'qori@tiketmu.com', referralCode: 'QOIAMLA1' },
  ];

  const organizers = await Promise.all(
    organizerData.map(d =>
      prisma.user.create({
        data: { ...d, password: hashedPassword, role: Role.ORGANIZER }
      })
    )
  );

  const customers = await Promise.all(
    customerData.map(d =>
      prisma.user.create({
        data: { ...d, password: hashedPassword, role: Role.CUSTOMER }
      })
    )
  );

  // Tambah points dan coupon untuk beberapa customer (simulasi referral rewards)
  const threeMonthsLater = addMonths(new Date(), 3);
  for (let i = 0; i < 5; i++) {
    await prisma.point.create({
      data: {
        userId: organizers[i % organizers.length].id,
        amount: 10000,
        expiredAt: threeMonthsLater,
        sourceType: 'REFERRAL',
      }
    });
    await prisma.coupon.create({
      data: {
        userId: customers[i].id,
        code: `NEWUSER${i + 1}`,
        discount: 10,
        discountType: DiscountType.PERCENTAGE,
        expiredAt: threeMonthsLater,
      }
    });
  }

  console.log(`  ✓ Created ${organizers.length} organizers + ${customers.length} customers`);
  return { organizers, customers };
}

// ============================================================
// EVENTS (30 events)
// ============================================================
async function seedEvents(organizers: any[], categories: any[]) {
  const now = new Date();
  const eventData = [
    // UPCOMING EVENTS (akan datang)
    {
      name: 'React Summit Jakarta 2024',
      description: 'Konferensi React terbesar di Indonesia. Pelajari teknik terbaru React, TypeScript, dan ekosistemnya dari para expert.',
      location: 'Jakarta Convention Center, Jl. Gatot Subroto',
      city: 'Jakarta',
      startDate: addDays(now, 7),
      endDate: addDays(now, 7),
      totalSeats: 500,
      price: 350000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 0, // Teknologi
      organizerIdx: 0,
    },
    {
      name: 'Konser Dewa 19 Reunion',
      description: 'Nantikan penampilan spektakuler Dewa 19 dalam konser reuni yang sudah ditunggu-tunggu.',
      location: 'Gelora Bung Karno, Jakarta',
      city: 'Jakarta',
      startDate: addDays(now, 14),
      endDate: addDays(now, 14),
      totalSeats: 50000,
      price: 500000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 1, // Musik
      organizerIdx: 0,
    },
    {
      name: 'Marathon Surabaya 2024',
      description: 'Lari marathon 42km melintasi jantung kota Surabaya. Tersedia kategori full, half, dan 10K.',
      location: 'Balai Kota Surabaya',
      city: 'Surabaya',
      startDate: addDays(now, 21),
      endDate: addDays(now, 21),
      totalSeats: 3000,
      price: 200000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 2, // Olahraga
      organizerIdx: 1,
    },
    {
      name: 'Festival Kuliner Nusantara',
      description: 'Rayakan kekayaan kuliner Indonesia dalam satu tempat. 100+ stand makanan dari Sabang sampai Merauke.',
      location: 'Parkir Timur Senayan, Jakarta',
      city: 'Jakarta',
      startDate: addDays(now, 10),
      endDate: addDays(now, 12),
      totalSeats: 10000,
      price: 50000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 3, // Kuliner
      organizerIdx: 0,
    },
    {
      name: 'Pameran Seni Kontemporer Bandung',
      description: 'Pameran seni rupa kontemporer menampilkan karya 50 seniman muda Indonesia.',
      location: 'Gedung Sate, Bandung',
      city: 'Bandung',
      startDate: addDays(now, 5),
      endDate: addDays(now, 15),
      totalSeats: 2000,
      price: 75000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 4, // Seni & Budaya
      organizerIdx: 2,
    },
    {
      name: 'Startup Summit Bali 2024',
      description: 'Pertemuan tahunan ekosistem startup Indonesia di Bali. Networking, pitching, dan workshop bisnis.',
      location: 'Bali International Convention Centre',
      city: 'Bali',
      startDate: addDays(now, 30),
      endDate: addDays(now, 31),
      totalSeats: 1500,
      price: 1500000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 5, // Bisnis
      organizerIdx: 3,
    },
    {
      name: 'Workshop AI untuk Pemula',
      description: 'Pelajari dasar-dasar Artificial Intelligence dan Machine Learning dari nol. Cocok untuk pemula.',
      location: 'Coworking Space TechHub, Jakarta',
      city: 'Jakarta',
      startDate: addDays(now, 3),
      endDate: addDays(now, 3),
      totalSeats: 50,
      price: 150000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 6, // Pendidikan
      organizerIdx: 0,
    },
    {
      name: 'Seminar Kesehatan Mental 2024',
      description: 'Bicara terbuka tentang kesehatan mental bersama psikolog dan aktivis. GRATIS untuk umum.',
      location: 'Universitas Indonesia, Depok',
      city: 'Depok',
      startDate: addDays(now, 8),
      endDate: addDays(now, 8),
      totalSeats: 300,
      price: 0,
      isFree: true,
      status: EventStatus.ACTIVE,
      categoryIdx: 7, // Kesehatan
      organizerIdx: 4,
    },
    {
      name: 'Comedy Night Jakarta Vol. 5',
      description: 'Malam penuh tawa bersama stand-up comedian terbaik Indonesia.',
      location: 'Teater Kecil Taman Ismail Marzuki',
      city: 'Jakarta',
      startDate: addDays(now, 11),
      endDate: addDays(now, 11),
      totalSeats: 200,
      price: 125000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 8, // Hiburan
      organizerIdx: 0,
    },
    {
      name: 'Tree Planting Day Yogyakarta',
      description: 'Aksi penanaman 1000 pohon di lereng Merapi. Daftarkan diri dan selamatkan lingkungan!',
      location: 'Lereng Gunung Merapi, Yogyakarta',
      city: 'Yogyakarta',
      startDate: addDays(now, 25),
      endDate: addDays(now, 25),
      totalSeats: 500,
      price: 0,
      isFree: true,
      status: EventStatus.ACTIVE,
      categoryIdx: 9, // Lingkungan
      organizerIdx: 4,
    },
    {
      name: 'Next.js Workshop Advanced',
      description: 'Deep dive ke Next.js 14 App Router, Server Components, dan deployment strategies.',
      location: 'Digital Hub, BSD City',
      city: 'Tangerang',
      startDate: addDays(now, 6),
      endDate: addDays(now, 6),
      totalSeats: 40,
      price: 200000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 0,
      organizerIdx: 0,
    },
    {
      name: 'Jazz di Tepi Laut Makassar',
      description: 'Festival jazz tahunan dengan latar pemandangan laut Makassar yang indah.',
      location: 'Pantai Losari, Makassar',
      city: 'Makassar',
      startDate: addDays(now, 18),
      endDate: addDays(now, 19),
      totalSeats: 5000,
      price: 100000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 1,
      organizerIdx: 6,
    },
    {
      name: 'Hackathon Nasional 2024',
      description: '48 jam mengkode solusi untuk masalah nyata Indonesia. Hadiah total Rp 100 juta!',
      location: 'ICE BSD, Tangerang',
      city: 'Tangerang',
      startDate: addDays(now, 20),
      endDate: addDays(now, 22),
      totalSeats: 1000,
      price: 50000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 0,
      organizerIdx: 1,
    },
    {
      name: 'Yoga & Meditation Retreat Bali',
      description: '3 hari retreat yoga dan meditasi di villa mewah Ubud, Bali.',
      location: 'Villa Nirwana, Ubud, Bali',
      city: 'Bali',
      startDate: addDays(now, 35),
      endDate: addDays(now, 37),
      totalSeats: 30,
      price: 3500000,
      isFree: false,
      status: EventStatus.ACTIVE,
      categoryIdx: 7,
      organizerIdx: 3,
    },
    {
      name: 'Business Plan Competition 2024',
      description: 'Kompetisi business plan untuk mahasiswa se-Indonesia. Presentasikan ide bisnis terbaik Anda!',
      location: 'Universitas Gadjah Mada, Yogyakarta',
      city: 'Yogyakarta',
      startDate: addDays(now, 45),
      endDate: addDays(now, 46),
      totalSeats: 200,
      price: 0,
      isFree: true,
      status: EventStatus.ACTIVE,
      categoryIdx: 5,
      organizerIdx: 4,
    },
    // PAST EVENTS (sudah berlalu) - untuk seed reviews dan completed transactions
    {
      name: 'Python for Data Science Workshop',
      description: 'Belajar Python untuk analisis data dan visualisasi. Sertifikat diberikan.',
      location: 'Coworking Space, Bandung',
      city: 'Bandung',
      startDate: subDays(now, 30),
      endDate: subDays(now, 30),
      totalSeats: 60,
      price: 175000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 6,
      organizerIdx: 2,
    },
    {
      name: 'Pop Music Festival Surabaya',
      description: 'Festival musik pop dengan 10 artis Indonesia terpopuler.',
      location: 'Stadion Gelora Bung Tomo, Surabaya',
      city: 'Surabaya',
      startDate: subDays(now, 15),
      endDate: subDays(now, 15),
      totalSeats: 20000,
      price: 300000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 1,
      organizerIdx: 1,
    },
    {
      name: 'Food Photography Workshop',
      description: 'Pelajari teknik foto makanan profesional menggunakan smartphone.',
      location: 'Studio Foto Kreatif, Jakarta',
      city: 'Jakarta',
      startDate: subDays(now, 10),
      endDate: subDays(now, 10),
      totalSeats: 25,
      price: 300000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 3,
      organizerIdx: 0,
    },
    {
      name: 'Digital Marketing Masterclass',
      description: 'Kuasai strategi digital marketing modern: SEO, Social Media, dan Paid Ads.',
      location: 'Hotel Mulia, Jakarta',
      city: 'Jakarta',
      startDate: subDays(now, 20),
      endDate: subDays(now, 20),
      totalSeats: 100,
      price: 500000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 5,
      organizerIdx: 0,
    },
    {
      name: 'Bali Cultural Dance Show',
      description: 'Pertunjukan tari tradisional Bali oleh seniman terbaik dari Gianyar.',
      location: 'Pura Tanah Lot, Bali',
      city: 'Bali',
      startDate: subDays(now, 7),
      endDate: subDays(now, 7),
      totalSeats: 500,
      price: 150000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 4,
      organizerIdx: 3,
    },
    {
      name: 'UI/UX Design Sprint',
      description: '2 hari design sprint intensif dengan metode Google Design Sprint.',
      location: 'Coworking Space, Bandung',
      city: 'Bandung',
      startDate: subDays(now, 25),
      endDate: subDays(now, 24),
      totalSeats: 20,
      price: 800000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 0,
      organizerIdx: 2,
    },
    {
      name: 'Community Clean Up Medan',
      description: 'Gotong royong bersihkan pantai dan sungai di Medan. GRATIS!',
      location: 'Pantai Cermin, Medan',
      city: 'Medan',
      startDate: subDays(now, 5),
      endDate: subDays(now, 5),
      totalSeats: 1000,
      price: 0,
      isFree: true,
      status: EventStatus.COMPLETED,
      categoryIdx: 9,
      organizerIdx: 5,
    },
    {
      name: 'TalkShow Entrepreneur Muda',
      description: 'Kisah inspiratif 5 entrepreneur sukses usia di bawah 30 tahun.',
      location: 'Universitas Diponegoro, Semarang',
      city: 'Semarang',
      startDate: subDays(now, 12),
      endDate: subDays(now, 12),
      totalSeats: 500,
      price: 0,
      isFree: true,
      status: EventStatus.COMPLETED,
      categoryIdx: 5,
      organizerIdx: 7,
    },
    {
      name: 'Futsal Tournament Open 2024',
      description: 'Turnamen futsal antar komunitas se-Jakarta. Daftar tim sekarang!',
      location: 'Lapangan Futsal GBK, Jakarta',
      city: 'Jakarta',
      startDate: subDays(now, 3),
      endDate: subDays(now, 1),
      totalSeats: 320,
      price: 500000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 2,
      organizerIdx: 0,
    },
    {
      name: 'Batik Workshop & Exhibition',
      description: 'Belajar membuat batik tulis dari pengrajin senior Yogyakarta.',
      location: 'Keraton Yogyakarta',
      city: 'Yogyakarta',
      startDate: subDays(now, 40),
      endDate: subDays(now, 39),
      totalSeats: 50,
      price: 250000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 4,
      organizerIdx: 4,
    },
    {
      name: 'Health & Wellness Expo',
      description: 'Pameran produk dan layanan kesehatan. 50+ exhibitor, seminar gratis setiap jam.',
      location: 'Grand City Mall, Surabaya',
      city: 'Surabaya',
      startDate: subDays(now, 50),
      endDate: subDays(now, 48),
      totalSeats: 5000,
      price: 0,
      isFree: true,
      status: EventStatus.COMPLETED,
      categoryIdx: 7,
      organizerIdx: 1,
    },
    {
      name: 'K-Pop Dance Cover Competition',
      description: 'Kompetisi dance cover K-Pop terbesar di Indonesia. Ikut dan menangkan hadiah jutaan rupiah!',
      location: 'Mall of Indonesia, Jakarta',
      city: 'Jakarta',
      startDate: subDays(now, 60),
      endDate: subDays(now, 60),
      totalSeats: 1000,
      price: 100000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 8,
      organizerIdx: 0,
    },
    {
      name: 'Seminar Investasi Saham untuk Pemula',
      description: 'Pelajari dasar-dasar investasi saham, reksa dana, dan instrumen keuangan lainnya.',
      location: 'Hotel Borobudur, Jakarta',
      city: 'Jakarta',
      startDate: subDays(now, 35),
      endDate: subDays(now, 35),
      totalSeats: 200,
      price: 100000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 5,
      organizerIdx: 0,
    },
    {
      name: 'Mountain Trail Run Bandung',
      description: 'Trail running 15km dan 30km di pegunungan Bandung Selatan.',
      location: 'Kawasan Wisata Ciwidey, Bandung',
      city: 'Bandung',
      startDate: subDays(now, 45),
      endDate: subDays(now, 45),
      totalSeats: 500,
      price: 175000,
      isFree: false,
      status: EventStatus.COMPLETED,
      categoryIdx: 2,
      organizerIdx: 2,
    },
  ];

  const events = await Promise.all(
    eventData.map(async (d) => {
      const { categoryIdx, organizerIdx, ...rest } = d;
      const event = await prisma.event.create({
        data: {
          ...rest,
          availableSeats: rest.totalSeats,
          organizerId: organizers[organizerIdx].id,
          categoryId: categories[categoryIdx].id,
        }
      });

      // Buat ticket types untuk setiap event
      if (!rest.isFree) {
        await prisma.ticketType.createMany({
          data: [
            {
              eventId: event.id,
              name: 'Regular',
              price: rest.price,
              totalSeats: Math.floor(rest.totalSeats * 0.7),
              availableSeats: Math.floor(rest.totalSeats * 0.7),
            },
            {
              eventId: event.id,
              name: 'VIP',
              price: rest.price * 2,
              totalSeats: Math.floor(rest.totalSeats * 0.3),
              availableSeats: Math.floor(rest.totalSeats * 0.3),
              description: 'Akses prioritas, merchandise eksklusif, meet & greet',
            }
          ]
        });
      } else {
        await prisma.ticketType.create({
          data: {
            eventId: event.id,
            name: 'Free Entry',
            price: 0,
            totalSeats: rest.totalSeats,
            availableSeats: rest.totalSeats,
          }
        });
      }

      return event;
    })
  );

  console.log(`  ✓ Created ${events.length} events with ticket types`);
  return events;
}

// ============================================================
// VOUCHERS (untuk beberapa event)
// ============================================================
async function seedVouchers(events: any[], organizers: any[]) {
  const now = new Date();
  const vouchersData = [
    { eventIdx: 0, code: 'REACT10', discount: 10, type: DiscountType.PERCENTAGE, maxUsage: 100 },
    { eventIdx: 0, code: 'EARLYBIRD', discount: 50000, type: DiscountType.FIXED, maxUsage: 50 },
    { eventIdx: 1, code: 'DEWA50K', discount: 50000, type: DiscountType.FIXED, maxUsage: 200 },
    { eventIdx: 2, code: 'RUN15', discount: 15, type: DiscountType.PERCENTAGE, maxUsage: 150 },
    { eventIdx: 3, code: 'KULINER20', discount: 20, type: DiscountType.PERCENTAGE, maxUsage: 500 },
    { eventIdx: 5, code: 'STARTUP100K', discount: 100000, type: DiscountType.FIXED, maxUsage: 30 },
    { eventIdx: 8, code: 'COMEDY25K', discount: 25000, type: DiscountType.FIXED, maxUsage: 50 },
    { eventIdx: 11, code: 'JAZZ10', discount: 10, type: DiscountType.PERCENTAGE, maxUsage: 200 },
    { eventIdx: 12, code: 'HACK50K', discount: 50000, type: DiscountType.FIXED, maxUsage: 100 },
  ];

  await Promise.all(
    vouchersData.map(v =>
      prisma.voucher.create({
        data: {
          eventId: events[v.eventIdx].id,
          code: v.code,
          discount: v.discount,
          discountType: v.type,
          maxUsage: v.maxUsage,
          startDate: subDays(now, 7),
          endDate: addDays(now, 30),
        }
      })
    )
  );

  console.log(`  ✓ Created ${vouchersData.length} vouchers`);
}

// ============================================================
// TRANSACTIONS (30 transaksi dengan berbagai status)
// ============================================================
async function seedTransactions(customers: any[], events: any[]) {
  const now = new Date();
  const completedEvents = events.filter(e => e.status === EventStatus.COMPLETED);
  const activeEvents = events.filter(e => e.status === EventStatus.ACTIVE);

  const transactionData = [
    // DONE transactions (10) - untuk completed events
    ...Array.from({ length: 10 }, (_, i) => ({
      userId: customers[i % customers.length].id,
      eventId: completedEvents[i % completedEvents.length].id,
      status: TransactionStatus.DONE,
      daysAgo: 15 + i,
    })),
    // WAITING_PAYMENT (5)
    ...Array.from({ length: 5 }, (_, i) => ({
      userId: customers[(i + 10) % customers.length].id,
      eventId: activeEvents[i % activeEvents.length].id,
      status: TransactionStatus.WAITING_PAYMENT,
      daysAgo: 0,
    })),
    // WAITING_CONFIRMATION (5)
    ...Array.from({ length: 5 }, (_, i) => ({
      userId: customers[(i + 5) % customers.length].id,
      eventId: activeEvents[(i + 2) % activeEvents.length].id,
      status: TransactionStatus.WAITING_CONFIRMATION,
      daysAgo: 0,
    })),
    // REJECTED (4)
    ...Array.from({ length: 4 }, (_, i) => ({
      userId: customers[(i + 3) % customers.length].id,
      eventId: completedEvents[(i + 5) % completedEvents.length].id,
      status: TransactionStatus.REJECTED,
      daysAgo: 10 + i,
    })),
    // EXPIRED (3)
    ...Array.from({ length: 3 }, (_, i) => ({
      userId: customers[(i + 7) % customers.length].id,
      eventId: completedEvents[(i + 8) % completedEvents.length].id,
      status: TransactionStatus.EXPIRED,
      daysAgo: 5 + i,
    })),
    // CANCELED (3)
    ...Array.from({ length: 3 }, (_, i) => ({
      userId: customers[(i + 15) % customers.length].id,
      eventId: completedEvents[(i + 10) % completedEvents.length].id,
      status: TransactionStatus.CANCELED,
      daysAgo: 8 + i,
    })),
  ];

  for (const t of transactionData) {
    const event = events.find(e => e.id === t.eventId);
    if (!event) continue;

    const ticketType = await prisma.ticketType.findFirst({
      where: { eventId: event.id, name: 'Regular' }
    });
    if (!ticketType) continue;

    const quantity = Math.floor(Math.random() * 2) + 1;
    const totalAmount = ticketType.price * quantity;
    const finalAmount = totalAmount;
    // WAITING_PAYMENT harus masih dalam batas bayar (agar bisa didemokan & tidak langsung di-expire cron)
    const isWaitingPayment = t.status === TransactionStatus.WAITING_PAYMENT;
    const createdAt = isWaitingPayment
      ? new Date(now.getTime() - (10 + (t.daysAgo % 5) * 10) * 60 * 1000)
      : subDays(now, t.daysAgo);

    const transaction = await prisma.transaction.create({
      data: {
        userId: t.userId,
        eventId: t.eventId,
        status: t.status,
        totalAmount,
        finalAmount,
        quantity,
        pointsUsed: 0,
        voucherDiscount: 0,
        couponDiscount: 0,
        paymentDeadline: addHours(createdAt, 2),
        confirmDeadline: t.status === TransactionStatus.WAITING_CONFIRMATION
          ? addDays(createdAt, 3)
          : t.status === TransactionStatus.DONE || t.status === TransactionStatus.REJECTED
          ? addDays(createdAt, 3)
          : null,
        createdAt,
        updatedAt: createdAt,
      }
    });

    // Transaksi yang menahan kursi harus mengurangi sisa kursi, sama seperti createTransaction.
    // Tanpa ini, rollback (expire/cancel/reject) akan membuat availableSeats > totalSeats.
    const holdsSeats: TransactionStatus[] = [
      TransactionStatus.WAITING_PAYMENT,
      TransactionStatus.WAITING_CONFIRMATION,
      TransactionStatus.DONE,
    ];
    if (holdsSeats.includes(t.status)) {
      await prisma.event.update({
        where: { id: event.id },
        data: { availableSeats: { decrement: quantity } },
      });
      await prisma.ticketType.update({
        where: { id: ticketType.id },
        data: { availableSeats: { decrement: quantity } },
      });
    }

    await prisma.transactionDetail.create({
      data: {
        transactionId: transaction.id,
        ticketTypeId: ticketType.id,
        quantity,
        price: ticketType.price,
        subtotal: totalAmount,
      }
    });

    // Tambah payment proof untuk yang sudah melewati WAITING_PAYMENT
    const statusesWithProof: TransactionStatus[] = [
      TransactionStatus.DONE,
      TransactionStatus.WAITING_CONFIRMATION,
      TransactionStatus.REJECTED,
      TransactionStatus.CANCELED,
    ];
    if (statusesWithProof.includes(t.status)) {
      await prisma.paymentProof.create({
        data: {
          transactionId: transaction.id,
          imageUrl: `https://picsum.photos/seed/${transaction.id}/800/600`,
          uploadedAt: addHours(createdAt, 1),
        }
      });
    }
  }

  console.log(`  ✓ Created ${transactionData.length} transactions`);
}

// ============================================================
// REVIEWS (untuk completed events)
// ============================================================
async function seedReviews(customers: any[], events: any[]) {
  const completedEvents = events.filter(e => e.status === EventStatus.COMPLETED);
  const comments = [
    'Event yang sangat bagus! Sangat informatif dan menyenangkan.',
    'Pembicara keren, materi sangat relevan. Pasti balik lagi!',
    'Organizernya profesional, venue nyaman, recommended!',
    'Seru banget, networking-nya mantap. Worth the price!',
    'Panitia ramah, acara berjalan lancar. Terima kasih!',
    'Konten berkualitas, banyak hal baru yang saya pelajari.',
    'Venue strategis, parkir mudah, acara on time. 5 bintang!',
    'Sangat memuaskan! Akan merekomendasikan ke teman-teman.',
    'Acara yang well-organized. MC-nya juga keren!',
    'Melebihi ekspektasi. Sudah tidak sabar untuk event berikutnya!',
  ];

  const reviewData: any[] = [];
  completedEvents.forEach((event, eventIdx) => {
    const numReviews = Math.min(3, customers.length);
    for (let i = 0; i < numReviews; i++) {
      const customerIdx = (eventIdx * 3 + i) % customers.length;
      reviewData.push({
        userId: customers[customerIdx].id,
        eventId: event.id,
        rating: Math.floor(Math.random() * 2) + 4, // rating 4 atau 5
        comment: comments[(eventIdx + i) % comments.length],
      });
    }
  });

  // Deduplicate (1 user 1 review per event)
  const unique = new Map<string, any>();
  reviewData.forEach(r => {
    const key = `${r.userId}-${r.eventId}`;
    if (!unique.has(key)) unique.set(key, r);
  });

  await Promise.all(
    Array.from(unique.values()).map(r =>
      prisma.review.create({ data: r })
    )
  );

  console.log(`  ✓ Created ${unique.size} reviews`);
}

// ============================================================
// RUN
// ============================================================
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
