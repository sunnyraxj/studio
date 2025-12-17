# **App Name**: Apna Billing Hub

## Core Features:

- Multi-Tenant Architecture: Single codebase serving multiple shops with complete data isolation using `shopId` as a tenant identifier.
- Firebase Authentication and Role-Based Access Control: Secure user authentication with Firebase Auth and Firestore rules enforcing role and shopId validation on every page load and API call.
- Product and Stock Management: Shop owners can manage products with details like name, SKU, price, and stock level. Data stored in Firestore and restricted by shopId.
- Sales and Billing: Shop owners can record sales transactions, generate invoices, and track payment methods. Firestore storage includes `shopId` for data isolation.
- Expense Tracking: Shop owners can track expenses by category and date. Firestore data includes `shopId` for proper data isolation.
- Manual Payment Processing: Shop owners can submit payment requests with UTR numbers. Superadmins can approve or reject payments, triggering subscription updates. Email notifications are sent using the Firebase Email Extension.
- Subscription Expiry Prediction: An AI powered tool uses the shop's past payment history as well as other information like industry, current macroeconomic conditions, current number of products in their catalog to assess the probability that the customer will want to extend their subscription. Provides estimated lead time and confidence interval.

## Style Guidelines:

- Primary color: Deep blue (#1E3A8A) to convey trust and stability.
- Background color: Light gray (#F0F3F5) for a clean, professional look.
- Accent color: Teal (#38BDF8) to highlight key actions and elements.
- Body and headline font: 'Inter', a sans-serif font, for a modern and clean interface. It works well for both headings and body text.
- Use consistent, professional icons to represent different modules and actions.
- Prioritize a clean and intuitive layout for both the shop owner and superadmin panels, focusing on ease of navigation and data clarity.
- Subtle animations for transitions and feedback to enhance the user experience.