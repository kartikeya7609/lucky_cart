import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import emailjs from '@emailjs/browser';
import { UserPlus, ChevronRight, ChevronLeft, ShieldCheck, Mail } from 'lucide-react';

const Register = () => {
  const { register, addToast } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form states
  const [username, setUsername] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [role, setRole] = useState('consumer');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Shipping details
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Passwords
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // OTP details
  const [otpVal, setOtpVal] = useState(['', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpStatus, setOtpStatus] = useState({ message: '', type: '' });
  const [remainingTime, setRemainingTime] = useState(300); // 5 minutes
  const [showResend, setShowResend] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Send OTP via EmailJS
  const sendOtpEmail = (email) => {
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(otp);
    console.log('GENERATED OTP:', otp);
    setOtpVal(['', '', '', '']);
    setOtpStatus({ message: 'Sending verification OTP...', type: 'info' });
    setShowResend(false);
    setRemainingTime(300);

    emailjs.init({ publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY });
    emailjs.send(import.meta.env.VITE_EMAILJS_SERVICE_ID, import.meta.env.VITE_EMAILJS_TEMPLATE_ID, {
      to_email: email,
      to_name: fullName || 'User',
      otp_code: otp,
      app_name: 'Lucky Cart'
    }).then(() => {
      setOtpStatus({ message: 'OTP sent! Check your inbox (and spam folder).', type: 'success' });
    }).catch(err => {
      console.error('EmailJS error:', err);
      setOtpStatus({ message: 'Failed to send OTP. Please try again.', type: 'danger' });
    });
  };

  // Countdown timer for OTP expiry
  useEffect(() => {
    let interval = null;
    if (step === 3 && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowResend(true);
            setOtpStatus({ message: 'OTP expired. Please resend.', type: 'danger' });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, remainingTime]);

  const handleNextStep1 = () => {
    if (!username || !emailAddress || !fullName || !phoneNumber) {
      addToast('Please fill out all personal and account fields.', 'warning');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!address || !city || !state || !zipCode || !password || !passwordConfirm) {
      addToast('Please fill out shipping and security fields.', 'warning');
      return;
    }
    if (password !== passwordConfirm) {
      addToast('Passwords do not match.', 'danger');
      return;
    }
    if (password.length < 6) {
      addToast('Password must be at least 6 characters.', 'danger');
      return;
    }
    setStep(3);
    sendOtpEmail(emailAddress);
  };

  const handleVerifyOtp = async () => {
    const entered = otpVal.join('');
    if (entered.length < 4) {
      setOtpStatus({ message: 'Please enter the 4-digit OTP.', type: 'danger' });
      return;
    }

    if (entered === generatedOtp && remainingTime > 0) {
      setOtpStatus({ message: '✓ Email verified! Creating your account…', type: 'success' });
      
      try {
        const verifyRes = await api.post('/auth/verify-otp', { email: emailAddress });
        if (verifyRes.status === 'ok') {
          setSubmitting(true);

          const payload = {
            username,
            email_address: emailAddress,
            password,
            role,
            full_name: fullName,
            phone_number: phoneNumber,
            address,
            city,
            state,
            zip_code: zipCode
          };

          // Debug: log exactly what we're sending
          console.log('Registration payload:', payload);

          const result = await register(payload);
          setSubmitting(false);

          if (result.success) {
            addToast('Account created successfully!', 'success');
            navigate('/market');
          } else {
            setOtpStatus({ message: result.error || 'Registration failed. Try again.', type: 'danger' });
          }
        }
      } catch (err) {
        setSubmitting(false);
        setOtpStatus({ message: err.message || 'Verification response failed.', type: 'danger' });
      }
    } else {
      setOtpStatus({ message: '✗ Incorrect OTP. Please try again.', type: 'danger' });
    }
  };

  const resendOtp = () => {
    sendOtpEmail(emailAddress);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="bg-[#16191D] border border-white/5 rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="bg-[#1C2025] p-6 sm:p-10 rounded-[2.4rem] border border-white/[0.03]">

            {/* Header */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl mb-4 shadow-xl shadow-white/5">
                <UserPlus className="text-[#0F1115]" size={28} />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">Create Account</h1>
              <p className="text-gray-500 text-sm mt-1">Join Lucky Cart in 3 easy steps</p>

              {/* Step Indicators */}
              <div className="flex items-center justify-center gap-3 mt-6">
                <div className={`h-1.5 w-10 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-white' : 'bg-white/10'}`}></div>
                <div className={`h-1.5 w-10 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-white' : 'bg-white/10'}`}></div>
                <div className={`h-1.5 w-10 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-white' : 'bg-white/10'}`}></div>
              </div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-2 font-bold">
                Step {step} of 3 — {step === 1 ? 'Account Info' : step === 2 ? 'Shipping & Security' : 'Email Verification'}
              </p>
            </div>

            {/* STEP 1: Account Info & Personal Info */}
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-5 border-b border-white/5 pb-3">
                    01. Account Credentials
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Username</label>
                      <input 
                        type="text" 
                        placeholder="johndoe"
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                      <input 
                        type="email" 
                        placeholder="john@example.com"
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col sm:col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Account Type</label>
                      <select 
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="consumer">Consumer (Buyer)</option>
                        <option value="seller">Seller</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-5 border-b border-white/5 pb-3">
                    02. Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="John Doe"
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 transition-all"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                      <input 
                        type="tel" 
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 transition-all"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleNextStep1}
                  className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                >
                  Next: Shipping Details
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* STEP 2: Shipping & Security */}
            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-[10px] font-black text-teal-500 uppercase tracking-[0.3em] mb-5 border-b border-white/5 pb-3">
                    03. Shipping Address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col sm:col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Street Address</label>
                      <input 
                        type="text" 
                        placeholder="123 Luxury Lane"
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-teal-500/50 transition-all"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">City</label>
                      <input 
                        type="text" 
                        placeholder="Mumbai"
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-teal-500/50 transition-all"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">State</label>
                      <input 
                        type="text" 
                        placeholder="Maharashtra"
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-teal-500/50 transition-all"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col sm:col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">ZIP / Postal Code</label>
                      <input 
                        type="text" 
                        placeholder="400001"
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-teal-500/50 transition-all"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-5 border-b border-white/5 pb-3">
                    04. Security
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-red-500/50 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full px-4 py-3.5 bg-[#121418] border border-[#2A2F36] rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-red-500/50 transition-all"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    className="w-full sm:w-1/3 py-4 bg-white/5 text-white font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-sm"
                  >
                    Go Back
                  </button>
                  <button 
                    type="button" 
                    onClick={handleNextStep2}
                    className="w-full sm:w-2/3 py-4 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
                  >
                    Verify Email with OTP
                    <Mail size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: OTP Verification */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Mail className="text-yellow-400" size={32} />
                  </div>
                  <h3 className="text-white font-black text-lg">Verify Your Email</h3>
                  <p className="text-gray-500 text-sm">
                    We've sent a 4-digit OTP to <span className="text-white font-bold">{emailAddress}</span>
                  </p>
                </div>

                {/* OTP Inputs */}
                <div className="flex justify-center gap-3 my-4">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      id={`otp${idx}`}
                      maxLength="1"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]"
                      className="w-14 h-14 text-center text-2xl font-black bg-[#121418] border-2 border-[#2A2F36] rounded-xl text-white focus:outline-none focus:border-yellow-500 transition-all"
                      value={otpVal[idx]}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const newOtp = [...otpVal];
                        newOtp[idx] = val;
                        setOtpVal(newOtp);
                        if (val && idx < 3) {
                          document.getElementById(`otp${idx + 1}`).focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otpVal[idx] && idx > 0) {
                          document.getElementById(`otp${idx - 1}`).focus();
                        }
                      }}
                    />
                  ))}
                </div>

                {/* OTP Status Badge */}
                {otpStatus.message && (
                  <div className={`text-center text-sm font-bold py-2 px-4 rounded-xl border ${
                    otpStatus.type === 'success' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {otpStatus.message}
                  </div>
                )}

                {/* Timer & Resend */}
                <div className="text-center text-xs text-gray-500">
                  OTP expires in <span className="text-white font-black">{formatTime(remainingTime)}</span>
                  {showResend && (
                    <button 
                      type="button" 
                      onClick={resendOtp}
                      className="ml-2 text-blue-400 hover:text-blue-300 font-bold underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    type="button" 
                    onClick={() => setStep(2)}
                    className="w-full sm:w-1/3 py-4 bg-white/5 text-white font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-sm"
                  >
                    Go Back
                  </button>
                  <button 
                    type="button" 
                    onClick={handleVerifyOtp}
                    disabled={submitting}
                    className="w-full sm:w-2/3 py-4 bg-yellow-500 text-black font-black rounded-2xl hover:bg-yellow-400 transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
                  >
                    <ShieldCheck size={18} />
                    {submitting ? 'Creating Account...' : 'Verify & Create Account'}
                  </button>
                </div>
              </div>
            )}

            {/* Back to sign in link */}
            <div className="text-center pt-6 border-t border-white/5 mt-6">
              <p className="text-sm text-gray-500 font-bold">
                Already have an account?{' '}
                <Link to="/login" className="text-white hover:underline underline-offset-4 transition-all">
                  Sign in
                </Link>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
