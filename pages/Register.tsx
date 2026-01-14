
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRANDING } from '../constants';
import { UserRole } from '../types';
import { AlertCircle, User, Mail, Lock, Briefcase, Shield } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.AGENT);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // NOTE: Using placeholder data for missing fields as this page is legacy. 
      await register(email, password, name, role, name + "'s Company", "0000000000", "Unknown");
      // Upon successful registration, redirect to verification page
      navigate('/verify-email');
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Create Partnership Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Join {BRANDING.name} network
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          {error && (
             <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 flex items-center">
              <AlertCircle className="text-red-500 mr-2" size={20} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 p-2.5 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 p-2.5 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="partner@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Role</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="block w-full pl-10 p-2.5 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 sm:text-sm bg-white"
                >
                  <option value={UserRole.AGENT}>Travel Agent</option>
                  <option value={UserRole.OPERATOR}>Ground Operator (DMC)</option>
                  <option value={UserRole.STAFF}>Internal Staff</option>
                </select>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Select 'Travel Agent' if you are booking for clients. 'Operator' for service providers.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 p-2.5 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="Min 8 characters"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                {isSubmitting ? 'Creating Account...' : 'Register'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
             <span className="text-sm text-slate-600">Already have an account? </span>
             <Link to="/login" className="text-sm font-medium text-brand-600 hover:text-brand-500">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
