# Light and dark themes

The sun/moon button in the top bar changes the whole application immediately. Dark remains the default. The preference is saved on the device, survives sign-out and account switches, and synchronizes between tabs. A cookie provides the server-rendered preference; a small validated prepaint script also restores local storage without waiting for React.

Shared component colors live in `web/src/app/theme-tokens.css`. Existing component colors are mapped by their role (surface, text or border), so the original dark design is retained. Use semantic variables (`--background`, `--foreground`, `--card`, `--border`, `--muted`) for new components. Use `theme-on-accent` only on filled accent controls that must retain light text, never on page wrappers. Photos and intentional Offer gradient artwork retain their original colors. Dialogs and portals inherit the root theme.

Manual checks:

1. Use the top-bar sun button in either workspace. Confirm surfaces, navigation, text, inputs and calendars become light.
2. Open Analytics, Offers, notifications and a collaboration. Open an Offer editor or social connection modal; check controls and text remain readable.
3. Reload, navigate to a media kit or sign-in screen, and switch accounts. The preference should remain light.
4. Open another tab and change themes; both tabs should update. Switch back with the moon button.
5. Repeat at mobile width; the switch remains accessible in the header.

Automated validation uses `node --test tests/*.test.cjs` and `npx tsc --noEmit` from `web`. Theme tests cover prepaint preference validation and unavailable storage; local-data tests verify that account cache clearing preserves the preference.
