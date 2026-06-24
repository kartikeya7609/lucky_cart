

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import {
  User, Item, CartItem, Order, OrderItem,
  Wishlist, WishlistItem, Address,
  Coupon, Notification, ViewedItem, Review
} from '../models/index.js';

dotenv.config();

const RESET_TARGETS = [
  { name: 'Users',        model: User },
  { name: 'CartItems',    model: CartItem },
  { name: 'OrderItems',   model: OrderItem },
  { name: 'Orders',       model: Order },
  { name: 'Reviews',      model: Review },
  { name: 'Notifications',model: Notification },
  { name: 'ViewedItems',  model: ViewedItem },
  { name: 'WishlistItems',model: WishlistItem },
  { name: 'Wishlists',    model: Wishlist },
  { name: 'Addresses',    model: Address },
  { name: 'Coupons',      model: Coupon },
  { name: 'Items',        model: Item },
];

const LINE = '─'.repeat(52);

async function hardResetDatabase() {
  console.log(`\n${LINE}`);
  console.log('  ⚠️  Lucky Cart — TOTAL Database Reset  ⚠️');
  console.log(LINE);

  await connectDB();

  console.log('\n  💥  Wiping EVERYTHING including all user accounts...\n');

  let totalDeleted = 0;

  for (const { name, model } of RESET_TARGETS) {
    try {
      const result = await model.deleteMany();
      const count = result.deletedCount;
      totalDeleted += count;
      const icon = count > 0 ? '🔥' : '✅';
      console.log(`  ${icon}  ${name.padEnd(16)} — ${count} document${count !== 1 ? 's' : ''} deleted`);
    } catch (err) {
      console.error(`  ❌  ${name.padEnd(16)} — ERROR: ${err.message}`);
    }
  }

  console.log(`\n${LINE}`);
  console.log(`  ✅  Hard reset complete. ${totalDeleted} total documents removed.`);
  console.log(LINE);

  await mongoose.connection.close();
  console.log('  🔌  MongoDB connection closed.\n');
  process.exit(0);
}

hardResetDatabase().catch((err) => {
  console.error('\n  ❌  Fatal error during hard reset:', err.message);
  process.exit(1);
});
