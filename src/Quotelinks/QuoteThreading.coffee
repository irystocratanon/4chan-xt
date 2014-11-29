###
  <3 aeosynth
###

QuoteThreading =
  init: ->
    return unless Conf['Quote Threading'] and g.VIEW is 'thread'

    @enabled = true
    @controls = $.el 'span',
      <%= html('<label><input id="threadingControl" type="checkbox" checked> Threading</label>') %>

    input = $ 'input', @controls
    $.on input, 'change', @toggle

    Header.menu.addEntry @entry =
      el:    @controls
      order: 98

    Post.callbacks.push
      name: 'Quote Threading'
      cb:   @node

  force: ->
    g.posts.forEach (post) ->
      post.cb true if post.cb
    Unread.read()
    Unread.update()

  node: ->
    {posts} = g
    return if @isClone or not QuoteThreading.enabled or !@isReply or @isHidden

    keys = []
    len = g.BOARD.ID.length + 1
    keys.push quote for quote in @quotes when (quote[len..] < @ID) and quote of posts

    return unless keys.length is 1

    @threaded = keys[0]
    @cb       = QuoteThreading.nodeinsert

  nodeinsert: (force) ->
    post = g.posts[@threaded]

    return false if @thread.OP is post

    {posts} = Unread
    {root}  = post.nodes

    unless force
      height  = doc.clientHeight
      {bottom, top} = root.getBoundingClientRect()

      # Post is unread or is fully visible.
      return false unless posts[post.ID] or ((bottom < height) and (top > 0))

    if $.hasClass root, 'threadOP'
      threadContainer = root.nextElementSibling
      post = Get.postFromRoot $.x 'descendant::div[contains(@class,"postContainer")][last()]', threadContainer
      $.add threadContainer, @nodes.root

    else
      threadContainer = $.el 'div',
        className: 'threadContainer'
      $.add threadContainer, @nodes.root
      $.after root, threadContainer
      $.addClass root, 'threadOP'

    if post = posts[post.ID]
      posts.after post, posts[@ID]

    else if posts[@ID]
      posts.prepend posts[@ID]

    return true

  toggle: ->
    if QuoteThreading.enabled = @checked
      QuoteThreading.force()

    else
      thread = $('.thread')
      posts = []
      nodes = []
      
      g.posts.forEach (post) ->
        posts.push post unless post is post.thread.OP or post.isClone

      posts.sort (a, b) -> a.ID - b.ID

      nodes.push post.nodes.root for post in posts
      $.add thread, nodes

      containers = $$ '.threadContainer', thread
      $.rm container for container in containers
      $.rmClass post, 'threadOP' for post in $$ '.threadOP'

    return

  kb: ->
    control = $.id 'threadingControl'
    control.checked = not control.checked
    QuoteThreading.toggle.call control
