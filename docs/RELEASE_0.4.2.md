# ImmersiveGroups 0.4.2

This release reworks the image galleries and fixes several mobile display problems.

## Galleries

- Character, persona, General and group galleries share one layout. Selecting an image opens a details panel for its command name and scene description, replacing the old text prompts. On phones the panel opens as a bottom sheet.
- Gallery tiles work with the keyboard. Search, named/unnamed filters and a remembered sort order help in larger folders.
- Select mode names, unnames or deletes several images at once. Deleting files asks for confirmation. Removing a name can be undone.
- Renaming an image keeps its availability, bindings and the old name as an alias.
- In the unified library, less frequent tools are in a Manage menu, every card shows its scene description, other fields sit under Edit details, and long lists load in pages with Show more.
- In the quick image menu, double-click or Enter sends an image, the view toggle uses icons, and a Recent row lists recently shown images.

## Mobile

- Scene animations and background motion no longer restart when the browser toolbar hides or the on-screen keyboard opens. Only width or orientation changes count as a layout change, and background motion keeps its position while it adapts to the new height.
- Mobile sprites scaled above 100% no longer extend past the top of the screen. When the tallest sprite would not fit, all mobile sprites shrink by the same factor, keeping their relative heights. Vertical offsets are still in pixels, so existing tuning is unchanged.
- Mobile sprites and gallery windows size to the visible screen area rather than the area behind the browser toolbars.
- Gallery windows, the image viewer and the floating image button keep clear of notches and the home bar.
- Library type tabs and gallery captions are at least 11px on phones, and stage lock buttons are wider on touch screens.

The transfer format is unchanged. Notch and home-bar spacing was checked only in desktop browsers emulating phones, not on a physical iPhone.
