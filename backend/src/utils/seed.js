import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { 
  User, Item, Wishlist, Coupon, CartItem, Order, 
  OrderItem, Review, Address, Notification, 
  Follow, Group, ProductInteraction, Message 
} from '../models/index.js';
import { computePageRank } from './socialGraph.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("Dropping existing collections...");
    await User.deleteMany({});
    await Item.deleteMany({});
    await Wishlist.deleteMany({});
    await Coupon.deleteMany({});
    await CartItem.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    await Review.deleteMany({});
    await Address.deleteMany({});
    await Notification.deleteMany({});
    await Follow.deleteMany({});
    await Group.deleteMany({});
    await ProductInteraction.deleteMany({});
    await Message.deleteMany({});

    console.log("Creating default Users...");
    
    // Create main Seller
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
      zip_code: '400001',
      interests: ['Electronics']
    });
    await seller.save();

    // Create main Consumer
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
      zip_code: '560001',
      interests: ['Electronics', 'Home']
    });
    await consumer.save();

    // Create Friend users to form a graph
    const friends = [];
    const friendData = [
      { u: 'friend1', name: 'Bob Smith', interests: ['Electronics'] },
      { u: 'friend2', name: 'Charlie Brown', interests: ['Electronics', 'Home'] },
      { u: 'friend3', name: 'Diana Prince', interests: ['Fashion'] },
      { u: 'friend4', name: 'Evan Wright', interests: ['Fitness'] },
      { u: 'friend5', name: 'Fiona Gallagher', interests: ['Books'] }
    ];

    for (const f of friendData) {
      const u = new User({
        username: f.u,
        email_address: `${f.u}@luckycart.com`,
        password_hash: 'password123',
        budget: 5000.00,
        role: 'consumer',
        full_name: f.name,
        phone_number: '9876543000',
        address: '789 Link St',
        city: 'Delhi',
        state: 'Delhi',
        zip_code: '110001',
        interests: f.interests
      });
      await u.save();
      friends.push(u);
    }

    // Create Wishlists
    await new Wishlist({ user: seller._id }).save();
    await new Wishlist({ user: consumer._id }).save();
    for (const f of friends) {
      await new Wishlist({ user: f._id }).save();
    }

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

    const seededItems = [];
    for (const itemData of items) {
      const item = new Item(itemData);
      await item.save();
      seededItems.push(item);
    }

    console.log("Seeding Coupons...");
    await new Coupon({ code: 'LUCKY20', discount_percent: 20, is_active: true }).save();
    await new Coupon({ code: 'SAVE10', discount_percent: 10, is_active: true }).save();

    console.log("Seeding Follow relationships...");
    // consumer1 (Alice) -> friend1 (Bob) -> friend2 (Charlie) -> friend3 (Diana) -> seller1
    const follows = [
      { follower: consumer._id, following: friends[0]._id, status: 'accepted' }, // Alice -> Bob
      { follower: friends[0]._id, following: consumer._id, status: 'accepted' }, // Bob -> Alice
      { follower: friends[0]._id, following: friends[1]._id, status: 'accepted' }, // Bob -> Charlie
      { follower: friends[1]._id, following: friends[0]._id, status: 'accepted' }, // Charlie -> Bob
      { follower: friends[1]._id, following: friends[2]._id, status: 'accepted' }, // Charlie -> Diana
      { follower: friends[2]._id, following: seller._id, status: 'accepted' },      // Diana -> Seller
      { follower: friends[4]._id, following: consumer._id, status: 'accepted' }   // Fiona -> Alice
    ];

    for (const f of follows) {
      await new Follow(f).save();
    }

    console.log("Seeding Shopping Groups...");
    const group1 = new Group({
      name: 'Tech Enthusiasts',
      description: 'A group to discuss and share the best gadget deals!',
      creator: friends[0]._id, // Bob
      members: [friends[0]._id, consumer._id, friends[1]._id], // Bob, Alice, Charlie
      shared_products: [
        { product: seededItems[1]._id, sharedBy: friends[0]._id }, // Laptop shared by Bob
        { product: seededItems[2]._id, sharedBy: consumer._id }    // Keyboard shared by Alice
      ]
    });
    await group1.save();

    const group2 = new Group({
      name: 'Family Shopping List',
      description: 'Coordinating weekly purchases and wishlists.',
      creator: friends[1]._id, // Charlie
      members: [friends[1]._id, friends[2]._id], // Charlie, Diana
      shared_products: []
    });
    await group2.save();

    console.log("Seeding Product Interactions...");
    const interactions = [
      { user: consumer._id, product: seededItems[0]._id, interaction_type: 'VIEWED', weight: 1 },
      { user: consumer._id, product: seededItems[1]._id, interaction_type: 'WISHLISTED', weight: 3 },
      { user: friends[0]._id, product: seededItems[1]._id, interaction_type: 'PURCHASED', weight: 5 },
      { user: friends[0]._id, product: seededItems[2]._id, interaction_type: 'SHARED', weight: 4 },
      { user: friends[1]._id, product: seededItems[1]._id, interaction_type: 'PURCHASED', weight: 5 }
    ];

    for (const inter of interactions) {
      await new ProductInteraction(inter).save();
    }

    console.log("Computing PageRank scores...");
    await computePageRank();

    console.log("Database seeded successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding database: ", error);
    process.exit(1);
  }
};

seedDatabase();
