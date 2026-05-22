import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { auth, confirmPasswordReset, verifyPasswordResetCode, sendPasswordResetEmail } from '../firebase';
import { motion } from 'motion/react';
import { Lock, ShieldCheck, Hospital, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

type ResetState = 'verifying' | 'expired' | 'valid' | 'resetting' | 'done' | 'error' | 'email_sent';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  const apiKey = searchParams.get('apiKey');

  const [state, setState] = useState<ResetState>(oobCode ? 'verifying' : 'email_sent');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (!oobCode || mode !== 'resetPassword') {
      setState('email_sent');
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setState('valid');
      })
      .catch(() => {
        setState('expired');
      });
  }, [oobCode, mode]);

  const handleReset = async () => {
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    setMessage('');
    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setState('done');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setMessage(err.message || 'Failed to reset password. The link may have expired.');
      setState('error');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendReset = async () => {
    if (!email) {
      setMessage('Please enter your email address.');
      return;
    }
    setSendLoading(true);
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      });
      setState('email_sent');
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to send reset email.');
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-emerald-500/5 border border-stone-100 overflow-hidden">
          <div className="bg-emerald-600 p-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white">Reset Password</h1>
            <p className="text-emerald-100 text-sm mt-1">EdvirontVet Account</p>
          </div>

          <div className="p-6">
            {/* VERIFYING */}
            {state === 'verifying' && (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 text-sm">Verifying your reset link...</p>
              </div>
            )}

            {/* EXPIRED */}
            {state === 'expired' && (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <h2 className="font-bold text-slate-900 mb-2">Link Expired</h2>
                <p className="text-slate-500 text-sm mb-6">This password reset link is no longer valid. Request a new one below.</p>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                  <button
                    onClick={handleSendReset}
                    disabled={sendLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  >
                    {sendLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
                {message && <p className="text-emerald-600 text-xs mt-4 font-medium">{message}</p>}
                <Link to="/login" className="block text-emerald-600 text-sm font-bold hover:underline mt-6">Back to Login</Link>
              </div>
            )}

            {/* VALID - Show reset form */}
            {state === 'valid' && (
              <div>
                <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-center">
                  <p className="text-emerald-800 text-sm font-medium">Reset password for</p>
                  <p className="text-emerald-600 font-bold text-lg">{email}</p>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full pl-12 pr-12 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-emerald-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-12 pr-12 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>
                  {message && (
                    <p className={`text-xs font-medium ${message.includes('sent') || message.includes('success') ? 'text-emerald-600' : 'text-red-500'}`}>{message}</p>
                  )}
                  <button
                    onClick={handleReset}
                    disabled={resetLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-bold transition-all disabled:opacity-50"
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </div>
            )}

            {/* DONE */}
            {state === 'done' && (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="font-bold text-slate-900 mb-2">Password Reset!</h2>
                <p className="text-slate-500 text-sm mb-6">Your password has been updated successfully. Redirecting to login...</p>
                <Link to="/login" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all">Go to Login</Link>
              </div>
            )}

            {/* ERROR */}
            {state === 'error' && (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <h2 className="font-bold text-slate-900 mb-2">Reset Failed</h2>
                <p className="text-red-500 text-sm mb-6">{message}</p>
                <button
                  onClick={handleReset}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* EMAIL_SENT - Initial state or after sending */}
            {state === 'email_sent' && !oobCode && (
              <div>
                <p className="text-slate-500 text-sm mb-6 text-center">Enter your email address and we'll send you a password reset link.</p>
                <div className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                  {message && <p className="text-emerald-600 text-xs font-medium text-center">{message}</p>}
                  <button
                    onClick={handleSendReset}
                    disabled={sendLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  >
                    {sendLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
                <Link to="/login" className="block text-center text-emerald-600 text-sm font-bold hover:underline mt-6">Back to Login</Link>
              </div>
            )}
          </div>

          <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400">
              <Hospital className="w-3 h-3 inline mr-1" />
              EdvirontVet Veterinary Clinic
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
