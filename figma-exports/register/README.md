# Register Component

Register page component transcribed from Figma design for Happy Dreamers application.

## Design Source
- **Figma URL**: https://www.figma.com/design/uTYTC6mqGDZaKcHJ7nn47r/Zuli--Happy-Dreamers---Copy-?node-id=75-647&t=4cUohUWPbMwE8a6Q-0
- **Frame**: Register (Node ID: 75-647)

## Features

- ✅ Exact transcription from Figma design
- ✅ Fully responsive design (Mobile, Tablet, Desktop)
- ✅ Form validation and state management
- ✅ Password visibility toggle
- ✅ Terms and conditions checkbox
- ✅ Google signup integration ready
- ✅ Accessibility features (focus states, reduced motion support)
- ✅ Dark mode support
- ✅ High contrast mode support
- ✅ TypeScript support
- ✅ Touch device optimizations

## Usage

```tsx
import { Register } from '@/figma-exports/register';

export default function RegisterPage() {
  return <Register />;
}
```

## Demo

```tsx
import { RegisterDemo } from '@/figma-exports/register';

export default function DemoPage() {
  return <RegisterDemo />;
}
```

## Form Fields

- **Full Name** (required) - Text input with user icon
- **Email** (required) - Email input with mail icon  
- **Password** (required) - Password input with lock icon and visibility toggle
- **Confirm Password** (required) - Password confirmation with visibility toggle
- **Terms acceptance** (required) - Checkbox with links to Terms of Service and Privacy Policy

## Design Elements

### Colors (from Figma)
- **Background**: Linear gradient from `#68A1C8` to `#3993D1`
- **Form background**: `#EFFFFF` (light mint)
- **Input background**: `#DEF1F1` (light blue-green)
- **Primary button**: `#68A1C8` (blue)
- **Secondary button**: `#A0D8D0` (light teal)
- **Text colors**: `#374151`, `#6B7280`, `#4B5563`

### Typography (from Figma)
- **Title font**: Ludicrous (48px, bold)
- **Body font**: Century Gothic (13px)
- **Consistent with design system**

### Layout
- **Desktop**: Two-column layout (logo left, form right)
- **Mobile**: Single column with optional back button
- **Form card**: Rounded corners (20px), shadow, centered

## Responsive Breakpoints

- **Mobile**: < 640px (single column, optimized touch targets)
- **Tablet**: 641px - 1024px (centered form, medium sizing)
- **Desktop**: > 1025px (two-column layout, full features)
- **Large Desktop**: > 1440px (enhanced spacing and sizing)

## Styling

The component uses a combination of:
- **Tailwind CSS classes** for rapid development (matching dashboard pattern)
- **CSS Modules** for enhanced responsive behavior and animations
- **Inline styles** for Figma-specific colors and fonts

### Key Features:
- Smooth transitions and hover effects
- Focus states for accessibility
- Loading states support
- Touch device optimizations
- Print styles
- Reduced motion support

## Form Validation

- All fields are required
- Email validation built-in
- Password confirmation matching (can be implemented)
- Terms acceptance required to enable submit button
- Form state management with React hooks

## Accessibility

- Proper form labels and associations
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- High contrast mode support
- Reduced motion preferences

## Integration Notes

- Uses `@/components/ui/button` component (following project patterns)
- Uses Lucide React icons for consistency
- Ready for form submission handler integration
- Prepared for API integration
- Error handling can be easily added

## Customization

The component accepts a `className` prop for additional styling:

```tsx
<Register className="custom-register-styles" />
```

## Future Enhancements

- [ ] Form validation error messages
- [ ] Loading states during submission
- [ ] Success/error notifications
- [ ] Google OAuth integration
- [ ] Password strength indicator
- [ ] Email verification flow
