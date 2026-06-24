import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { User, Item, Wishlist, Coupon, CartItem, Order, OrderItem, Review, Address, Notification } from '../models/index.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("Dropping existing collections...");
    await User.deleteMany();
    await Item.deleteMany();
    await Wishlist.deleteMany();
    await Coupon.deleteMany();
    await CartItem.deleteMany();
    await Order.deleteMany();
    await OrderItem.deleteMany();
    await Review.deleteMany();
    await Address.deleteMany();
    await Notification.deleteMany();

    console.log("Creating default Users...");
    
    
    const seller = new User({
      username: 'seller1',
      email_address: 'seller1@luckycart.com',
      password_hash: 'password123', 
      budget: 15000.00,
      role: 'seller',
      full_name: 'John Seller',
      phone_number: '9876543210',
      address: '123 Seller Lane',
      city: 'Mumbai',
      state: 'Maharashtra',
      zip_code: '400001'
    });
    await seller.save();

    
    const consumer = new User({
      username: 'consumer1',
      email_address: 'consumer1@luckycart.com',
      password_hash: 'password123', 
      budget: 10000.00,
      role: 'consumer',
      full_name: 'Alice Consumer',
      phone_number: '9876543222',
      address: '456 Buyer Boulevard',
      city: 'Bangalore',
      state: 'Karnataka',
      zip_code: '560001'
    });
    await consumer.save();

    
    await new Wishlist({ user: seller._id }).save();
    await new Wishlist({ user: consumer._id }).save();

    console.log("Seeding default Addresses...");
    const consumerAddress = new Address({
      user: consumer._id,
      full_name: 'Alice Consumer',
      phone_number: '9876543222',
      address_line: 'Flat 402, Green Towers, Outer Ring Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zip_code: '560103',
      is_default: true
    });
    await consumerAddress.save();

    console.log("Seeding Items...");
    const items = [
      {
        name: 'Phone',
        barcode: '893212299897',
        price: 500,
        description: 'A high-quality smartphone with dual camera, long-lasting battery, and vivid display.',
        user_file: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=600',
        seller: seller._id,
        stock: 10,
        category: 'Electronics'
      },
      {
        name: 'Laptop',
        barcode: '123985473165',
        price: 900,
        description: 'A powerful laptop for work and productivity, featuring 16GB RAM and a fast SSD.',
        user_file: 'https://images.unsplash.com/photo-1496181130204-7552cc15f10a?auto=format&fit=crop&q=80&w=600',
        seller: seller._id,
        stock: 5,
        category: 'Electronics'
      },
      {
        name: 'Keyboard',
        barcode: '231985128446',
        price: 150,
        description: 'A tactile mechanical keyboard with RGB backlighting and premium switches.',
        user_file: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=600',
        seller: seller._id,
        stock: 15,
        category: 'Electronics'
      }
    ];

    for (const itemData of items) {
      await new Item(itemData).save();
    }

    console.log("Seeding Coupons...");
    await new Coupon({ code: 'LUCKY20', discount_percent: 20, is_active: true }).save();
    await new Coupon({ code: 'SAVE10', discount_percent: 10, is_active: true }).save();

    console.log("Database seeded successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding database: ", error);
    process.exit(1);
  }
};

seedDatabase();
