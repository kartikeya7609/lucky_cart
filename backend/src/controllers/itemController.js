import csv from 'csv-parser';
import fs from 'fs';
import { Readable } from 'stream';
import { Item, Review, Order, OrderItem, ViewedItem, Notification, User } from '../models/index.js';
import cloudinary from '../config/cloudinary.js';

// Get all marketplace items (paginated, filtered, sorted)
export const getMarketplaceItems = async (req, res) => {
  const q = req.query.q;
  const categoryFilter = req.query.category;
  const sort = req.query.sort || 'random';
  const page = parseInt(req.query.page) || 1;
  const limit = 12;
  const skip = (page - 1) * limit;

  try {
    // Only fetch items that are in stock
    let queryObj = { stock: { $gt: 0 } };

    // Apply text search query
    if (q) {
      const regex = new RegExp(q, 'i');
      queryObj.$or = [
        { name: regex },
        { description: regex },
        { category: regex }
      ];
    }

    // Apply category filter
    if (categoryFilter && categoryFilter !== 'All') {
      queryObj.category = categoryFilter;
    }

    let items;
    let total;

    // Handle Sorting
    if (sort === 'random') {
      // Fetch all, shuffle in memory, and paginate (matching Flask behavior)
      const allItems = await Item.find(queryObj).populate('seller', 'username');
      total = allItems.length;
      
      // Fisher-Yates Shuffle
      for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
      }
      
      items = allItems.slice(skip, skip + limit);
    } else {
      let sortObj = {};
      if (sort === 'price_low') sortObj = { price: 1 };
      else if (sort === 'price_high') sortObj = { price: -1 };
      else if (sort === 'name') sortObj = { name: 1 };
      else if (sort === 'category') sortObj = { category: 1, name: 1 };

      total = await Item.countDocuments(queryObj);
      items = await Item.find(queryObj)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('seller', 'username');
    }

    const allCategories = await Item.distinct('category');
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      items,
      categories: allCategories,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages || 1,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        prevNum: page - 1,
        nextNum: page + 1
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving marketplace items' });
  }
};

// Get single item detail
export const getItemDetails = async (req, res) => {
  const itemId = req.params.id;
  const userId = req.user ? req.user.id : null;
  const sort = req.query.sort || 'newest';

  try {
    const item = await Item.findById(itemId).populate('seller', 'username');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Sort reviews
    let sortObj = {};
    if (sort === 'highest') sortObj = { rating: -1 };
    else if (sort === 'lowest') sortObj = { rating: 1 };
    else sortObj = { date_posted: -1 };

    const reviews = await Review.find({ item: itemId })
      .populate('user', 'username')
      .sort(sortObj);

    // Check if current user is a verified buyer
    let isVerifiedBuyer = false;
    if (userId) {
      // Find orders completed by user
      const userOrders = await Order.find({ user: userId });
      const orderIds = userOrders.map(o => o._id);
      
      // Check if any order contains this item
      const purchased = await OrderItem.findOne({
        order: { $in: orderIds },
        item: itemId
      });
      isVerifiedBuyer = !!purchased;

      // Track item view log (exclude seller of item itself)
      if (item.seller && String(item.seller._id) !== String(userId)) {
        await ViewedItem.findOneAndUpdate(
          { user: userId, item: itemId },
          { date_viewed: new Date() },
          { upsert: true, new: true }
        );
      }
    }

    res.status(200).json({
      item,
      reviews,
      isVerifiedBuyer
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving item details' });
  }
};

// Add new item (Seller only)
export const addItem = async (req, res) => {
  const { name, price, barcode, description, category, stock, cloudinary_url } = req.body;
  const sellerId = req.user.id;

  try {
    // Validations
    if (!name || !price || !barcode || !description) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check uniqueness
    const nameExists = await Item.findOne({ name });
    if (nameExists) return res.status(400).json({ message: 'Product name already exists!' });

    const barcodeExists = await Item.findOne({ barcode });
    if (barcodeExists) return res.status(400).json({ message: 'Barcode already exists!' });

    let imageUrl = 'default.jpg';
    if (cloudinary_url) {
      imageUrl = cloudinary_url;
    } else if (req.file) {
      // Handle file upload to Cloudinary
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'lucky_cart' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          Readable.from(req.file.buffer).pipe(uploadStream);
        });
        imageUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        return res.status(500).json({ message: `Image upload failed: ${uploadErr.message}` });
      }
    }

    const item = new Item({
      name,
      price: parseFloat(price),
      barcode,
      description,
      user_file: imageUrl,
      seller: sellerId,
      stock: parseInt(stock) || 1,
      category: category || 'General'
    });

    await item.save();
    res.status(201).json({ message: `Item '${item.name}' successfully listed!`, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error listing item', error: error.message });
  }
};

// Edit existing item (Seller only)
export const editItem = async (req, res) => {
  const itemId = req.params.id;
  const sellerId = req.user.id;
  const { price, stock, cloudinary_url } = req.body;

  try {
    const item = await Item.findOne({ _id: itemId, seller: sellerId });
    if (!item) {
      return res.status(404).json({ message: 'Item not found or unauthorized' });
    }

    const newPrice = parseFloat(price);
    const newStock = parseInt(stock);

    if (isNaN(newPrice) || isNaN(newStock)) {
      return res.status(400).json({ message: 'Invalid price or stock values.' });
    }

    const oldPrice = item.price;

    // Price reduction check
    if (newPrice !== oldPrice) {
      if (newPrice < oldPrice) {
        // Set original price for strikethrough if not already set, or if old price is higher than current original price
        if (!item.original_price || item.original_price < oldPrice) {
          item.original_price = oldPrice;
        }

        // Notify all users who viewed this item (excluding the seller)
        const viewedUsers = await ViewedItem.find({ item: itemId }).distinct('user');
        
        for (const uId of viewedUsers) {
          if (String(uId) !== String(sellerId)) {
            const notif = new Notification({
              user: uId,
              message: `Price Drop Alert! The item '${item.name}' you viewed has dropped in price from ₹${oldPrice.toFixed(2)} to ₹${newPrice.toFixed(2)}!`
            });
            await notif.save();
          }
        }
      } else if (newPrice >= (item.original_price || oldPrice)) {
        // Clear original price if updated back to normal or higher
        item.original_price = undefined;
      }
      item.price = newPrice;
    }

    item.stock = newStock;

    // Update image
    if (cloudinary_url) {
      item.user_file = cloudinary_url;
    } else if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'lucky_cart' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          Readable.from(req.file.buffer).pipe(uploadStream);
        });
        item.user_file = uploadResult.secure_url;
      } catch (uploadErr) {
        return res.status(500).json({ message: `Image upload failed: ${uploadErr.message}` });
      }
    }

    await item.save();
    res.status(200).json({ message: `Item '${item.name}' successfully updated!`, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating item' });
  }
};

// Get listings for current seller
export const getMyListings = async (req, res) => {
  const sellerId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  try {
    const total = await Item.countDocuments({ seller: sellerId });
    const items = await Item.find({ seller: sellerId })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving your listings' });
  }
};

// Bulk CSV Upload
export const uploadCsv = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a CSV file' });
  }

  const sellerId = req.user.id;
  const successItems = [];
  const errors = [];
  let rowIdx = 1; // start index matching csv parser index

  try {
    const fileContent = req.file.buffer.toString('utf-8');
    if (!fileContent.trim()) {
      return res.status(400).json({ message: 'The uploaded CSV file is empty.' });
    }

    // Synonym groups
    const nameSyns = ['name', 'item_name', 'product_name', 'title', 'item', 'product'];
    const barcodeSyns = ['barcode', 'bar_code', 'upc', 'sku', 'code'];
    const priceSyns = ['price', 'cost', 'rate', 'mrp', 'amount'];
    const stockSyns = ['stock', 'qty', 'quantity', 'count', 'stock_qty', 'inventory'];
    const descSyns = ['description', 'desc', 'details', 'about', 'info'];
    const catSyns = ['category', 'type', 'group', 'class'];
    const fileSyns = ['user_file', 'user_file_url', 'image', 'image_url', 'url', 'file', 'img'];

    const getVal = (rowObj, synonyms, defaultVal = '') => {
      for (const syn of synonyms) {
        if (rowObj[syn] !== undefined) {
          const val = String(rowObj[syn]).trim();
          return val || defaultVal;
        }
      }
      return defaultVal;
    };

    // Find headers row and clean headers
    const lines = fileContent.split(/\r?\n/);
    let headerIdx = -1;
    let rawHeaders = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split by comma
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, '').toLowerCase());
      
      const hasName = parts.some(p => nameSyns.some(syn => p.includes(syn)));
      const hasBarcode = parts.some(p => barcodeSyns.some(syn => p.includes(syn)));
      
      if (hasName && hasBarcode) {
        headerIdx = i;
        rawHeaders = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        break;
      }
    }

    if (headerIdx === -1) {
      return res.status(400).json({
        message: "Could not find a valid items header (must contain 'Name' and 'Barcode' columns separated by commas)."
      });
    }

    // Filter only the lines starting from headerIdx up to empty row or a new divider
    const itemsLines = [];
    for (let i = headerIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) break;
      if (line.startsWith('---') || line.includes('---')) {
        if (itemsLines.length > 0) break;
      }
      itemsLines.push(lines[i]);
    }

    const itemsContent = itemsLines.join('\n');
    const cleanHeaders = rawHeaders.map(h => h.trim().toLowerCase().replace(/ /g, '_').replace(/-/g, '_'));

    // Parse CSV records
    const results = [];
    const stream = Readable.from(itemsContent);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv({ headers: cleanHeaders, skipLines: 1 }))
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    for (const row of results) {
      rowIdx++;
      
      // Skip empty row
      if (Object.values(row).every(val => !val || !val.trim())) {
        continue;
      }

      const name = getVal(row, nameSyns);
      const barcode = getVal(row, barcodeSyns);

      if (!name) {
        errors.push(`Row ${rowIdx}: Product Name column is missing or empty.`);
        continue;
      }
      if (!barcode) {
        errors.push(`Row ${rowIdx} ('${name}'): Barcode column is missing or empty.`);
        continue;
      }

      // Check DB duplicates
      const nameExists = await Item.findOne({ name });
      if (nameExists) {
        errors.push(`Row ${rowIdx} ('${name}'): Product name already exists in the market.`);
        continue;
      }

      const barcodeExists = await Item.findOne({ barcode });
      if (barcodeExists) {
        errors.push(`Row ${rowIdx} ('${name}'): Barcode already exists in the market.`);
        continue;
      }

      const priceStr = getVal(row, priceSyns, '0');
      const price = parseFloat(priceStr);
      if (isNaN(price)) {
        errors.push(`Row ${rowIdx} ('${name}'): Invalid price format '${priceStr}'.`);
        continue;
      }

      const stockStr = getVal(row, stockSyns, '1');
      const stock = parseInt(stockStr);
      if (isNaN(stock)) {
        errors.push(`Row ${rowIdx} ('${name}'): Invalid stock format '${stockStr}'.`);
        continue;
      }

      const category = getVal(row, catSyns, 'General');
      const userFile = getVal(row, fileSyns, 'default.jpg');
      const description = getVal(row, descSyns, '');

      try {
        const item = new Item({
          name,
          price,
          barcode,
          description,
          stock,
          category,
          user_file: userFile,
          seller: sellerId
        });
        await item.save();
        successItems.push(item);
      } catch (err) {
        errors.push(`Row ${rowIdx} ('${name}'): Save error: ${err.message}`);
      }
    }

    const response = {
      message: `Successfully imported ${successItems.length} items!`,
      successCount: successItems.length,
      errorsCount: errors.length,
      errors: errors.slice(0, 5) // Show top 5 errors just like Flask
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `CSV Error: ${error.message}` });
  }
};

// CSV Template Download
export const getCsvTemplate = (req, res) => {
  const rows = [
    ['Name', 'Barcode', 'Price', 'Stock', 'Category', 'Description', 'Image URL'],
    ['iPhone 15 Pro Max', '888888888801', '129999.00', '10', 'Electronics', 'Apple iPhone 15 Pro Max 256GB – Titanium finish with A17 Pro chip and 48MP camera system.', 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80'],
    ['Samsung Galaxy S24 Ultra', '888888888802', '109999.00', '15', 'Electronics', 'Samsung Galaxy S24 Ultra 512GB – Built-in S Pen and 200MP quad-camera with AI features.', 'https://images.unsplash.com/photo-1583573636398-ce4c26802290?auto=format&fit=crop&w=800&q=80'],
    ['Sony WH-1000XM5 Headphones', '777777777701', '29999.00', '30', 'Electronics', 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones – 30hr battery and industry-leading ANC.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'],
    ['Nike Air Max 270', '666666666601', '12999.00', '50', 'Footwear', 'Nike Air Max 270 Mens Running Shoes – Lightweight mesh upper with full-length Air unit.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80'],
    ["Levi's 512 Slim Taper Jeans", '555555555501', '3999.00', '75', 'Fashion', "Levi's 512 Slim Taper Fit Jeans – Premium stretch denim in Classic Indigo wash.", 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80'],
    ['IKEA POANG Armchair', '444444444401', '8999.00', '20', 'Furniture', 'IKEA POANG Armchair – Birch veneer frame with Knisa light beige cushion. Ergonomic spring design.', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'],
    ['The 48 Laws of Power', '333333333301', '699.00', '120', 'Books', "Robert Greene's international bestseller on power dynamics – Penguin paperback edition.", 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'],
    ['Himalayan Pink Salt 1kg', '222222222201', '299.00', '200', 'Groceries', 'Pure unrefined Himalayan pink rock salt – rich in 84+ trace minerals. Food grade.', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80'],
    ['Casio G-Shock GA-2100', '111111111101', '9499.00', '40', 'Watches', 'Casio G-Shock GA-2100 Series – Carbon Core Guard octagonal bezel with Solar and Bluetooth.', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'],
    ['boAt Rockerz 450 Pro', '999999999901', '2499.00', '60', 'Electronics', 'boAt Rockerz 450 Pro Wireless Headphones – 70hr battery ENx tech and ASAP Charge support.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'],
  ];

  const csvContent = rows.map(r =>
    r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=lucky_cart_bulk_upload_template.csv');
  res.status(200).send(csvContent);
};

