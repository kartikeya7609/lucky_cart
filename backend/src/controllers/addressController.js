import { Address } from '../models/index.js';


export const getAddresses = async (req, res) => {
  const userId = req.user.id;

  try {
    const addresses = await Address.find({ user: userId });
    res.status(200).json(addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving addresses' });
  }
};


export const addAddress = async (req, res) => {
  const userId = req.user.id;
  const { full_name, phone_number, address_line, city, state, zip_code, is_default } = req.body;

  try {
    
    if (is_default) {
      await Address.updateMany({ user: userId }, { is_default: false });
    }

    const address = new Address({
      user: userId,
      full_name,
      phone_number,
      address_line,
      city,
      state,
      zip_code,
      is_default: !!is_default
    });

    await address.save();
    res.status(201).json({ message: 'Address added!', address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adding address' });
  }
};


export const setDefaultAddress = async (req, res) => {
  const addressId = req.params.id;
  const userId = req.user.id;

  try {
    await Address.updateMany({ user: userId }, { is_default: false });
    
    const addr = await Address.findOne({ _id: addressId, user: userId });
    if (!addr) {
      return res.status(404).json({ message: 'Address not found' });
    }

    addr.is_default = true;
    await addr.save();

    res.status(200).json({ message: 'Default address updated.', address: addr });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating default address' });
  }
};


export const deleteAddress = async (req, res) => {
  const addressId = req.params.id;
  const userId = req.user.id;

  try {
    const addr = await Address.findOneAndDelete({ _id: addressId, user: userId });
    if (!addr) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.status(200).json({ message: 'Address deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting address' });
  }
};
