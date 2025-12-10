import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithPopup
} from 'firebase/auth';
import { AlertTriangle, Mail, Loader2, ArrowLeft, CheckCircle, Lock, Eye, EyeOff, Layout } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true); 
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); 
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isReset) {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset email sent! Check your inbox.');
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      let msg = "Failed to authenticate.";
      if (err.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      if (err.code === 'auth/user-not-found') msg = "No account found with this email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      // The onAuthStateChanged listener in App.jsx will handle the redirect
    } catch (err) {
      console.error(err);
      let msg = "Failed to sign in with Google.";
      if (err.code === 'auth/popup-closed-by-user') msg = "Sign-in cancelled.";
      if (err.code === 'auth/account-exists-with-different-credential') msg = "An account already exists with this email using a different sign-in method.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans bg-slate-50">
      
      {/* --- FLOATING SHAPES --- */}
      <div className="absolute top-[15%] left-[15%] w-32 h-32 rounded-3xl shape-box animate-float-1 opacity-80 rotate-12"></div>
      <div className="absolute bottom-[20%] right-[10%] w-40 h-40 rounded-full shape-circle animate-float-2 opacity-80"></div>
      <div className="absolute bottom-[10%] left-[20%] w-24 h-24 rounded-full border-[8px] border-purple-400/30 animate-float-3"></div>
      
      {/* REDUCED MAX-WIDTH and PADDING */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 w-full max-w-[380px] relative z-10 transition-all duration-500"> {/* p-8->p-6, max-w-420->380, rounded-3xl->2xl */}
        
        {isReset ? (
          // --- RESET PASSWORD VIEW ---
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 ease-out">
            <button 
              onClick={() => { setIsReset(false); setError(''); setSuccess(''); }}
              className="text-slate-400 hover:text-slate-700 mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-inner ring-1 ring-blue-100">
                <Lock size={24} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Reset Password</h1>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">Enter the email associated with your account and we'll send you a link to reset it.</p>
            </div>

            {success && (
              <div className="bg-green-50/50 text-green-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3 mb-6 border border-green-100/50 font-medium">
                <CheckCircle size={18} className="mt-0.5 shrink-0" /> 
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <div className="relative transition-transform duration-200 group-focus-within:scale-[1.01]">
                  <input
                    type="email"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium shadow-sm"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs flex items-center gap-2 border border-red-100 font-medium">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || success}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          </div>
        ) : (
          // --- LOGIN / REGISTER VIEW ---
          <div className="animate-in fade-in slide-in-from-left-8 duration-500 ease-out">
            <div className="text-center mb-6"> {/* mb-10->mb-6 */}
              
               {/* LOGO - reduced size */}
              <div className="flex justify-center mb-4"> {/* mb-6->mb-4 */}
                 <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                    <Layout className="text-blue-600" size={24} strokeWidth={2} /> {/* size 32->24 */}
                 </div>
              </div>
              
              {/* CLEARER HEADINGS */}
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-brand mb-1">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-slate-500 text-xs font-medium">
                {isLogin ? 'Enter your details to sign in.' : 'Start building forms in seconds.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4"> {/* space-y-5->4 */}
              <div className="group">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</label>
                <div className="relative transition-transform duration-200 group-focus-within:scale-[1.01]">
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium shadow-sm" // py-3.5->2.5, pl-11->10, rounded-xl->lg
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Mail className="absolute left-3.5 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} /> {/* left-4->3.5, top-3.5->2.5, size 18->16 */}
                </div>
              </div>

              <div className="group">
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Password</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => { setIsReset(true); setError(''); }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative transition-transform duration-200 group-focus-within:scale-[1.01]">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-white/50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium shadow-sm" // py-3.5->2.5
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock className="absolute left-3.5 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs flex items-center gap-2 border border-red-100 font-medium animate-in fade-in slide-in-from-top-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-1 text-sm" // py-3.5->2.5, rounded-xl->lg
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>

              {/* NEW: Google Sign In Button (Add this section below the main button) */}
              <div className="relative my-4"> {/* my-6->4 */}
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-50 px-2 text-slate-400 font-bold tracking-wider">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm hover:shadow-md hover:border-slate-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none text-sm" // py-3.5->2.5, rounded-xl->lg
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>

            </form>

            <div className="mt-6 text-center border-t border-slate-100 pt-4"> {/* mt-8->6, pt-6->4 */}
              <p className="text-[10px] text-slate-500 mb-1"> {/* text-xs->[10px] */}
                {isLogin ? "New to Form Builder?" : "Already have an account?"}
              </p>
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors uppercase tracking-wide"
              >
                {isLogin ? "Create an account" : "Sign in here"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
