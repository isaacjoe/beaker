/*
This uses the beakerBookmarks API, which is exposed by webview-preload to all
sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'

// globals
// =

var builtinPages = [
  { href: 'beaker:history', label: 'History', icon: 'back-in-time' },
  { href: 'beaker:bookmarks', label: 'Bookmarks', icon: 'bookmarks' },
  { href: 'beaker:downloads', label: 'Downloads', icon: 'down' },
  { href: 'beaker:settings', label: 'Settings', icon: 'cog' }
]

var bookmarks, pinnedBookmarks

co(function* () {
  bookmarks = (yield beakerBookmarks.list()) || []
  pinnedBookmarks = (yield beakerBookmarks.listPinned()) || []
  renderPinned()
})

// rendering
// =

function renderPinned () {
  yo.update(document.querySelector('.pinned-wrapper'), yo`
    <div class="pinned-wrapper">
      <div class="pinned">
        ${builtinPages.map(renderPinnedItem)}
        ${pinnedBookmarks.map(renderPinnedBookmark)}
        <div class="pinned__item" onclick="addPinnedSite">
          <div class="pinned__item-square transparent pin-site" onclick=${renderPinSiteForm}>
            <i class="icon icon-plus" aria-hidden="true"></i>
          </div>
        </div>
      </div>
      <div class="links">
        <a onclick=${renderBookmarks}>
          <span>Bookmarks</span>
          <i class="icon icon-down-open"></i>
        </a>
        <a>
          <span>Pin a site</span>
          <i class="icon icon-plus"></i>
        </a>
      </div>
    </div>`)
}

function renderBookmarks () {
  const renderRow = (row, i) =>
    yo`
      <li class="ll-row bookmarks__row" data-row=${i}>
        <a class="ll-link bookmark__link" href=${row.url} title=${row.title} />
          <img class="bookmark__favicon" src=${'beaker-favicon:' + row.url} />
          <span class="bookmark__title">${row.title}</span>
        </a>
      </li>`

  yo.update(
    document.querySelector('.bookmarks-wrapper'),
      yo`
        <div class="bookmarks-wrapper">
          <ul class="links-list bookmarks">
            ${bookmarks.map(renderRow)}
          </ul>
        </div>`)
}

function renderPinnedItem (item) {
  // render items
  var { href, label, icon } = item

  return yo`
    <a class="pinned__item" href=${href}>
      <div class="pinned__item-square">
        <i class="icon icon-${icon}" aria-hidden="true"></i>
      </div>
      <div class="pinned__item-label">${label}</div>
    </a>`
}

function renderPinnedBookmark (bookmark) {
  var { url, title } = bookmark

  return yo`
    <a class="pinned__item" href=${url}>
      <div class="pinned__item-square">
        <img class="icon" src=${'beaker-favicon:' + url} />
      </div>
    <button label="Unpin ${url}" data-url=${url} onclick=${unpinSite} class="icon icon-cancel"></button>
    <div class="pinned__item-label ellipsis">${title}</div>
    </a>`
}

function renderPinSiteForm (url, title) {
  renderBookmarks()

  document.querySelector('.pinned').append(yo`
    <form id="add-pinned-site" onsubmit=${pinSite}>
      <legend>Add a new site or select a bookmark</legend>
      <input name="url" type="text" placeholder="https://example.com" required />
      <input type="submit">
    </form>`)

  document.querySelector('input[name="url"]').focus()
  document.querySelector('.pin-site').style.display = 'none'
}

function pinSite (e) {
  e.preventDefault()

  var form = document.getElementById('add-pinned-site')
  var {url, title} = form.elements

  beakerBookmarks.add(url.value, title.value, 1)

  beakerBookmarks.listPinned().then(pinned => {
    pinnedBookmarks = pinned
    renderPinned()
  })

  document.querySelector('.pinned-wrapper').removeChild(form)
}

function unpinSite (e) {
  e.preventDefault()
  beakerBookmarks.togglePinned(e.target.dataset.url, true)

  beakerBookmarks.listPinned().then(pinned => {
    pinnedBookmarks = pinned
    renderPinned()
  })
}
