
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupService, SignupRequest } from '../services/signupService';
import { UserRole } from '../types';
import { BRANDING } from '../constants';
import { Shield, Building, User, Mail, Phone, MapPin, Briefcase, CheckCircle, ArrowRight, Loader2, AlertCircle, Globe, Lock, Store } from 'lucide-react';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<SignupRequest>({
    companyName: '',
    contactPerson: '',
    email: '',
    password: '',
    mobile: '',
    city: '',
    role: UserRole.AGENT
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signupService.signup(formData);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof SignupRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-10 rounded-3xl shadow-2xl border border-white/50 max-w-md w-full text-center animate-in zoom-in-95 relative z-10">
          <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-inner">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Check your email!</h2>
          <p className="text-slate-600 mb-8 text-lg">
            We've sent a verification link to <br/>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded mt-1 inline-block">{formData.email}</span>
          </p>
          
          <div className="bg-brand-50 p-6 rounded-2xl text-left border border-brand-100 mb-8 shadow-sm">
            <h4 className="font-bold text-brand-900 flex items-center gap-2 mb-2"><Mail size={18}/> Verify to Activate</h4>
            <p className="text-sm text-brand-800 leading-relaxed">
              Click the link in the email to verify your account. Once verified, you can log in to the portal.
            </p>
          </div>

          <Link 
            to="/login"
            className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition transform hover:-translate-y-1 shadow-lg"
          >
            Go to Login
          </Link>
        </div>
        <p className="mt-8 text-xs text-slate-400 relative z-10">&copy; {new Date().getFullYear()} {BRANDING.legalName}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans relative overflow-hidden">
      
      {/* Decorative Background */}
      <div className="absolute inset-0 z-0 bg-slate-50">
         <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-brand-100/40 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
         <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-purple-100/40 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10 flex flex-col justify-center max-w-5xl">
        
        <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-lg mb-6">
                <div className="bg-brand-600 p-2.5 rounded-xl text-white">
                    <Shield size={32} />
                </div>
                <span className="ml-3 text-2xl font-extrabold text-slate-900 tracking-tight">{BRANDING.name}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Join our <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">B2B Network</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Empower your travel business with direct access to global inventory, net rates, and automated operations.
            </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl border border-white overflow-hidden flex flex-col md:flex-row">
            
            {/* Left Side: Role Selection Visuals */}
            <div className="md:w-5/12 bg-slate-50 p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-slate-900 mb-6">I am registering as...</h3>
                
                <div className="space-y-4">
                    <button
                        type="button"
                        onClick={() => handleChange('role', UserRole.AGENT)}
                        className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 flex items-center gap-4 group ${
                            formData.role === UserRole.AGENT 
                            ? 'border-brand-500 bg-white shadow-lg ring-4 ring-brand-500/10 scale-105 z-10' 
                            : 'border-transparent bg-white shadow-sm hover:border-slate-300 hover:shadow-md text-slate-500'
                        }`}
                    >
                        <div className={`p-3 rounded-xl transition-colors ${formData.role === UserRole.AGENT ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <span className={`block font-bold text-lg ${formData.role === UserRole.AGENT ? 'text-slate-900' : 'text-slate-600'}`}>Travel Agent</span>
                            <span className="text-xs text-slate-500">I book trips for clients</span>
                        </div>
                        {formData.role === UserRole.AGENT && <CheckCircle className="ml-auto text-brand-500" size={20} />}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleChange('role', UserRole.OPERATOR)}
                        className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 flex items-center gap-4 group ${
                            formData.role === UserRole.OPERATOR 
                            ? 'border-brand-500 bg-white shadow-lg ring-4 ring-brand-500/10 scale-105 z-10' 
                            : 'border-transparent bg-white shadow-sm hover:border-slate-300 hover:shadow-md text-slate-500'
                        }`}
                    >
                        <div className={`p-3 rounded-xl transition-colors ${formData.role === UserRole.OPERATOR ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                            <Globe size={24} />
                        </div>
                        <div>
                            <span className={`block font-bold text-lg ${formData.role === UserRole.OPERATOR ? 'text-slate-900' : 'text-slate-600'}`}>DMC Partner</span>
                            <span className="text-xs text-slate-500">I provide local services</span>
                        </div>
                        {formData.role === UserRole.OPERATOR && <CheckCircle className="ml-auto text-brand-500" size={20} />}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleChange('role', UserRole.HOTEL_PARTNER)}
                        className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 flex items-center gap-4 group ${
                            formData.role === UserRole.HOTEL_PARTNER 
                            ? 'border-brand-500 bg-white shadow-lg ring-4 ring-brand-500/10 scale-105 z-10' 
                            : 'border-transparent bg-white shadow-sm hover:border-slate-300 hover:shadow-md text-slate-500'
                        }`}
                    >
                        <div className={`p-3 rounded-xl transition-colors ${formData.role === UserRole.HOTEL_PARTNER ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                            <Store size={24} />
                        </div>
                        <div>
                            <span className={`block font-bold text-lg ${formData.role === UserRole.HOTEL_PARTNER ? 'text-slate-900' : 'text-slate-600'}`}>Hotel Partner</span>
                            <span className="text-xs text-slate-500">I supply hotel inventory</span>
                        </div>
                        {formData.role === UserRole.HOTEL_PARTNER && <CheckCircle className="ml-auto text-brand-500" size={20} />}
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200">
                    <p className="text-sm text-slate-500 text-center">
                        Already a partner? <Link to="/login" className="text-brand-700 font-bold hover:underline">Log In</Link>
                    </p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="md:w-7/12 p-8 md:p-10 bg-white">
                <h3 className="text-2xl font-bold text-slate-900 mb-1">Company Details</h3>
                <p className="text-slate-500 text-sm mb-8">Please provide your official business information.</p>

                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-center gap-3 rounded-r-lg animate-in fade-in">
                    <AlertCircle className="text-red-500 shrink-0" size={20} />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 group-focus-within:text-brand-600 transition-colors">Company Name</label>
                            <div className="relative">
                                <Building className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={formData.companyName}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder-slate-400 font-medium"
                                    placeholder="Travels Pvt Ltd"
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 group-focus-within:text-brand-600 transition-colors">Contact Person</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={formData.contactPerson}
                                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder-slate-400 font-medium"
                                    placeholder="Full Name"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 group-focus-within:text-brand-600 transition-colors">Business Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder-slate-400 font-medium"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 group-focus-within:text-brand-600 transition-colors">Mobile Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                                <input
                                    type="tel"
                                    required
                                    value={formData.mobile}
                                    onChange={(e) => handleChange('mobile', e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder-slate-400 font-medium"
                                    placeholder="+91 00000 00000"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 group-focus-within:text-brand-600 transition-colors">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder-slate-400 font-medium"
                                placeholder="Create a strong password"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 group-focus-within:text-brand-600 transition-colors">City / Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                            <input
                                type="text"
                                required
                                value={formData.city}
                                onChange={(e) => handleChange('city', e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder-slate-400 font-medium"
                                placeholder="e.g. Mumbai, Maharashtra"
                            />
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 py-4 px-6 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'Create Account'}
                            {!isLoading && <ArrowRight size={20} />}
                        </button>
                        <p className="text-xs text-slate-400 text-center mt-4">
                            By registering, you agree to our Terms of Service & Privacy Policy.
                        </p>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};
