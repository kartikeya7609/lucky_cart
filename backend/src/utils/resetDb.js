/**
 * ─────────────────────────────────────────────────────────────────
 *  Lucky Cart — Database Reset Script
 *  Run: node src/utils/resetDb.js
 *
 *  What it wipes (every collection except Users):
 *    Items, CartItems, Orders, OrderItems,
 *    Wishlists, WishlistItems, Addresses,
 *    Coupons, Notifications, ViewedItems, Reviews
 *
 *  Users are KEPT by default.
 *  Pass --users flag to also wipe all user accounts:
 *    node src/utils/resetDb.js --users
 * ─────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import {
  User, Item, CartItem, Order, OrderItem,
  Wishlist, WishlistItem, Address,
  Coupon, Notification, ViewedItem, Review
} from '../models/index.js';

dotenv.config();

const ALSO_WIPE_USERS = process.argv.includes('--users');

const RESET_TARGETS = [
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

if (ALSO_WIPE_USERS) {
  RESET_TARGETS.push({ name: 'Users', model: User });
}

const LINE = '─'.repeat(52);

async function resetDatabase() {
  console.log(`\n${LINE}`);
  console.log('  Lucky Cart — Database Reset');
  console.log(LINE);

  await connectDB();

  if (ALSO_WIPE_USERS) {
    console.log('\n  ⚠️  --users flag detected: ALL users will be deleted.\n');
  } else {
    console.log('\n  ℹ️  Users are preserved. Use --users to also wipe them.\n');
  }

  let totalDeleted = 0;

  for (const { name, model } of RESET_TARGETS) {
    try {
      const result = await model.deleteMany({});
      const count = result.deletedCount;
      totalDeleted += count;
      const icon = count > 0 ? '🗑️ ' : '✅';
      console.log(`  ${icon}  ${name.padEnd(16)} — ${count} document${count !== 1 ? 's' : ''} deleted`);
    } catch (err) {
      console.error(`  ❌  ${name.padEnd(16)} — ERROR: ${err.message}`);
    }
  }

  console.log(`\n${LINE}`);
  console.log(`  ✅  Reset complete. ${totalDeleted} total documents removed.`);
  console.log(LINE);

  await mongoose.connection.close();
  console.log('  🔌  MongoDB connection closed.\n');
  process.exit(0);
}

resetDatabase().catch((err) => {
  console.error('\n  ❌  Fatal error during reset:', err.message);
  process.exit(1);
});
