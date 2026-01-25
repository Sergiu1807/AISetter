# Week 2 Testing Guide - Dashboard Shell & UI

This guide will help you test all Week 2 features: Dashboard layout, Stats cards, Needs Attention, Settings, and Dark Mode.

## ✅ Week 2 Implementation Summary

### Day 1: Dashboard Layout ✅
- Dashboard Shell with Sidebar and TopBar
- Full navigation menu
- User profile dropdown
- Role-based menu items

### Day 2: Stats Cards ✅
- 4 key metrics with trend indicators
- Loading skeletons
- Responsive grid layout
- Hover effects

### Day 3: Overview Components ✅
- Needs Attention list
- Recent Activity feed
- Team Online status
- Action buttons

### Day 4: User Settings ✅
- Profile information editor
- Password change form
- Notification preferences
- Appearance settings (theme preview)
- Security settings (admin only)

### Day 5: Dark Mode ✅
- Theme provider with context
- Theme toggle in TopBar
- Theme persistence (localStorage)
- System theme detection
- Smooth transitions

---

## 🧪 Testing Checklist

### Test 1: Dashboard Layout & Navigation

**What to test:**
- Sidebar navigation
- Active route highlighting
- TopBar search and actions
- Role-based menu items

**Steps:**
1. Sign in to http://localhost:3000/dashboard
2. Check the sidebar on the left:
   - ✅ Logo at the top
   - ✅ All menu items visible (Overview, Live Feed, Leads, Analytics, Training, Alerts, Logs, Settings)
   - ✅ Admin Panel visible (if admin)
   - ✅ Footer with version and copyright

3. Click each navigation item:
   - ✅ Overview - Should load dashboard page
   - ✅ Settings - Should load settings page
   - ✅ Others - Will show 404 (not implemented yet)

4. Check active state:
   - ✅ Currently active page should be highlighted in sidebar
   - ✅ Hover states work on all items

5. Check TopBar:
   - ✅ Search bar visible
   - ✅ Theme toggle (Sun/Moon icon)
   - ✅ Notification bell with red indicator
   - ✅ User avatar with name and role

6. Test user dropdown:
   - Click on your avatar
   - ✅ Dropdown shows your name and email
   - ✅ Profile Settings, Notifications, Preferences options
   - ✅ Sign Out option (red text)
   - Click "Sign Out" to test logout

---

### Test 2: Stats Cards

**What to test:**
- 4 metric cards
- Trend indicators
- Icons and colors
- Responsive layout

**Steps:**
1. Go to http://localhost:3000/dashboard
2. Check the 4 stats cards:
   - ✅ **Active Today**: 24, ↑ +12% (green)
   - ✅ **Calls Booked**: 7, ↑ +2 (green)
   - ✅ **Conversion Rate**: 68%, ↑ +5% (green)
   - ✅ **API Cost Today**: $12.40, ↓ -8% (red - good for costs!)

3. Visual checks:
   - ✅ Each card has an icon (Users, Calendar, TrendingUp, DollarSign)
   - ✅ Numbers are large and bold
   - ✅ Trend arrows point correct direction
   - ✅ Colors match trend (green up, red down)
   - ✅ Description text below trend

4. Hover over cards:
   - ✅ Cards should lift slightly (shadow effect)

5. Resize window:
   - ✅ Mobile (< 768px): 1 column
   - ✅ Tablet (768px - 1024px): 2 columns
   - ✅ Desktop (> 1024px): 4 columns

6. Refresh page:
   - ✅ Loading skeletons appear briefly
   - ✅ Then data loads

---

### Test 3: Needs Attention List

**What to test:**
- Lead list with priorities
- Action buttons
- Priority indicators

**Steps:**
1. Scroll down to "Needs Attention" section
2. Check the header:
   - ✅ Alert icon and title
   - ✅ Badge showing count (3)
   - ✅ "View All" button

3. Check each lead card:
   - ✅ Colored dot (red = high, yellow = medium, blue = low)
   - ✅ Name and handle (@username)
   - ✅ Issue description and time ago
   - ✅ Two buttons: "View" and "Take Over"

4. Visual inspection:
   - ✅ Cards have border and hover effect
   - ✅ 3 mock leads displayed:
     - Maria Pop - Needs Human (high priority - red)
     - Alex Ion - Needs Human (high priority - red)
     - Dan Popa - Stuck P4 (medium priority - yellow)

5. Click buttons:
   - Buttons link to `/dashboard/leads/[id]` (will show 404 for now)
   - ✅ Links work, navigation attempted

---

### Test 4: Recent Activity Feed

**What to test:**
- Activity timeline
- Icons and colors
- Time display

**Steps:**
1. Find "Recent Activity" card (below Needs Attention)
2. Check the header:
   - ✅ Clock icon and title
   - ✅ "View Live Feed" button

3. Check activity items:
   - ✅ Each has time (HH:MM format)
   - ✅ Icon (check, alert, or user icon)
   - ✅ Handle (@username)
   - ✅ Action description

4. Visual checks:
   - ✅ 5 activity items displayed
   - ✅ Left border on each item
   - ✅ Border changes color on hover
   - ✅ Icons colored based on status:
     - Green = success (BOOKED)
     - Yellow = warning (flagged)
     - Blue = info (moved to phase)

5. Mock data check:
   - @andrei.pop - Moved to P4
   - @elena.mat - BOOKED CALL! 🎉 (success)
   - @ion.radu - New lead started
   - @diana.luca - Flagged for review (warning)
   - @mihai.stan - Moved to P5

---

### Test 5: Team Online Status

**What to test:**
- Online/offline indicators
- User information

**Steps:**
1. Find "Team Online" card (right side, bottom)
2. Check your status:
   - ✅ Green dot (online)
   - ✅ Your name with "(You)"
   - ✅ Your role displayed

3. Check team members:
   - ✅ Gray dot (offline)
   - ✅ "Team Members" label
   - ✅ "Offline - 2h ago" status

---

### Test 6: User Settings Page

**What to test:**
- Tab navigation
- Form fields
- Switches
- Save functionality

**Steps:**
1. Click "Settings" in sidebar
2. Should navigate to `/dashboard/settings`

**Profile Tab:**
3. Check Profile tab (should be default):
   - ✅ Full Name field (populated with your name)
   - ✅ Email field (populated with your email)
   - ✅ Role display (badge with your role)
   - ✅ "Save Changes" button

4. Password section:
   - ✅ Current Password field
   - ✅ New Password field
   - ✅ Confirm Password field
   - ✅ "Update Password" button

5. Test form:
   - Type in Full Name field
   - Click "Save Changes"
   - ✅ Button shows "Saving..." then "Save Changes"

**Notifications Tab:**
6. Click "Notifications" tab:
   - ✅ Browser Notifications switch
   - ✅ Email Notifications switch
   - ✅ Sound Alerts switch
   - ✅ Each has description text

7. Toggle switches:
   - Click each switch on/off
   - ✅ Switches animate smoothly
   - Click "Save Preferences"
   - ✅ Shows saving state

**Appearance Tab:**
8. Click "Appearance" tab:
   - ✅ 3 theme options displayed:
     - Light (☀️)
     - Dark (🌙)
     - System (💻)
   - ✅ Note about full implementation

**Security Tab (Admin only):**
9. If admin, click "Security" tab:
   - ✅ Two-Factor Authentication section
   - ✅ Active Sessions section
   - ✅ Buttons for each feature

10. If not admin:
    - ✅ Security tab should not appear

---

### Test 7: Dark Mode & Theme Switching

**What to test:**
- Theme toggle functionality
- Theme persistence
- Smooth transitions

**Steps:**
1. Make sure you're on dashboard page
2. Look at TopBar - find Sun/Moon icon button

**Toggle to Dark Mode:**
3. Click the theme toggle (Sun icon)
   - ✅ Icon should rotate and switch to Moon
   - ✅ Background becomes dark
   - ✅ Text becomes light
   - ✅ All components update colors
   - ✅ Cards have dark backgrounds
   - ✅ Borders are gray-700/gray-800

4. Check all elements in dark mode:
   - ✅ Sidebar - dark background
   - ✅ TopBar - dark background
   - ✅ Stats cards - dark theme
   - ✅ Needs Attention - dark cards
   - ✅ Recent Activity - dark theme
   - ✅ All text is readable

**Toggle back to Light Mode:**
5. Click theme toggle again (Moon icon)
   - ✅ Icon rotates back to Sun
   - ✅ Everything returns to light theme
   - ✅ Smooth transition

**Test Persistence:**
6. Switch to dark mode
7. Refresh the page (Cmd/Ctrl + R)
   - ✅ Should stay in dark mode
8. Close tab and reopen http://localhost:3000/dashboard
   - ✅ Should still be in dark mode

9. Open browser developer tools:
   - Go to Application > Local Storage > http://localhost:3000
   - ✅ Should see `theme: "dark"` entry

10. Switch to light mode
    - ✅ localStorage updates to `theme: "light"`

**Test System Theme:**
11. Open browser console, run:
    ```javascript
    localStorage.setItem('theme', 'system')
    location.reload()
    ```
12. ✅ Theme should match your OS theme
13. Change OS theme (System Preferences/Settings)
    - ✅ Dashboard theme should update automatically

---

### Test 8: Responsive Design

**What to test:**
- Layout at different screen sizes
- Mobile menu (not implemented yet, but layout should work)
- Touch interactions

**Desktop (> 1024px):**
1. Full width browser window
   - ✅ Sidebar visible (256px wide)
   - ✅ Stats in 4 columns
   - ✅ All content fits well
   - ✅ No horizontal scroll

**Tablet (768px - 1024px):**
2. Resize window to ~800px width
   - ✅ Sidebar still visible
   - ✅ Stats in 2 columns
   - ✅ Needs Attention full width
   - ✅ Activity/Team in 2 columns

**Mobile (< 768px):**
3. Resize window to ~400px width
   - ✅ Sidebar still showing (will be menu in future)
   - ✅ Stats in 1 column (stacked)
   - ✅ All cards full width
   - ✅ Activity/Team stacked
   - ✅ Settings tabs scroll horizontally

**Test on actual devices:**
4. Open on phone/tablet if possible
   - ✅ Everything renders correctly
   - ✅ Touch interactions work
   - ✅ No layout issues

---

### Test 9: Performance & Loading States

**What to test:**
- Initial page load
- Loading skeletons
- Smooth transitions

**Steps:**
1. Sign out and sign back in
2. Observe dashboard loading:
   - ✅ Loading skeleton for header
   - ✅ Loading skeleton for stats (4 cards)
   - ✅ Then real data appears

3. Navigate between pages:
   - Dashboard → Settings → Dashboard
   - ✅ Transitions are smooth
   - ✅ No flashing/jumping

4. Theme toggle:
   - Switch light/dark multiple times
   - ✅ Transitions are smooth
   - ✅ No flickering

5. Open browser DevTools > Network tab
6. Refresh dashboard
   - ✅ Page loads < 2 seconds
   - ✅ No failed requests

---

### Test 10: Cross-Browser Compatibility

**Browsers to test:**
- Chrome/Edge
- Firefox
- Safari

**For each browser:**
1. Open http://localhost:3000
2. Sign in
3. Test theme toggle
4. Navigate to settings
5. Check all components render correctly

✅ All features should work identically

---

## 🐛 Common Issues & Solutions

### Issue 1: Theme not persisting
**Solution:**
- Check browser localStorage
- Clear localStorage and try again
- Make sure cookies aren't blocked

### Issue 2: Dashboard looks broken in dark mode
**Solution:**
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
- Check Tailwind dark mode classes
- Verify ThemeProvider is wrapping the app

### Issue 3: Stats cards not loading
**Solution:**
- Check browser console for errors
- Verify auth is working (you're signed in)
- Refresh the page

### Issue 4: Settings page shows 404
**Solution:**
- Check the file exists: `src/app/dashboard/settings/page.tsx`
- Hard refresh the browser
- Check dev server is running

---

## 📊 Week 2 Statistics

**Components Created:** 8+
- DashboardShell
- StatsCard
- NeedsAttentionList
- RecentActivity
- Settings Page (with 4 tabs)
- ThemeProvider

**Pages:** 2
- Dashboard Overview (`/dashboard`)
- Settings (`/dashboard/settings`)

**Contexts:** 2
- AuthContext ✅ (Week 1)
- ThemeContext ✅ (Week 2)

**Lines of Code:** ~1,500+

**Features:**
- ✅ Dashboard layout with sidebar/topbar
- ✅ 4 stats cards with trends
- ✅ Needs attention list (3 leads)
- ✅ Recent activity feed (5 items)
- ✅ Team online status
- ✅ User settings (4 tabs)
- ✅ Dark mode with persistence
- ✅ Responsive design
- ✅ Loading states
- ✅ Hover effects

---

## 🎯 Test Results Template

Copy and fill this out as you test:

```
# Week 2 Test Results - [Date]

## Test 1: Dashboard Layout & Navigation
- [ ] Sidebar navigation works
- [ ] Active route highlighting works
- [ ] TopBar elements visible
- [ ] User dropdown works
- [ ] Sign out works

## Test 2: Stats Cards
- [ ] 4 cards display correctly
- [ ] Trend indicators work (arrows, colors)
- [ ] Hover effects work
- [ ] Responsive on mobile/tablet/desktop
- [ ] Loading skeletons appear

## Test 3: Needs Attention List
- [ ] 3 leads displayed
- [ ] Priority indicators (colored dots)
- [ ] Action buttons work
- [ ] Hover effects work

## Test 4: Recent Activity Feed
- [ ] 5 activities displayed
- [ ] Icons and colors correct
- [ ] Time format correct
- [ ] Hover effects work

## Test 5: Team Online Status
- [ ] Your status shows (green dot)
- [ ] Team members show (gray dot)
- [ ] Names and roles display

## Test 6: User Settings Page
- [ ] Profile tab works
- [ ] Notifications tab works
- [ ] Appearance tab works
- [ ] Security tab (admin only)
- [ ] Form fields editable
- [ ] Switches toggle
- [ ] Save buttons work

## Test 7: Dark Mode
- [ ] Theme toggle button works
- [ ] Dark mode applies to all elements
- [ ] Light mode works
- [ ] Theme persists after refresh
- [ ] Smooth transitions

## Test 8: Responsive Design
- [ ] Desktop layout (4 stat columns)
- [ ] Tablet layout (2 stat columns)
- [ ] Mobile layout (1 stat column)
- [ ] No horizontal scroll

## Test 9: Performance & Loading
- [ ] Page loads quickly
- [ ] Loading states work
- [ ] No console errors
- [ ] Smooth navigation

## Test 10: Cross-Browser
- [ ] Chrome/Edge works
- [ ] Firefox works
- [ ] Safari works

## Issues Found:
[List any issues here]

## Notes:
[Additional notes]
```

---

## ✅ Ready for Week 3?

Before proceeding, ensure:
- [ ] All tests above pass
- [ ] No console errors
- [ ] Theme toggle works perfectly
- [ ] Settings page loads
- [ ] Dashboard looks good in light AND dark mode
- [ ] Responsive design works on all screen sizes
- [ ] Navigation works smoothly

---

## 🚀 Week 3 Preview

Next week we'll build:
- **Leads List Page** - Full table with filters
- **Search & Pagination** - Find leads quickly
- **Bulk Actions** - Manage multiple leads
- **Tags System** - Organize leads
- **Saved Filters** - Quick access to common views

---

## 📝 Quick Test Commands

```bash
# Start dev server
npm run dev

# Open in browser
# http://localhost:3000

# Check build
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

---

Congratulations on completing Week 2! 🎉

Your dashboard now has:
- Beautiful layout with sidebar/topbar
- Real-time stats
- Needs attention alerts
- Activity feeds
- Full settings page
- Working dark mode
- Responsive design

All ready for Week 3: Lead Management! 🚀
