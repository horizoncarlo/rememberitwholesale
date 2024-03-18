# TODO
X- Remember scroll position between refreshes, such as deleting something far down the list
X- Leading space on Fields on prod
X- Show current favorite in template dialog?
X- Update history with add/edit dialog calls, so that Back on mobile keyboard closes the dialog. Or just a way to hook into Back normally?
X- Hold on row to edit possible? Touch events?
X- visibilitychange listener to refresh page if on mobile and resuming focus? Not sure if updates are coming through when turning phone off and back on and going to the page
X- Quick view dialog should have an edit button on it too
X- When changing template while editing a Thing, if a field ID matches between the two templates, copy our content over (specifically useful for Notes field)
X- Mousewheel doesn't work in text area in Edit Thing - something with auto-resize? Same with trying to pan on mobile with it
X- Select text when clicking the Autocomplete dropdown arrow, or the field? Need to make it faster to find the Template you want in template-dropdown
- Labels to top of Thing input fields (on mobile) instead of to the left where they use too much space
- Autoparse links in rendered Notes on View
- Change rendered fields in the quick view dialog to be more spaced out? Put headers and breaklines instead of commas to separate multiple fields?
  - Maybe get fields renderable as HTML/Markdown and then do this?

- Rich text / basic HTML editor/formatter for Thing? Or just Markdown?

- Finish Demo account data

- Reports with custom queries to generate, as well as charts (could be using ChartModule from PrimeNG)
  - Definitely just start with basic queries to get data and numbers, since we'll be using that for charts so having the text first is valuable and simpler

- Try signals and NgRx data store for sharing between parts of app using Ang 17
- Do a proper pass and componentize any elements that need it
  - Also make sure existing components are "standalone: true" where possible (or at least consistent)
  - Such as menu dial, including it's drag and drop features, table itself maybe?
- Have a "looking back" / "remember this?" feature that shows you memories from the same time X months/years ago, sort of like Facebook. Toggleable option of course
- Self signed HTTPS certificate, and try to do native mobile push notifications for reminders?
- Have an "annual repeat" feature for reminders, likely don't want more granular as we're not intending to be a full scheduling app. Mainly for birthdays
- Eventually segment data files by year? To prevent giant files of 10k+ records? Then date limit filter could integrate with that (by having like 2021, 2022, etc. instead of "2 years ago")
- Allow changing of Themes?

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
- An autosizing text area inside a scrollable dialog causes the dialog to jump positions - see the Add Thing dialog with a complicated enough Template

- Would be nice to not have to manually set `tooltipPosition="left"` (or bottom) in cases where the tooltip is smooshed along the right edge. Seems to autocalculate for some but not all

- Table Ctrl+A fails with [rows] defined
  - **FILED** - https://github.com/primefaces/primeng/issues/14634

- Speed Dial has an overlay that extends below the visible button by 44px
  - **FILED** - they marked WONTFIX: https://github.com/primefaces/primeng/issues/14330
  - Inspect around the Speed Dial to see
  - This blocks the Selected Rows clear button when a reminder is present (as the table gets pushed down and becomes below the overlay)
  - A hacky solution could be to move the dial down when the Reminders are shown, but the view would jump and it's a lot of math if we have multiple reminders

- PrimeNG is only free for the latest version, afterwards previous versions move to LTS which is paid. So forced to keep up to date.
  - See https://primeng.org/lts
