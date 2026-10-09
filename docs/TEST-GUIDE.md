# Test guide

A walk through everything the platform does, in plain steps. Use a phone and a laptop side by side where it says so. Each step says what you should see. Anything that doesn't match is worth a note.

## Before you start

1. **Use the production site** once all phase PRs are merged (Vercel deploys `main` automatically). Hard-refresh once so you get the latest version.
2. **Make your admin account** (needed for the dashboard and admin parts): sign up on the site with your email, then in Supabase → SQL editor run the query in the README ("Admin panel"). Next time you open `/admin`, set up two-step sign-in with an authenticator app (Google Authenticator, Microsoft Authenticator…).
3. **Make a staff account** for one branch: sign up a second account (another email), then in Admin → Staff give it the "staff" role at Colombo 07.
4. Online card payments are paused (PayHere isn't set up yet), so orders are paid in cash for now. Emails only arrive once Resend is set up.

## 1. First impressions (Phases 8 to 11 and V2)

- [ ] **Colours:** the site is in lacquer red, saffron and curry-leaf green on a cream background, with dark brown sections. Headlines are in a warm serif with italic accents in red or saffron.
- [ ] **Splash:** open the home page in a new tab. On lacquer red, "KOTTU", "HOPPERS", "SAMBOL" and "LAMPRAIS" land one after another, each slashed by a saffron blade and flying apart in two halves, while a counter runs to 100. "KITHUL & CO." lands last, then the screen falls apart in strips, some dropping and some rising, and the page shows through. About four seconds. In Sinhala or Tamil the dishes are in that language. Refresh: it doesn't come back in that tab. On a slow phone the red screen may show only the logo, breathing, for a moment first; then the whole chop plays from the start.
- [ ] **Home (redesign):** under the video, two coloured bands cross and scroll (dishes in English, Sinhala and Tamil; the menu's categories). Scroll on: on a laptop the "dishes people cross town for" section stays put while the plates slide sideways; on a phone, swipe them. Hover a plate: it tilts and its rim turns. Further down, the big "COOKED THE WAY IT'S COOKED" lights up word by word and the plate beside it turns as you scroll. Guests' words slide past on two rows; the button stops them.
- [ ] **Changing page:** use the header's Menu, Branches or Events: the next page opens in strips, like blinds.
- [ ] **Sections:** scroll the home page. Each section rises over the one before with rounded top corners; on a laptop it starts a little narrower and widens to the edges as it comes up. The footer joins in at the end, and its big "Kithul & Co." rises into place.
- [ ] **Buttons:** hover "Order now", "Book a table" and "See the full menu". Colour fills each one from the bottom and the arrow steps forward. On a phone, a tap presses the button in slightly.
- [ ] **Tabs:** on the home page, switch between "Most ordered" and the other dish tabs: a dark pill slides to the one you chose. On the menu page, scroll: the red pill follows the category you're in.
- [ ] **Add to order:** on the menu, open a dish and add it. A small round photo of it flies up into the cart button, which bounces, and the count goes up.
- [ ] **Explore:** open "Explore" in the header. A dark full-screen menu opens and its pages rise in one after another.
- [ ] **Pages:** Branches, Events and Book a table open with a photo beside the title. About reads like a magazine page. FAQ keeps its title beside the questions. Sign in has a food photo beside the form. A made-up address (like /nothing-here) shows "404" with the logo as the zero.
- [ ] **Book a table:** on a laptop, the dark card on the right follows you down the page and shows each choice as you make it; the button is in the card. On a phone the card comes last.
- [ ] **Open now:** at the top of the hero, a badge says "Open now · 3 kitchens cooking" during opening hours, or "Closed now · opens at …" outside them.
- [ ] **Chef's pick (laptop):** to the right of the headline, a card with a dish photo and price; clicking it opens that dish on the menu.
- [ ] **First screen:** the kitchen video fills the screen, and over it, without scrolling: "Sri Lankan home cooking, hot at your door.", a saffron "Order now" and "Book a table", and a line with the rating, "Free delivery over Rs. 7,500", cash on delivery and halal options. The headline rises word by word.
- [ ] **Pause:** the round button at the bottom right pauses the video; reload and it stays paused until you press play. On a phone held upright the video is a tall cut, still sharp.
- [ ] **Dish tabs:** above the dishes, tabs: "Most ordered", "Rice & Curry" and others. Tap one: its dishes fade in one after another. With a keyboard, the arrow keys move between tabs.
- [ ] **Bestsellers:** dish cards with photo, price in whole rupees and a red "Add". On a laptop, point at a card: it lifts, the photo leans in and steam rises off the plate. "Add" opens the dish on the menu, ready to add to the order.
- [ ] **Why guests come back:** a dark section with a rice and curry photo and three numbered reasons.
- [ ] **This week:** offers as cards on red, each with a saffron button.
- [ ] **Branches:** a map of Sri Lanka with each branch pinned. Point at a branch in the list: its pin grows. "Use my location" adds you and sorts by distance.
- [ ] **Guests:** a green section with the average rating and the number of reviews, and one large quote at a time.
- [ ] **Order bar (phone):** scroll past the first screen: a dark bar with "Order now" and "Book a table" slides up from the bottom. It steps aside when you reach the footer.
- [ ] **Page transitions (laptop or a recent phone browser):** click "Order now" or a dish: the menu opens in a growing circle from where you clicked. Click "Branches" or "Events" in the header: the new page rises up over the old one like a curtain. Click the logo: the home page fades in and settles. The browser's back button just fades.
- [ ] **Loading line:** click "Menu" in the header: a thin saffron line runs along the very top until the menu appears. Buttons and cards press in slightly when tapped.
- [ ] **Scrolling:** flick quickly to the bottom, then back up: every section is there, nothing is left blank. On a laptop, scrolling glides; on a phone it's the phone's normal scrolling.
- [ ] **Explore menu:** tap "Explore" (top right). A full-screen menu with every page in large type, the branches' numbers and the time in Sri Lanka.
- [ ] **Footer:** a last invitation to order or book, the branches, and the brand name across the full width.
- [ ] **Reduced motion:** on a phone with "Reduce motion" on (iPhone: Accessibility → Motion; Android: Accessibility → Remove animations), there's no splash, the hero shows a still instead of the video, and nothing moves or glides.

## 2. Browsing

- [ ] **Menu:** a white toolbar card with search, the branch and dietary chips; below it, category pills with the number of dishes (the current one in red, following you as you scroll); dishes as cards with a photo, price in whole rupees and a red "+". The category bar along the top follows you as you scroll; search ("kottu"), dietary filters (Vegetarian, Halal…) and the branch picker work. Dolphin kottu shows as sold out at Nugegoda.
- [ ] **Dish window:** tap a dish. Choose a portion, add-ons, spice level and quantity; the price updates. Copy the link from the address bar into another tab: the same dish opens.
- [ ] **Languages:** use the language menu (EN) in the header to switch to සිංහල, then தமிழ். The whole page changes; your place on the page stays.
- [ ] **Branches, About, Contact, FAQ, policies:** all load, with opening hours and "Open now"/"Closed" for each branch.
- [ ] **Not found:** open `/anything` and you get a friendly "We couldn't find that page".

## 3. Ordering (phone)

- [ ] Add two dishes. On the menu page, a "View order" bar appears at the bottom with the count and total; the cart badge pops each time.
- [ ] Open the order and change quantities. Go to checkout.
- [ ] **Pickup:** choose a branch, "Schedule for later", fill in your name and mobile number (077 000 0123 is fine), choose "Pay at the counter" and place the order.
- [ ] **Delivery:** try again with Delivery. Tap the map to drop a pin near Colombo 07; the fee and branch appear. A pin far away (Jaffna) says it's outside the delivery area.
- [ ] **Promo code:** WELCOME10 on an order over Rs. 2,000 takes 10% off.
- [ ] **Tracking:** after ordering you land on the tracking page. Keep it open for section 7.

## 4. Accounts, points and reviews (Phase 7)

- [ ] Sign up (top right, Sign in → Create an account). "My account" appears.
- [ ] At checkout, tick "Save this address", order, then see it under My account → Addresses. Next checkout offers it.
- [ ] When the branch completes an order (section 7), My account shows points: one per Rs. 100 of food.
- [ ] At the next checkout, "Use my points" takes up to 20% off the food.
- [ ] My account → Orders → "Order again" refills the cart with today's prices.
- [ ] On a completed order's tracking page, leave a review. It appears on the home page only after you approve it (section 8).

## 5. Table bookings and events

- [ ] **Book a table:** pick a branch, a day and six guests; free times show; book one. The confirmation page has a cancel button.
- [ ] **Events:** send a birthday party enquiry for 40 guests. You get a private page that says a quote is coming.

## 6. Install it, and offline

- [ ] On the phone, open the browser menu → "Add to Home screen" / "Install app". It opens like an app with the brand's icon.
- [ ] With the app open, turn on airplane mode and open another page: a branded "You're offline" page appears in your language. Turn it off and tap "Try again".

## 7. Branch dashboard (laptop, staff account)

- [ ] Sign in as your staff account and open `/dashboard`. Press "Start shift" so sound can play.
- [ ] Place an order on the phone. On the laptop it appears straight away with a chime.
- [ ] Accept it, then move it to Preparing, Ready and Completed. The phone's tracking page follows each step by itself.
- [ ] Menu tab: mark a dish sold out; the public menu shows it within a few minutes. Pause online orders and resume.
- [ ] Reservations tab: the booking from section 5 is there; seat it and finish it.
- [ ] Events tab: the enquiry is there. Staff can see it; only managers and admins can price it (section 8).
- [ ] Print a ticket from an order.

## 8. Admin panel (laptop, admin account)

- [ ] Sign in, open `/admin`, enter your two-step code.
- [ ] **Overview:** today's sales, top dishes and the split by branch.
- [ ] **Menu:** change a price; the menu shows the new price within a few minutes. Add a photo.
- [ ] **Promo codes:** create one and use it at checkout.
- [ ] **Event quote:** as admin, open `/dashboard?branch=colombo-07` → Events and send a quote for the enquiry from section 5. The enquiry page shows it with Accept and Decline.
- [ ] **Reviews:** approve the review from section 4; it appears on the home page.
- [ ] **Settings:** change the main colour and save; the site follows. Change the loyalty rates. Change them back.
- [ ] **Staff, Payments, Audit log:** your earlier changes are listed in the audit log with your name.

## 9. The demo tour

- [ ] Tap "Take the tour" in the yellow demo ribbon. `/demo` walks through everything above, for client meetings.

## 10. Rebranding in minutes

- [ ] In Admin → Settings, change the restaurant name and colours. The name, colours, splash, ornaments, emails and the installed app's theme colour follow. (Logo and fonts need a deploy: see docs/REBRANDING.md.)
