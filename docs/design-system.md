# GauShilp OS — Design System Specifications

## 1. Visual Specification (from Reference Image)

The visual design system of GauShilp OS is designed to present a modern, luminous, and soft lavender-and-indigo appearance with high-contrast typography, crisp borders, and refined gradients.

---

## 2. Color Palette & Tokens

### Primary Palette
| Token Variable | Hex Code | Reference Usage |
| :--- | :--- | :--- |
| `--color-primary` | `#5B5CE2` | Primary brand color, links, active states, lotus logo petals |
| `--color-primary-deep` | `#4445C8` | Deep indigo gradient stop, pressed button states |
| `--color-primary-gradient` | `linear-gradient(135deg, #6264EE 0%, #4A4BCB 100%)` | Primary action buttons (`Sign in →`, `Create account →`) |
| `--color-bg-lavender` | `linear-gradient(135deg, #F7F8FF 0%, #ECEEFF 50%, #F5F3FF 100%)` | Main application background |
| `--color-surface-white` | `#FFFFFF` | Authentication cards, dashboard KPI cards, inputs |
| `--color-text-main` | `#20233C` | Primary dark navy headings and body text |
| `--color-text-secondary` | `#747894` | Muted supporting copy, placeholders, timestamps |
| `--color-border` | `#E4E6F4` | Crisp light lavender borders on cards, inputs, and dividers |
| `--color-accent-orange` | `#FF9C43` | Heritage highlights, pending orders, rating stars |
| `--color-accent-teal` | `#23B9AF` | Dispatched status, ecological indicators |
| `--color-success` | `#18845A` | Success messages, delivered status, healthy services |

### Dark Navy Navigation Palette
| Token Variable | Hex Code | Reference Usage |
| :--- | :--- | :--- |
| `--sidebar-bg` | `linear-gradient(180deg, #181A32 0%, #121426 100%)` | Left dashboard navigation bar |
| `--sidebar-active-pill` | `#5B5CE2` | Active item pill background |
| `--sidebar-text` | `#A0A4C8` | Inactive menu labels |
| `--sidebar-text-active` | `#FFFFFF` | Active menu labels |

---

## 3. Typography & Spacing
- **Font Family**: Modern clean sans-serif (`var(--font-jakarta)` or system sans-serif fallback).
- **Headings**:
  - `h1`: 2.25rem (36px), font-weight: 800, line-height: 1.2
  - `h2`: 1.75rem (28px), font-weight: 800, line-height: 1.25
  - `h3`: 1.25rem (20px), font-weight: 700, line-height: 1.3
- **Body & Inputs**:
  - Regular: 0.92rem (14.7px), font-weight: 400
  - Semi-bold: 0.92rem (14.7px), font-weight: 600
  - Small: 0.78rem (12.5px), font-weight: 500

---

## 4. Surfaces, Radii & Elevation
- **Card Radius**: `16px–20px` (`--radius-card`)
- **Button / Input Radius**: `10px–12px` (`--radius-input`)
- **Pill Badges**: `9999px` (`--radius-pill`)
- **Card Shadow**: `0 4px 20px -2px rgba(32, 35, 60, 0.06), 0 2px 6px -1px rgba(32, 35, 60, 0.04)`
- **Button Shadow**: `0 4px 14px rgba(91, 92, 226, 0.32)`
