# 🎨 Video Safety Component Library

A production-ready React + Tailwind CSS component library with a warm, parent-friendly design system.

## 📦 Installation

Components are located in `/src/components/ui/` and `/src/components/layout/`

```javascript
// Import individual components
import { PrimaryButton, SecondaryButton } from './components/ui/Button'
import { Card, StatCard } from './components/ui/Card'
import { Badge, ScoreBadge } from './components/ui/Badge'
import { Input, Textarea, Select } from './components/ui/Input'
import { Modal } from './components/ui/Modal'
import { Navbar } from './components/layout/Navbar'
import { AppLayout } from './components/layout/AppLayout'

// Or import all UI components
import * from './components/ui'
```

---

## 🎨 Color Palette

```javascript
Coral:   #FF9C8A → #FF7B6B  // Primary actions, CTA buttons
Teal:    #5BC5B8 → #45B5A8  // Trust, calm, analysis complete
Purple:  #A897D4 → #9887C4  // Premium, profiles
Gold:    #FFB86B → #FFA84D  // Warnings, attention
Navy:    #2A3D66            // Text, headings
Gray:    #6B7280            // Secondary text
Cream:   #FFFBF7            // Page background
```

---

## 🔘 Buttons

### PrimaryButton
Main call-to-action button with coral gradient.

```jsx
import { PrimaryButton } from './components/ui/Button'

<PrimaryButton onClick={handleClick} loading={isLoading}>
  Get Started
</PrimaryButton>

<PrimaryButton icon={<Star />} disabled>
  With Icon
</PrimaryButton>
```

**Props:**
- `onClick`: Function
- `disabled`: Boolean
- `loading`: Boolean (shows spinner)
- `icon`: React element
- `className`: Additional classes

### SecondaryButton
Outlined button for secondary actions.

```jsx
<SecondaryButton onClick={handleCancel}>
  Cancel
</SecondaryButton>
```

### DangerButton
Red button for destructive actions.

```jsx
<DangerButton onClick={handleDelete}>
  Delete Account
</DangerButton>
```

### TextButton
Minimal text-only button.

```jsx
<TextButton onClick={handleSkip}>
  Skip
</TextButton>
```

---

## 📇 Cards

### Card
Base card component with hover effect option.

```jsx
import { Card } from './components/ui/Card'

<Card className="p-6">
  Content here
</Card>

<Card hover className="p-6">
  Hoverable card
</Card>
```

### StatCard
Pre-built dashboard stat card.

```jsx
import { StatCard } from './components/ui/Card'
import { CheckCircle } from 'lucide-react'

<StatCard
  title="Total Videos"
  value="47"
  change="+8 this week"
  trend="up"
  color="coral"
  icon={<CheckCircle className="w-7 h-7 text-white" />}
/>
```

**Props:**
- `title`: string
- `value`: string | number
- `change`: string (optional)
- `trend`: 'up' | 'down' | 'neutral'
- `color`: 'coral' | 'teal' | 'purple' | 'gold' | 'red' | 'green'
- `icon`: React element

---

## 📝 Inputs

### Input
Text input with label, icon, and error support.

```jsx
import { Input } from './components/ui/Input'
import { Mail } from 'lucide-react'

<Input
  label="Email Address"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  icon={<Mail className="w-5 h-5" />}
  error={emailError}
/>
```

### Textarea
Multi-line text input.

```jsx
import { Textarea } from './components/ui/Input'

<Textarea
  label="Description"
  placeholder="Tell us more..."
  rows={4}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>
```

### Select
Dropdown select input.

```jsx
import { Select } from './components/ui/Input'

<Select label="Age Range" value={age} onChange={(e) => setAge(e.target.value)}>
  <option value="">Select age...</option>
  <option value="0-3">Toddler (0-3)</option>
  <option value="4-6">Preschool (4-6)</option>
</Select>
```

---

## 🏷️ Badges

### Badge
Status badge with color variants.

```jsx
import { Badge } from './components/ui/Badge'

<Badge variant="safe">Safe</Badge>
<Badge variant="warning">Caution</Badge>
<Badge variant="danger">High Risk</Badge>
<Badge variant="neutral">Pending</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="purple">Premium</Badge>
```

**Sizes:** `sm`, `md` (default), `lg`

### ScoreBadge
Automatic safety score badge (0-100).

```jsx
import { ScoreBadge } from './components/ui/Badge'

<ScoreBadge score={15} />  // Shows "Safe" (green)
<ScoreBadge score={50} />  // Shows "Caution" (yellow)
<ScoreBadge score={75} />  // Shows "High Risk" (red)
```

**Logic:**
- 0-39: Safe (green)
- 40-69: Caution (yellow)
- 70-100: High Risk (red)

---

## 🪟 Modal

Animated overlay modal dialog.

```jsx
import { Modal } from './components/ui/Modal'
import { useState } from 'react'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
        size="md"
      >
        <p>Are you sure you want to proceed?</p>
        <div className="flex gap-4 mt-6">
          <PrimaryButton onClick={handleConfirm}>
            Confirm
          </PrimaryButton>
          <SecondaryButton onClick={() => setIsOpen(false)}>
            Cancel
          </SecondaryButton>
        </div>
      </Modal>
    </>
  )
}
```

**Props:**
- `isOpen`: boolean
- `onClose`: function
- `title`: string (optional)
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full'
- `hideClose`: boolean (hide X button)

---

## 🧭 Layout Components

### Navbar
Top navigation with profile dropdown menu.

```jsx
import { Navbar } from './components/layout/Navbar'

<Navbar>
  {/* Navigation items */}
  <a href="#" className="px-4 py-2 text-[#2A3D66] font-medium">
    Dashboard
  </a>
  <a href="#" className="px-4 py-2 text-[#2A3D66] font-medium">
    Videos
  </a>
</Navbar>
```

**Features:**
- Logo with gradient icon
- Mobile-responsive menu
- Profile dropdown (automatic)
  - Profile Settings
  - Membership
  - Settings
  - Sign Out
- Closes on outside click

### AppLayout
Complete page layout wrapper.

```jsx
import { AppLayout } from './components/layout/AppLayout'

function MyPage() {
  return (
    <AppLayout
      navItems={
        <>
          <a href="#">Dashboard</a>
          <a href="#">Videos</a>
        </>
      }
    >
      {/* Page content */}
      <h1>Welcome</h1>
    </AppLayout>
  )
}
```

**Features:**
- Includes Navbar
- Max-width container (7xl)
- Consistent padding
- Cream background

---

## 📊 Example: Dashboard Page

Complete example using the component library:

```jsx
import { AppLayout } from './components/layout/AppLayout'
import { StatCard, Card } from './components/ui/Card'
import { PrimaryButton, SecondaryButton } from './components/ui/Button'
import { Badge, ScoreBadge } from './components/ui/Badge'
import { CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  return (
    <AppLayout
      navItems={
        <>
          <a href="#" className="px-4 py-2 text-[#FF9C8A] font-medium">
            Dashboard
          </a>
          <a href="#" className="px-4 py-2 text-[#2A3D66] font-medium">
            Videos
          </a>
        </>
      }
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#2A3D66]">Dashboard</h1>
            <p className="text-lg text-[#6B7280] mt-2">
              Welcome back! Here's your video safety overview.
            </p>
          </div>
          <PrimaryButton onClick={() => {}}>
            Analyze Video
          </PrimaryButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Videos"
            value="47"
            change="+8 this week"
            trend="up"
            color="purple"
            icon={<TrendingUp className="w-7 h-7 text-white" />}
          />
          <StatCard
            title="Safe Content"
            value="31"
            change="66% of total"
            trend="neutral"
            color="green"
            icon={<CheckCircle className="w-7 h-7 text-white" />}
          />
          <StatCard
            title="Red Flags"
            value="4"
            change="Needs attention"
            trend="down"
            color="red"
            icon={<AlertTriangle className="w-7 h-7 text-white" />}
          />
        </div>

        {/* Recent Videos */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-[#2A3D66] mb-4">
            Recent Analyses
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl">
              <div className="flex-1">
                <p className="font-medium text-[#2A3D66]">
                  Educational Video for Kids
                </p>
                <p className="text-sm text-[#6B7280]">2 hours ago</p>
              </div>
              <ScoreBadge score={15} />
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
```

---

## 🎯 Best Practices

### 1. **Consistent Spacing**
Use Tailwind's spacing scale: `gap-4`, `gap-6`, `gap-8`, `gap-12`

### 2. **Responsive Design**
Always use responsive breakpoints:
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
```

### 3. **Color Usage**
- **Coral**: Primary actions, CTAs
- **Teal**: Analysis complete, trust signals
- **Purple**: Premium features, user profiles
- **Gold**: Warnings, attention needed
- **Red**: Dangerous content, errors
- **Green**: Safe content, success

### 4. **Typography Hierarchy**
```jsx
<h1 className="text-4xl font-bold text-[#2A3D66]">  {/* Page title */}
<h2 className="text-2xl font-bold text-[#2A3D66]">  {/* Section title */}
<p className="text-lg text-[#6B7280]">              {/* Body text */}
<p className="text-sm text-[#6B7280]">              {/* Small text */}
```

### 5. **Accessibility**
- All buttons have min-height: 44px (touch-friendly)
- Modal traps focus and closes on backdrop click
- Inputs have proper labels
- Color contrast meets WCAG AA standards

---

## 🚀 Component Status

| Component | Status | Mobile | Animations |
|-----------|--------|--------|------------|
| PrimaryButton | ✅ Ready | ✅ Yes | ✅ Yes |
| SecondaryButton | ✅ Ready | ✅ Yes | ✅ Yes |
| DangerButton | ✅ Ready | ✅ Yes | ✅ Yes |
| Card | ✅ Ready | ✅ Yes | ✅ Optional |
| StatCard | ✅ Ready | ✅ Yes | ✅ Yes |
| Input | ✅ Ready | ✅ Yes | ❌ No |
| Textarea | ✅ Ready | ✅ Yes | ❌ No |
| Select | ✅ Ready | ✅ Yes | ❌ No |
| Badge | ✅ Ready | ✅ Yes | ❌ No |
| ScoreBadge | ✅ Ready | ✅ Yes | ❌ No |
| Modal | ✅ Ready | ✅ Yes | ✅ Yes |
| Navbar | ✅ Ready | ✅ Yes | ✅ Yes |
| AppLayout | ✅ Ready | ✅ Yes | ❌ No |

---

## 📱 Mobile Optimization

All components are mobile-first and include:
- Touch-friendly sizes (min 44px)
- Responsive breakpoints
- Readable text sizes
- Proper spacing for thumbs
- Mobile menu for navigation

---

## 🎨 Framer Motion

Components using animations:
- All buttons (scale on hover/tap)
- Modal (fade + slide)
- StatCard (lift on hover)
- Navbar dropdown (fade + slide)

Animations are **subtle and calm** - perfect for parent-focused UX.

---

## 🔧 Customization

All components accept additional `className` props for customization:

```jsx
<PrimaryButton className="w-full text-xl">
  Custom Styling
</PrimaryButton>
```

---

## 📦 Dependencies

```json
{
  "framer-motion": "^11.x",
  "lucide-react": "^0.x",
  "tailwindcss": "^3.x"
}
```

---

## 🎯 Next Steps

1. Test the VideoHistory dashboard at http://localhost:5174
2. Use components in your existing Dashboard
3. Create additional pages using AppLayout
4. Customize colors in your tailwind.config.js if needed

Enjoy building with the Video Safety Component Library! 🚀
