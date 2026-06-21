
const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const { clerkMiddleware, getAuth, clerkClient } = require('@clerk/express');
require('dotenv').config();
console.log('Clerk key loaded:', process.env.CLERK_PUBLISHABLE_KEY);

const applicationRoutes = require('./routes/applicationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'partials/layout');

app.use(express.urlencoded({ extended: true })); // parse form data
app.use(express.json());                          // parse JSON bodies
app.use(express.static(path.join(__dirname, 'public')));


app.use(methodOverride('_method'));

app.use(clerkMiddleware());

// Middleware: attach current user info + publishable key to every view
async function attachUser(req, res, next) {
  try {
    const { userId } = getAuth(req);
    if (userId) {
      const user = await clerkClient.users.getUser(userId);
      res.locals.userName = user.firstName || user.emailAddresses?.[0]?.emailAddress || 'User';
    } else {
      res.locals.userName = null;
    }
  } catch (err) {
    console.error('attachUser error:', err.message);
    res.locals.userName = null;
  }
  // Make the publishable key available in layout for the Clerk JS SDK script
  res.locals.clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  next();
}

// Apply attachUser to all routes (public + protected)
app.use(attachUser);

// Public auth pages (no layout, standalone)
app.get('/sign-in', (req, res) => {
  res.render('sign-in', { publishableKey: process.env.CLERK_PUBLISHABLE_KEY, layout: false });
});
app.get('/sign-up', (req, res) => {
  res.render('sign-up', { publishableKey: process.env.CLERK_PUBLISHABLE_KEY, layout: false });
});

// All app routes — dashboard is public, write routes are protected inside the router
app.use('/', applicationRoutes);



app.use((req, res) => res.status(404).send('Page not found'));

app.listen(PORT, () => {
  console.log(`HireTrack running on http://localhost:${PORT}`);
});