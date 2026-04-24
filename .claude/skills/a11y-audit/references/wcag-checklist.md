# WCAG 2.1 AA Checklist — TravelHub

This checklist covers the WCAG 2.1 AA criteria most relevant to an Angular 20 / Ionic 8
single-page application. Criteria that are not applicable to this tech stack (e.g., audio/video
captions) are excluded.

Conformance target: **WCAG 2.1 Level AA**

---

## Principle 1 — Perceivable

| Criterion | Level | Summary | Relevant check |
|---|---|---|---|
| **1.1.1** Non-text Content | A | All non-text content has a text alternative | CHECK-01, CHECK-03 |
| **1.3.1** Info and Relationships | A | Information conveyed visually is also in code | CHECK-02, CHECK-05, CHECK-07 |
| **1.3.3** Sensory Characteristics | A | Instructions don't rely on shape, color, or location alone | Manual |
| **1.3.4** Orientation | AA | Content not locked to portrait/landscape | Manual (Capacitor) |
| **1.3.5** Identify Input Purpose | AA | Form fields identify their purpose (autocomplete) | Inputs |
| **1.4.1** Use of Color | A | Color not the only way to convey information | Manual |
| **1.4.3** Contrast (Minimum) | AA | Normal text ≥ 4.5:1, large text ≥ 3:1 | CHECK-10 |
| **1.4.4** Resize Text | AA | Text resizes to 200% without loss of content | Manual |
| **1.4.10** Reflow | AA | Content reflows at 320 CSS px width, no 2D scroll | Manual |
| **1.4.11** Non-text Contrast | AA | UI components/graphics ≥ 3:1 | CHECK-08 |
| **1.4.13** Content on Hover/Focus | AA | Hoverable content dismissible and persistent | Manual |

### 1.3.5 Autocomplete — input purpose reference

For login and registration forms, `<ion-input>` should carry `autocomplete` attribute:

| Field | `autocomplete` value |
|---|---|
| Email | `email` |
| Password (login) | `current-password` |
| Password (register) | `new-password` |
| Full name | `name` |

---

## Principle 2 — Operable

| Criterion | Level | Summary | Relevant check |
|---|---|---|---|
| **2.1.1** Keyboard | A | All functionality operable by keyboard | Manual |
| **2.1.2** No Keyboard Trap | A | Keyboard focus never trapped | Modal/overlay check |
| **2.4.1** Bypass Blocks | A | Skip navigation link to main content | Manual |
| **2.4.2** Page Titled | A | Pages have descriptive titles | Title service check |
| **2.4.3** Focus Order | A | Focus order preserves meaning | Manual |
| **2.4.4** Link Purpose | A | Link purpose clear from context | CHECK-01 |
| **2.4.6** Headings and Labels | AA | Headings and labels describe topic | CHECK-07 |
| **2.4.7** Focus Visible | AA | Keyboard focus indicator visible | CHECK-08 |

### 2.4.2 Angular page titles

Angular must update `document.title` on route changes. Check `app-routing.module.ts` for
`title` property on route configs:

```typescript
// VIOLATION: route with no title
{ path: 'propertydetail/:id', component: PropertydetailPage }

// Correct
{ path: 'propertydetail/:id', component: PropertydetailPage, title: 'Property Details — TravelHub' }
```

### 2.1.1 Focus trap in modals

`th-datetime-modal` and `ion-alert` must trap focus within the overlay when open and return
focus to the trigger element on close. Ionic handles this for `ion-alert` natively. Verify
`th-datetime-modal` uses `ion-modal` (which includes focus trap) or implements it manually.

---

## Principle 3 — Understandable

| Criterion | Level | Summary | Relevant check |
|---|---|---|---|
| **3.1.1** Language of Page | A | Page lang attribute set | `index.html` |
| **3.2.1** On Focus | A | No context change on focus | Manual |
| **3.2.2** On Input | A | No context change on input without warning | Manual |
| **3.3.1** Error Identification | A | Errors identified in text | Form error states |
| **3.3.2** Labels or Instructions | A | Labels or instructions for user input | CHECK-02 |
| **3.3.3** Error Suggestion | AA | Error messages include suggestions | Form errors |
| **3.3.4** Error Prevention | AA | Submissions with legal/financial consequences are reversible | Booking flow |

### 3.1.1 Language attribute

Check `user_interface/src/index.html`:
```html
<!-- Must have lang attribute -->
<html lang="en">
```

### 3.3.1 Error states in th-input

`th-input.component.html` supports a `state` property and `helper` text. Verify:
1. Error state sets a visible error color
2. Error text is visible below the input
3. Error is programmatically associated (not just color-coded)

The current implementation uses CSS class changes (`th-input--error`) but the error message
in `helper` is a `<p>` tag not linked to the input via `aria-describedby`. This is a violation.

---

## Principle 4 — Robust

| Criterion | Level | Summary | Relevant check |
|---|---|---|---|
| **4.1.1** Parsing | A | Valid HTML, no duplicate IDs | Static |
| **4.1.2** Name, Role, Value | A | UI components have accessible name, role, value | CHECK-01, CHECK-02, CHECK-06 |
| **4.1.3** Status Messages | AA | Status messages announced without focus | CHECK-04 |

### 4.1.3 Status messages — complete list

All async operations in this app must announce completion to AT users. Affected flows:
- Hotel search results loading (home + search-results pages)
- Property detail loading
- Booking submission (`isBooking` loading state)
- Login/register form submission
- Any filter change that updates results

Pattern required for each:
```html
<div role="status" aria-live="polite" aria-atomic="true">
  <span *ngIf="isLoading">Loading results, please wait…</span>
  <span *ngIf="!isLoading && !error">{{ resultCount }} hotels found</span>
</div>
```

---

## Quick reference — Ionic/Angular specific patterns

### aria-hidden on ion-icon

All `<ion-icon>` that are decorative (next to text) MUST have `aria-hidden="true"`.
All `<ion-icon>` in icon-only buttons MUST have `aria-hidden="true"` (aria-label lives on
the button, not the icon).

```html
<!-- Decorative (beside text) -->
<ion-icon name="star" aria-hidden="true"></ion-icon> 4.5

<!-- Icon-only button: aria-label on button, aria-hidden on icon -->
<ion-button aria-label="Add to favorites">
  <ion-icon name="heart-outline" aria-hidden="true"></ion-icon>
</ion-button>
```

### ion-input label association

Ionic's `ion-input` does NOT automatically associate a sibling `<label>` element. Use one
of these patterns:

```html
<!-- Pattern A: slot="label" (Ionic 7+) -->
<ion-input>
  <div slot="label">Email</div>
</ion-input>

<!-- Pattern B: aria-label directly on ion-input -->
<ion-input aria-label="Email" [placeholder]="placeholder"></ion-input>

<!-- Pattern C: aria-labelledby pointing to a visible label -->
<label id="email-label">Email</label>
<ion-input aria-labelledby="email-label"></ion-input>
```

### Skip navigation

Angular SPAs must provide a skip link for keyboard users:

```html
<!-- In app.component.html, FIRST element in body -->
<a class="skip-link" href="#main-content">Skip to main content</a>
<main id="main-content">
  <router-outlet></router-outlet>
</main>
```

```scss
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  &:focus {
    top: 0;
    z-index: 9999;
  }
}
```
