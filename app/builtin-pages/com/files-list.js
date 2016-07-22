import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'

export function renderArchives (archives, opts={}) {

  var head = ''
  if (opts.showHead) {
    head = yo`<div class="fl-head">
      <div class="fl-name">Name</div>
      <div class="fl-updated">Last Updated</div>
      <div class="fl-size">Size</div>
      <div class="fl-status">Status</div>
    </div>`
  }

  // render archives
  var archiveEls = []
  archives.forEach((archive, index) => {
    // is the selected archive?
    var isSelected = index === opts.selectedIndex

    // folder expanded/collapsed? icon
    let isOpen = !!archive.entries
    let icon = isOpen ? 'icon icon-down-dir' : 'icon icon-right-dir'
    icon = yo`<span class=${icon}></span>`

    // status column
    var status = ''
    if (archive.isDownloading)
      status = 'Downloading'
    else if (archive.isSharing)
      status = 'Sharing'

    // render row
    let title = archive.name||'Untitled'
    archiveEls.push(yo`<div class=${"fl-row archive"+(isSelected?' selected':'')}>
      <div class="fl-name">
        <div>
          <strong><a href=${'dat://'+archive.key} title=${title}>${title}</a></strong>
          ${archive.isOwner ? yo`<a href=${'view-dat://'+archive.key}><small class="icon icon-pencil">owner</small></a>` : ''}
          ${archive.isSubscribed ? yo`<a href=${'view-dat://'+archive.key}><small class="icon icon-eye"> watching</small></a>` : ''}
        </div>
        ${archive.description ? yo`<div>${archive.description}</div>` : ''}
      </div>
      <div class="fl-updated">${archive.mtime ? ucfirst(niceDate(archive.mtime)) : ''}</div>
      <div class="fl-size">${archive.size ? prettyBytes(archive.size) : ''}</div>
      <div class="fl-status">${status}</div>
    </div>`)
  })

  // render all
  return yo`<div class="files-list">
    ${head}
    <div class="fl-rows">
      ${archiveEls}
    </div>
  </div>`
}

export function entriesListToTree (archiveInfo) {
  var m = archiveInfo.manifest

  // root node is the archive itself
  var rootNode = {
    isOpen: true,
    entry: {
      type: 'directory',
      name: archiveInfo.name || '/',
      path: '/',
      key: archiveInfo.key
    }
  }

  // iterate the list, recurse the path... build the tree!
  archiveInfo.entries.forEach(e => addEntry(rootNode, splitPath(e.name), e))
  function addEntry (parent, path, entry) {
    // take a name off the path
    var name = path.shift()

    // add children if needed
    parent.children = parent.children || {}

    if (path.length === 0) {
      // end of path, add entry
      parent.children[name] = parent.children[name] || {} // only create if DNE yet
      parent.children[name].entry = entry
      parent.children[name].entry.path = entry.name
      parent.children[name].entry.name = name
    } else {
      // an ancestor directory, ensure the dir exists
      parent.children[name] = parent.children[name] || { entry: { type: 'directory', name: name } }
      // descend
      addEntry(parent.children[name], path, entry)
    }
  }

  return rootNode
}

export function archiveEntries (tree, opts={}) {
  // render the header (optional)
  var head = ''
  if (opts.showHead) {
    head = yo`<div class="fl-head">
      <div class="fl-name">Name <span class="icon icon-down-open-mini"></span></div>
      <div class="fl-updated">Last Updated</div>
      <div class="fl-size">Size</div>
    </div>`
  }

  // helper to render the tree recursively
  function renderNode (node, depth) {
    var els = []
    const isOpen = node.isOpen
    const entry = node.entry

    // only render if "above ground." (this is how we optionally skip rendering ancestors)
    if (depth >= 0) {

      // add spacers, for depth
      var spacers = []
      for (var i=0; i <= depth; i++)
        spacers.push(yo`<span class="spacer"></span>`)

      // type-specific rendering
      var link
      if (entry.type == 'directory') {
        // modify the last spacer to have an arrow in it
        let icon = isOpen ? 'icon icon-down-dir' : 'icon icon-right-dir'
        spacers[depth].appendChild(yo`<span class=${icon}></span>`)
        link = yo`<a href="">${entry.name}</a>`
      } else {
        link = yo`<a href="dat://${tree.entry.key}/${entry.path}">${entry.name}</a>`
      }

      // render self
      var isDotfile = entry.name.charAt(0) == '.'
      var onclick = opts.onToggleNodeExpanded && entry.type == 'directory' ? (e => opts.onToggleNodeExpanded(node)) : undefined
      els.push(yo`<div class=${'fl-row '+entry.type+(isDotfile?' dotfile':'')} onclick=${onclick}>
        <div class="fl-name">${spacers}${link}</div>
        <div class="fl-updated">${entry.mtime ? niceDate(entry.mtime) : ''}</div>
        <div class="fl-size">${entry.length ? prettyBytes(entry.length) : ''}</div>
      </div>`)
    }

    // render children
    if (node.children && isOpen) {
      const toObj = key => node.children[key]
      els = els.concat(Object.keys(node.children).map(toObj).sort(treeSorter).map(child => renderNode(child, depth + 1)))
    }

    // nothing rendered? put something in
    if (depth <= 0 && els.length === 0)
      els.push(yo`<div class="fl-row"><em>This folder is empty</em></div>`)

    return els
  }

  // render
  var startDepth = (opts.showRoot) ? 0 : -1 // start from -1 to skip root
  return yo`<div class="files-list">${head}<div class="fl-rows">${renderNode(tree, startDepth)}</div></div>`
}

function splitPath (str) {
  if (!str || typeof str != 'string') return []
  return str
    .replace(/(^\/*)|(\/*$)/g, '') // skip any preceding or following slashes
    .split('/')
}

function treeSorter (a, b) {
  // directories at top
  if (a.entry.type == 'directory' && b.entry.type != 'directory')
    return -1
  if (a.entry.type != 'directory' && b.entry.type == 'directory')
    return 1

  // by name
  return a.entry.name.localeCompare(b.entry.name)
}