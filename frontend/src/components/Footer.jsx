import React from 'react';
import { Link } from 'react-router-dom';
import { Clover, Mail, Shield, Truck, RotateCcw, CreditCard } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="hidden lg:block bg-[#0A0C10] border-t border-white/5 pt-16 pb-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        
        <div className="grid grid-cols-4 gap-8 pb-12 border-b border-white/5 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-blue-400">
              <Truck size={24} />
            </div>
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-widest mb-1">Free Shipping</h4>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">On orders over ₹500</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-emerald-400">
              <Shield size={24} />
            </div>
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-widest mb-1">Secure Checkout</h4>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">100% Protected</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-amber-400">
              <RotateCcw size={24} />
            </div>
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-widest mb-1">Easy Returns</h4>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">7 Days Return Policy</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-purple-400">
              <CreditCard size={24} />
            </div>
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-widest mb-1">Flexible Payment</h4>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">All Cards Accepted</p>
            </div>
          </div>
        </div>

        
        <div className="grid grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
                <Clover size={22} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black text-lg leading-tight tracking-tighter uppercase">Lucky</span>
                <span className="text-yellow-500 text-[10px] font-bold tracking-[0.2em] uppercase leading-none">Cart</span>
              </div>
            </Link>
            <p className="text-gray-500 text-xs font-bold leading-relaxed mb-6">
              The premier destination for premium quality assets. Discover curated collections and exclusive items available globally.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-[10px] font-black uppercase">
                IG
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-[10px] font-black uppercase">
                TW
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-[10px] font-black uppercase">
                FB
              </a>
            </div>
          </div>

          
          <div className="col-span-1">
            <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6">Shop</h4>
            <ul className="space-y-4">
              <li><Link to="/market" className="text-gray-500 text-xs font-bold uppercase hover:text-white transition-colors">New Arrivals</Link></li>
              <li><Link to="/market?category=Electronics" className="text-gray-500 text-xs font-bold uppercase hover:text-white transition-colors">Electronics</Link></li>
              <li><Link to="/market?category=Fashion" className="text-gray-500 text-xs font-bold uppercase hover:text-white transition-colors">Fashion</Link></li>
              <li><Link to="/market?sort=random" className="text-gray-500 text-xs font-bold uppercase hover:text-white transition-colors">Featured</Link></li>
            </ul>
          </div>

          
          <div className="col-span-1">
            <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6">Support</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-500 text-xs font-bold uppercase hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-gray-500 text-xs font-bold uppercase hover:text-white transition-colors">FAQs</a></li>
              <li><a href="#" className="text-gray-500 text-xs font-bold uppercase hover:text-white transition-colors">Shipping Info</a></li>
              <li><a href="#" className="text-gray-500 text-xs font-bold uppercase hover:text-white transition-colors">Return Policy</a></li>
            </ul>
          </div>

          
          <div className="col-span-1">
            <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6">Newsletter</h4>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-4 leading-relaxed">
              Subscribe to receive updates, access to exclusive deals, and more.
            </p>
            <form className="flex" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-[#16191D] border border-white/10 px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 rounded-l-lg"
              />
              <button 
                type="submit" 
                className="bg-white text-black px-4 py-3 rounded-r-lg hover:bg-gray-200 transition-colors"
              >
                <Mail size={16} />
              </button>
            </form>
          </div>
        </div>

        
        <div className="pt-8 border-t border-white/5 flex items-center justify-between">
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} Lucky Cart. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-600 text-[9px] font-black uppercase hover:text-white transition-colors tracking-widest">Privacy Policy</a>
            <a href="#" className="text-gray-600 text-[9px] font-black uppercase hover:text-white transition-colors tracking-widest">Terms of Service</a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
