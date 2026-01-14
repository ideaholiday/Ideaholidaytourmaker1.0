
export const getWelcomeEmailHtml = (name: string, dashboardUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f1f5f9; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #0f172a; padding: 40px 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.5px; }
    .content { padding: 40px 30px; }
    .h-text { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }
    .feature-list { list-style: none; padding: 0; margin: 25px 0; }
    .feature-list li { margin-bottom: 12px; padding-left: 24px; position: relative; color: #475569; }
    .feature-list li:before { content: "✓"; position: absolute; left: 0; color: #0284c7; font-weight: bold; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; margin-top: 10px; }
    .btn:hover { background-color: #0369a1; }
    .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .footer a { color: #64748b; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Idea Holiday Partner Network</h1>
    </div>
    <div class="content">
      <div class="h-text">Welcome aboard, ${name}! 🎉</div>
      <p>Congratulations! Your partner account has been verified and fully activated.</p>
      
      <p>You now have authorized access to the Idea Holiday Tour Maker platform. As a B2B partner, you can execute seamless travel operations with our enterprise tools:</p>
      
      <ul class="feature-list">
        <li><strong>Smart Itinerary Builder:</strong> Create proposals in minutes.</li>
        <li><strong>Live Inventory:</strong> Access net rates for Hotels & Transfers.</li>
        <li><strong>White-Label Quotes:</strong> Generate branded PDFs for your clients.</li>
        <li><strong>Real-time Status:</strong> Track bookings from request to completion.</li>
      </ul>

      <div style="text-align: center; margin: 35px 0;">
        <a href="${dashboardUrl}" class="btn">Access Dashboard</a>
      </div>

      <p style="font-size: 14px; color: #64748b;">
        If you have any questions about your credit limit or inventory access, our support team is ready to help.
      </p>
    </div>
    <div class="footer">
      <p><strong>Idea Holiday Pvt Ltd</strong><br>Office No 129, Deva Palace, Lucknow</p>
      <p><a href="mailto:info@ideaholiday.com">info@ideaholiday.com</a></p>
      <p>&copy; ${new Date().getFullYear()} Idea Holiday Tour Maker. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
