# TODO
- Mentioned before but Template Editing would be nice
- Better support for ebook sharing? Maybe just improvements to normal sharing, such as being searchable on the public page. See https://smoores.dev/post/announcing_smoores_epub/
- Use Fuse.js for fuzzy search for the main search bar / global search?

- Need a better and smoother and less manual process for deploying the app to prod environment
- Update Readme with file sharing feature notes
  - Also a few screenshots of the app in general
- Allow for multi-session log ins, instead of a single token? Would be nice for desktop to mobile swapping
- Faster way to transfer files, similar to Favorites concept
  - Could move Add Thing dialog to a FormControl and have a couple different paths to decide what to render instead of a bunch of toggled flags
  - Maybe do as part of the Favorite dialog?
- Let the user customize public attachments page with options outlined in TTODO in the public CSS - just store choices in local storage
- Do a "select images for download" button where you can check/select images and get a ZIP of them, instead of just Download All
- Double click on desktop to edit a Thing row immediately?
- Put an app version scheme somewhere, and show on Profile dialog?
- Allow Edit of Templates - doesn't retroactively change Thing data, just going forward uses the new version
- Touch to edit cancel the timer on touch move so that slow scrolling doesn't trigger it?
- Lazy loading pagination to allow all time but less bandwidth when just on first page?
- Add an undo / trash can for deleted Things that can be restored and auto-delete after X days?
- Consider whether PrimeNG can act like a native <select> on device mobile where the full list of options is shown as a built in popup - might be nicer
- What about a "pin" concept that keeps a certain Thing at the top of the list regardless of sorting (almost like a Star in Gmail)
- Reference other Things dynamically with a link in a textbox? Like a PR reference in a bug tracking system
- Save inputs as local storage or something? Because if a save of a Thing fails the inputs end up cleared which is crazy frustrating
- Look at navigator.share feature https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share which allows for easy mobile sharing to built-in targets

### Unfortunate Version Churn
- Update Angular and PrimeNG
- Split package.json for Angular and Node project instead of having them combined

## OLDER NOTES
- * Finish Demo account data

- Reports with custom queries to generate, as well as charts (could be using ChartModule from PrimeNG)
  - Definitely just start with basic queries to get data and numbers, since we'll be using that for charts so having the text first is valuable and simpler
- Self signed HTTPS certificate, and try to do native mobile push notifications for reminders? Also needed for copyToClipboard functionality
  - Also for HTTPS: On desktop, have a way to paste an image directly into upload? (like Copy Image from the browser and Ctrl+P paste)

- Try signals and NgRx data store for sharing between parts of app using Ang 17
- Do a proper pass and componentize any elements that need it
  - Also make sure existing components are "standalone: true" where possible (or at least consistent)
  - Such as menu dial, including it's drag and drop features, table itself maybe?
- Have a "looking back" / "remember this?" feature that shows you memories from the same time X months/years ago, sort of like Facebook. Toggleable option of course
- Have an "annual repeat" feature for reminders, likely don't want more granular as we're not intending to be a full scheduling app. Mainly for birthdays
- Eventually segment data files by year? To prevent giant files of 10k+ records? Then date limit filter could integrate with that (by having like 2021, 2022, etc. instead of "2 years ago")
- Basic calendar view that translates Dates from Things onto it?
- Probably could rewrite to use https://github.com/typicode/lowdb instead of manual JSON files?

- Cap max storage size of /uploads/ file by user, default a value in their settings under the hood, but also can manually change in the filesystem directly (no endpoint or overall admin thing needed)
  - Not huge priority given the user count
  - Can show this in the User Profile dialog?
  - Maybe use an npm package like `du` instead of recursively checking folders/files manually?

## LOADING
- Block entire page, header and all, with a spinner in the middle (after a couple seconds, to prevent flashing)
  - This is while we're getting the user settings and so on
    - "isInitialized"
- Remember to use 'cursor: wait' styling

- Progress bar should always show, for ALL loading
  - Maybe a general "has any loading" feature that combines our various rxjs to one result?

- Has a per-service init & loading flags: things for refresh button, templates for Manage X Templates, etc.
  - tableLoading ties to this (blocks main table, but keeps header, equivalent to current things.loading)
- Each service registers themselves in loadingService

- Should also disable or use the "loading" attribute of a lot of buttons we want to avoid exposing while something is happening

- Have specific utility calls, like "top right spinner on/off", that hide the logic in the loading service itself

## PRIMENG BUGS
- November 2024: Color picker (for adding a new Template) is broken in PrimeNG v17.x, see https://github.com/primefaces/primeng/issues/16586

- An autosizing text area inside a scrollable dialog causes the dialog to jump positions - see the Add Thing dialog with a complicated enough Template
  - For example typing in a Notes textarea on a Thing that is long enough to cause the dialog content to scroll - this will make the dialog scroll jump to the top when typing

- Would be nice to not have to manually set `tooltipPosition="left"` (or bottom) in cases where the tooltip is smooshed along the right edge. Seems to autocalculate for some but not all

- Could use <p-iconField and <p-inputIcon from v17.3, but they require an up to date theme to style properly, which means we'd have to drop Lara v16 and go to the washed out v17 version
  - Likely will end up having to eventually as components are added/changed, but going to try to resist for a while

- Speed Dial has an overlay that extends below the visible button by 44px
  - **FILED** - they marked WONTFIX: https://github.com/primefaces/primeng/issues/14330
  - Inspect around the Speed Dial to see
  - This blocks the Selected Rows clear button when a reminder is present (as the table gets pushed down and becomes below the overlay)
  - A hacky solution could be to move the dial down when the Reminders are shown, but the view would jump and it's a lot of math if we have multiple reminders

- PrimeNG is only free for the latest version, afterwards previous versions move to LTS which is paid. So forced to keep up to date.
  - See https://primeng.org/lts
