require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User     = require('./models/User');
const Category = require('./models/Category');
const Product  = require('./models/Product');
const Coupon   = require('./models/Coupon');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing
  await Promise.all([User.deleteMany(), Category.deleteMany(), Product.deleteMany(), Coupon.deleteMany()]);
  console.log('🗑️  Cleared existing data');

  // Admin user
  const admin = await User.create({
    fullname: 'PASAM Admin',
    email:    process.env.ADMIN_EMAIL || 'admin@pasamstore.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    role:     'admin',
    isVerified: true,
  });
  console.log(`👤 Admin created: ${admin.email}`);

  // Demo customer
  await User.create({
    fullname:   'Test Customer',
    email:      'customer@test.com',
    password:   'Test@123456',
    role:       'customer',
    isVerified: true,
    phone:      '08012345678',
  });
  console.log('👤 Demo customer created: customer@test.com');

  // Categories
  const cats = await Category.insertMany([
    { name:'Student Packages', slug:'student-packages', description:'Budget-friendly food packs for students',          icon:'🎓', color:'#22c55e', sortOrder:1 },
    { name:'Singles Package',  slug:'singles-packages', description:'Perfect for bachelors, workers & small homes',     icon:'🏠', color:'#f97316', sortOrder:2 },
    { name:'Family Package',   slug:'family-packages',  description:'Monthly food supply for medium households',        icon:'👨‍👩‍👧‍👦', color:'#eab308', sortOrder:3 },
    { name:'Premium Package',  slug:'premium-packages', description:'Bulk packages for churches, NGOs & organizations', icon:'⭐', color:'#8b5cf6', sortOrder:4, isBulkOnly:false },
  ]);
  console.log(`📂 ${cats.length} categories created`);

  const [student, singles, family, premium] = cats;

  // Products
  const products = await Product.insertMany([
    // Student
    { name:'Basic Student Pack',    slug:'basic-student-pack',    description:'Ideal weekly food pack for a student on a budget.',    shortDescription:'Weekly essentials for one student.', category:student._id, price:5500,  originalPrice:7000,  stock:50, isFeatured:true,  targetAudience:'student', weight:'~5kg',  contents:['1kg Rice','1kg Beans','1kg Garri','Seasoning cubes','Salt','1 Tin tomatoes'], tags:['student','budget','weekly'] },
    { name:'Standard Student Pack', slug:'standard-student-pack', description:'A fuller pack with more variety for the active student.', shortDescription:'More variety for the active student.', category:student._id, price:8500,  originalPrice:10000, stock:40, isFeatured:true,  targetAudience:'student', weight:'~8kg',  contents:['2kg Rice','1kg Beans','500g Semovita','1L Palm oil','Seasoning','2 Tins tomatoes','Onions'], tags:['student','standard','weekly'] },
    { name:'Advanced Student Pack', slug:'advanced-student-pack', description:'Premium student pack with all you need for two weeks.', shortDescription:'Premium 2-week student pack.',          category:student._id, price:13000, originalPrice:16000, stock:30, isFeatured:false, targetAudience:'student', weight:'~12kg', contents:['3kg Rice','2kg Beans','1kg Garri','1.5L Palm oil','Seasoning','3 Tins tomatoes','Spaghetti','Noodles'], tags:['student','premium','biweekly'] },
    // Singles
    { name:'Bachelor Pack',       slug:'bachelor-pack',       description:'A compact monthly pack for single working-class individuals.', shortDescription:'Perfect for singles & bachelors.',    category:singles._id, price:12000, originalPrice:15000, stock:45, isFeatured:true,  targetAudience:'singles', weight:'~10kg', contents:['2kg Rice','1.5kg Beans','Spaghetti','1L Palm oil','Seasoning cubes','2 Tins tomatoes','Onions','Pepper'], tags:['singles','bachelor','monthly'] },
    { name:'Workers Delight Pack', slug:'workers-delight-pack', description:'Designed for busy professionals who want convenience.',        shortDescription:'For busy working professionals.',     category:singles._id, price:16500, originalPrice:20000, stock:35, isFeatured:true,  targetAudience:'singles', weight:'~15kg', contents:['3kg Rice','2kg Beans','500g Semovita','1.5L Palm oil','Seasoning','Sardines','Spaghetti','Noodles x5','Tomatoes'], tags:['singles','workers','monthly'] },
    { name:'Small Home Pack',     slug:'small-home-pack',      description:'Feeds a small home of 2-3 people comfortably for a month.',    shortDescription:'For small homes of 2-3 people.',     category:singles._id, price:22000, originalPrice:27000, stock:25, isFeatured:false, targetAudience:'singles', weight:'~20kg', contents:['5kg Rice','3kg Beans','1kg Garri','2L Palm oil','Seasoning','Vegetable oil 1L','4 Tins tomatoes','Onions','Pepper'], tags:['small-home','monthly'] },
    // Family
    { name:'Medium Family Pack', slug:'medium-family-pack', description:'Feeds a family of 4-5 for a month. Great value.',           shortDescription:'Monthly supply for a family of 4-5.',  category:family._id,  price:35000, originalPrice:42000, stock:20, isFeatured:true,  targetAudience:'family',  weight:'~35kg', contents:['10kg Rice','5kg Beans','2kg Garri','2kg Semovita','3L Palm oil','Vegetable oil 2L','Seasoning x2','6 Tins tomatoes','Onions','Pepper x2'], tags:['family','monthly','medium'] },
    { name:'Large Family Pack',  slug:'large-family-pack',  description:'Full monthly supply for a large family of 6-8 people.',    shortDescription:'Full month supply for 6-8 people.',    category:family._id,  price:58000, originalPrice:70000, stock:15, isFeatured:true,  targetAudience:'family',  weight:'~60kg', contents:['20kg Rice','10kg Beans','5kg Garri','3kg Semovita','5L Palm oil','3L Vegetable oil','Seasoning x3','10 Tins tomatoes','Onions x3','Pepper x3','Spaghetti x2'], tags:['family','monthly','large'] },
    // Premium
    { name:'Church Welfare Pack (50 bags)',  slug:'church-welfare-pack',  description:'Pre-packed welfare bags for church distributions. Each bag feeds one person for a week.', shortDescription:'50 welfare bags for church distributions.', category:premium._id, price:120000, stock:10, isFeatured:true,  targetAudience:'premium', weight:'~100kg', contents:['50x 1kg Rice','50x 500g Beans','50x Seasoning sachet','50x 250ml Palm oil'], tags:['church','welfare','bulk'] },
    { name:'NGO Food Distribution Pack',    slug:'ngo-food-pack',         description:'Large-scale food packs for NGO distributions and community welfare programs.',          shortDescription:'For NGO & community welfare programs.',    category:premium._id, price:250000, stock:5,  isFeatured:false, targetAudience:'premium', weight:'~250kg', contents:['100kg Rice','50kg Beans','30L Palm oil','Seasoning x5','Other staples'], tags:['ngo','welfare','bulk'] },
  ]);
  console.log(`📦 ${products.length} products created`);

  // Coupons
  await Coupon.insertMany([
    { code:'WELCOME10', type:'percentage', value:10, minOrderAmount:5000,  maxDiscount:2000, usageLimit:100, isActive:true },
    { code:'STUDENT5',  type:'percentage', value:5,  minOrderAmount:4000,  maxDiscount:1000, usageLimit:200, isActive:true },
    { code:'SAVE500',   type:'fixed',      value:500, minOrderAmount:10000, usageLimit:50,   isActive:true  },
  ]);
  console.log('🏷️  3 coupons created');

  console.log('\n✅ Database seeded successfully!');
  console.log('─────────────────────────────────');
  console.log('🔑 Admin login:    admin@pasamstore.com / Admin@123456');
  console.log('👤 Customer login: customer@test.com / Test@123456');
  console.log('🏷️  Coupons: WELCOME10 | STUDENT5 | SAVE500');
  console.log('─────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
