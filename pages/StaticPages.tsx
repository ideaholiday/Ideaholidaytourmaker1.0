
import React from 'react';
import { BRANDING } from '../constants';

export const Terms: React.FC = () => (
  <div className="container mx-auto px-4 py-12 max-w-4xl">
    <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900">📜 TERMS & CONDITIONS</h1>
        <p className="text-slate-500 mt-2">Idea Holiday Tour Maker</p>
    </div>
    
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-slate-700 space-y-8">
        <div className="border-b border-slate-100 pb-6">
            <p className="text-sm text-slate-500 mb-2">Last updated: 13 January 2026</p>
            <p>These Terms & Conditions govern the use of <strong>Idea Holiday Tour Maker</strong>, operated by <strong>Idea Holiday Pvt. Ltd.</strong></p>
            <p className="mt-2">By accessing or using the platform, you agree to these terms.</p>
        </div>

        <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">1. Platform Nature</h3>
            <p className="leading-relaxed mb-2">Idea Holiday Tour Maker is a <strong>B2B travel management platform</strong>, intended for:</p>
            <ul className="list-disc pl-5 space-y-1 mb-2">
                <li>Travel agents</li>
                <li>Operators</li>
                <li>Internal staff</li>
                <li>Administrators</li>
            </ul>
            <p>It is <strong>not a consumer-facing booking website</strong>.</p>
        </section>

        <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">2. User Roles & Access</h3>
            <p className="mb-2">Access is provided based on role:</p>
            <ul className="list-disc pl-5 space-y-1 mb-2">
                <li><strong>Admin:</strong> Full system control</li>
                <li><strong>Staff:</strong> Limited operational access</li>
                <li><strong>Agent:</strong> Quote and booking management</li>
                <li><strong>Operator:</strong> Execution-only access</li>
            </ul>
            <p>Users must not attempt to access restricted areas.</p>
        </section>

        <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">3. Data Accuracy & Responsibility</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>Agents are responsible for itinerary and client data accuracy</li>
                <li>Operators are responsible for service execution details</li>
                <li>Admin reserves the right to correct or suspend misuse</li>
            </ul>
        </section>

        <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">4. Pricing & Payments</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>All prices shown are <strong>B2B commercial values</strong></li>
                <li>Operator pricing and agent margins are protected by Privacy Wall</li>
                <li>Payments and GST records are maintained for compliance only</li>
            </ul>
        </section>

        <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">5. Booking, Cancellation & Refunds</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>Booking confirmation depends on internal approval</li>
                <li>Cancellation and refunds are subject to platform policies</li>
                <li>Refunds may be partial or non-refundable based on service stage</li>
            </ul>
        </section>

        <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">6. Acceptable Use</h3>
            <p className="mb-2">Users must <strong>not</strong>:</p>
            <ul className="list-disc pl-5 space-y-1 mb-2">
                <li>Attempt unauthorized access</li>
                <li>Manipulate pricing or data</li>
                <li>Misuse operator or agent information</li>
                <li>Upload malicious or illegal content</li>
            </ul>
            <p>Violation may result in account suspension.</p>
        </section>

        <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">7. Intellectual Property</h3>
            <p>All software, branding, UI, and logic belong to <strong>Idea Holiday Pvt. Ltd.</strong> Unauthorized reproduction is prohibited.</p>
        </section>

        <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">8. Limitation of Liability</h3>
            <p>Idea Holiday Pvt. Ltd. acts as a <strong>technology platform</strong> and is not responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Third-party service failures</li>
                <li>Visa, airline, or hotel operational issues</li>
                <li>Force majeure events</li>
            </ul>
        </section>

        <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">9. Governing Law</h3>
            <p>These terms are governed by the laws of <strong>India</strong>. Jurisdiction: <strong>Lucknow, Uttar Pradesh</strong>.</p>
        </section>

        <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 mt-8">
            <h3 className="text-lg font-bold text-slate-900 mb-2">10. Contact Information</h3>
            <p className="text-sm text-slate-600 mb-1"><strong>Email:</strong> {BRANDING.email}</p>
            <p className="text-sm text-slate-600"><strong>Website:</strong> {BRANDING.website}</p>
        </div>
    </div>
  </div>
);

export const Privacy: React.FC = () => (
  <div className="container mx-auto px-4 py-12 max-w-4xl">
    <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900">🔐 PRIVACY POLICY</h1>
        <p className="text-slate-500 mt-2">Idea Holiday Tour Maker</p>
    </div>
    
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-slate-700 space-y-8">
        <div className="border-b border-slate-100 pb-6">
             <p className="text-sm text-slate-500 mb-2">Last updated: 13 January 2026</p>
             <p>Idea Holiday Pvt. Ltd. (“<strong>Idea Holiday</strong>”, “<strong>we</strong>”, “<strong>our</strong>”, “<strong>us</strong>”) operates the <strong>Idea Holiday Tour Maker</strong>, a B2B travel management and booking platform available at <strong>b2b.ideaholiday.com</strong>.</p>
             <p className="mt-2">This Privacy Policy explains how we collect, use, store, and protect information when you use our application.</p>
        </div>

        <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
            
            <div className="ml-4 mb-4">
                <h3 className="font-bold text-slate-800 mb-2">a) Account Information</h3>
                <p className="mb-2">When you sign in or register, we may collect:</p>
                <ul className="list-disc pl-5 mb-4 space-y-1">
                    <li>Name</li>
                    <li>Email address</li>
                    <li>Role (Admin, Staff, Agent, Operator)</li>
                    <li>Company / Agency details</li>
                </ul>
                <p className="mb-2">Authentication may be done using:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Email & password</li>
                    <li>Google OAuth (basic profile information only)</li>
                </ul>
            </div>

            <div className="ml-4 mb-4">
                <h3 className="font-bold text-slate-800 mb-2">b) Business & Operational Data</h3>
                <p className="mb-2">As part of the B2B travel workflow, we store:</p>
                <ul className="list-disc pl-5 mb-4 space-y-1">
                    <li>Quotes, itineraries, and bookings</li>
                    <li>Operator assignments</li>
                    <li>Payment status (advance/balance – no card data)</li>
                    <li>GST and accounting-related records</li>
                    <li>Comments and internal communication</li>
                </ul>
            </div>

            <div className="ml-4">
                <h3 className="font-bold text-slate-800 mb-2">c) Technical Information</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>IP address</li>
                    <li>Browser and device information</li>
                    <li>Login timestamps</li>
                    <li>Audit and activity logs (for compliance)</li>
                </ul>
            </div>
        </section>

        <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
            <p className="mb-2">We use collected data strictly to:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
                <li>Authenticate users securely</li>
                <li>Provide B2B travel quotation and booking services</li>
                <li>Manage operators, agents, and staff workflows</li>
                <li>Maintain accounting, GST, and compliance records</li>
                <li>Improve platform security and reliability</li>
            </ul>
            <p className="font-medium text-slate-900">❌ We do <strong>not</strong> sell, rent, or trade user data.</p>
        </section>

        <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Google OAuth & Data Usage</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="mb-2">If you sign in using Google:</p>
                <ul className="list-disc pl-5 space-y-1 mb-4">
                    <li>We only access <strong>basic profile information</strong> (name, email)</li>
                    <li>We do <strong>not</strong> access Gmail, contacts, or any sensitive Google data</li>
                    <li>Google data is used <strong>only for authentication</strong></li>
                </ul>
                <p className="text-sm text-blue-800">Our app complies with <strong>Google API Services User Data Policy</strong>, including <strong>Limited Use requirements</strong>.</p>
            </div>
        </section>

        <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Sharing</h2>
            <p className="mb-2">Your data is shared <strong>only</strong>:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
                <li>Internally between authorized roles (Admin, Staff, Agent, Operator)</li>
                <li>When required by law or government authorities</li>
            </ul>
            <p>We <strong>never</strong> share data with advertisers or third parties for marketing.</p>
        </section>

        <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Security</h2>
            <p className="mb-2">We implement:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Role-based access control (Privacy Wall)</li>
                <li>Encrypted authentication</li>
                <li>Audit logs for all sensitive actions</li>
                <li>Restricted operator and agent visibility</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1">
                <li>As long as the account is active</li>
                <li>As required for legal, accounting, and GST compliance</li>
            </ul>
        </section>

        <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. User Rights</h2>
            <p className="mb-2">You may request:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
                <li>Access to your data</li>
                <li>Correction of inaccurate information</li>
                <li>Account deactivation (subject to compliance retention)</li>
            </ul>
            <p>Requests can be sent to: <a href={`mailto:${BRANDING.email}`} className="text-brand-600 hover:underline">{BRANDING.email}</a></p>
        </section>

        <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Updates to This Policy</h2>
            <p>We may update this Privacy Policy periodically. Updates will be reflected on this page.</p>
        </section>

        <section className="bg-slate-50 p-6 rounded-lg border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-4">9. Contact Information</h2>
            <p className="font-bold">{BRANDING.legalName}</p>
            <p className="text-sm text-slate-600 whitespace-pre-line mb-4">{BRANDING.address}</p>
            <p className="text-sm text-slate-600"><strong>Email:</strong> <a href={`mailto:${BRANDING.email}`} className="text-brand-600 hover:underline">{BRANDING.email}</a></p>
            <p className="text-sm text-slate-600"><strong>Website:</strong> <a href={`https://${BRANDING.website}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{BRANDING.website}</a></p>
        </section>
    </div>
  </div>
);

export const Support: React.FC = () => (
  <div className="container mx-auto px-4 py-12">
    <h1 className="text-2xl font-bold mb-6">Support Center</h1>
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <p className="mb-2"><strong>Email:</strong> {BRANDING.email}</p>
      <p className="mb-2"><strong>Phone:</strong> {BRANDING.supportPhone}</p>
      <p>Please quote your Agent ID when contacting support.</p>
    </div>
  </div>
);

export const Faq: React.FC = () => (
  <div className="container mx-auto px-4 py-12">
    <h1 className="text-2xl font-bold mb-6">Frequently Asked Questions</h1>
    <div className="space-y-4">
      <details className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <summary className="font-medium cursor-pointer">How do I reset my Operator password?</summary>
        <p className="mt-2 text-slate-600">Contact the Admin team at {BRANDING.email}.</p>
      </details>
       <details className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <summary className="font-medium cursor-pointer">Can Agents see Operator details?</summary>
        <p className="mt-2 text-slate-600">No. All ground operations are white-labeled to protect business relationships.</p>
      </details>
    </div>
  </div>
);
