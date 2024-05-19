import $ from '../../platform/$';
import Icon from '../../Icons/icon';
import Linkify from '../Linkify';
import h, { type EscapedHtml, hFragment, isEscaped } from '../../globals/jsx';
import Time from '../../Miscellaneous/Time';
import CrossOrigin from '../../platform/CrossOrigin';
import { Conf } from '../../globals/globals';

export default function EmbedFxTwitter(a: HTMLAnchorElement): HTMLElement {
  const el = $.el('div', { innerHTML: '<blockquote class="twitter-tweet">Loading&hellip;</blockquote>' });
  const shouldTranslate: boolean = Conf['Translate non-English Tweets to English'];
  const shouldResolveReplies: boolean = Conf['Resolve Tweet Replies'];
  const shouldResolveAllReplies: boolean = Conf['Resolve all Tweet Replies'];
  CrossOrigin.cachePromise(
    `https://api.fxtwitter.com/${a.dataset.uid}${(shouldTranslate) ? '/en' : ''}`
  ).then(async req => {
    if (req.status === 404) {
      el.textContent = '404: tweet not found';
      return;
    }

    const { tweet } = req.response;

    console.log(tweet);

    async function getReplies(tweet) {
      if (!tweet?.replying_to_status) {
        return [];
      }
      const max_replies = (shouldResolveAllReplies) ? Number.MAX_SAFE_INTEGER : 1;
      let replies = [];
      replies.push(tweet);
      for (let i = 0; i < max_replies; i++) {
        const replyReq = await CrossOrigin.cachePromise(
          `https://api.fxtwitter.com/${replies[i].replying_to}/status/${replies[i].replying_to_status}${(shouldTranslate) ? '/en' : ''}`
        );
        const replyRes = replyReq.response;
        replies.push(replyRes.tweet);
        if (!replyRes.tweet?.replying_to_status) {
          break;
        }
      }
      return replies;
    }

    const replies = (!shouldResolveReplies) ? [] : await getReplies(tweet);

    function renderMedia(tweet): EscapedHtml[] {
      return tweet.media?.all?.map(media => {
        switch (media.type) {
          case 'photo':
            return <div class="fxt-media">
              <img src={media.url} alt={media.altText} width={media.width} height={media.height}
                referrerpolicy="no-referrer" />
            </div>;
          case 'video':
          case 'gif':
            return <div class="fxt-media">
              <video controls width={media.width} height={media.height} poster={media.thumbnail_url} >
                <source src={media.url} type={media.format} />
              </video>
            </div>
        }
      }) || [];

      const mediaItems = tweet?.media?.all || [];
      let media = [];
      let photos = 1;
      for (let i = 0; i < mediaItems.length; i++) {
        const mediaItem = mediaItems[i];
        switch (mediaItem.type) {
          case 'photo':
            media.push(<a target="_blank" href={`${tweet.url}/photo/${photos}`}>
              <img src={mediaItem.url} referrerpolicy="no-referrer" style="max-width: 80vw; max-height: 80vh;" />
            </a>);
            photos += 1;
            break;
          case 'video':
          case 'gif':
            media.push(<video controls={true} preload="auto" src={mediaItem.url} style="max-width: 80vw; max-height: 80vh;" loop={mediaItem.type === 'gif'} />)
            break;
        }
      }
      return media;
    }

    function renderDate(tweet) {
      return Time.format(new Date(tweet.created_at));
    }

    function renderPoll(tweet): EscapedHtml {
      let maxPercentage = 0;
      let maxChoiceIndex = -1;
      tweet.poll.choices.forEach((choice, index) => {
        if (choice.percentage > maxPercentage) {
          maxPercentage = choice.percentage;
          maxChoiceIndex = index;
        }
      });

      const pollChoices = tweet.poll.choices.map((choice, index) =>
        <div class={`choice ${index === maxChoiceIndex ? 'highlight' : ''}`}>
          <span class="choice_label">{choice.label}</span>
          <span class="choice_percentage">{choice.percentage}%</span>
          <div class="bar" style={`width: ${choice.percentage}%`} />
        </div>
      );

      return <div class="tweet-poll">
        {pollChoices}
        <div class="total-votes">{tweet.poll.total_votes.toLocaleString()} votes</div>
      </div>;

      // u00A0 is nbsp, u00B7 is &CenterDot;
      return <>
        <ul>{...tweet.poll.choices.map(choice => <li>{choice.label} / {choice.percentage}%</li>)}</ul>
        {`${tweet.poll.total_votes || 0}\u00A0votes \u00B7 ${tweet.poll.time_left_en || ''}`}
      </>
    }

    const topTranslation: boolean = (tweet?.translation?.source_lang != tweet?.translation?.target_lang && tweet?.quote?.translation?.source_lang != tweet?.quote?.translation?.target_lang);

    function renderTranslation(tweet, quote = false): EscapedHtml | '' {
      if (tweet?.translation?.source_lang === tweet?.translation?.target_lang) {
        return '';
      }
      const quote_translation = (!topTranslation || quote || !tweet?.quote?.translation) ? '' : <div class="fxt-quote">
        <div class="fxt-quote-meta">
          <a class="fxt-quote_meta_profile" href={tweet.quote.author.url} title={tweet.quote.author.description} target="_blank" referrerpolicy="no-referrer">
            <img src={tweet.quote.author.avatar_url} referrerpolicy="no-referrer" />
          </a>
          <a href={tweet.quote.url} target="_blank" referrerpolicy="no-referrer">
            <div class="fxt-quote_meta_author">
              <span class="fxt-quote_meta_author_username">{tweet.quote.author.name}</span>
              <span class="fxt-quote_meta_author_account">@{tweet.quote.author.screen_name}</span>
            </div>
          </a>
        </div>
        <div class="fxt-quote-translation-text">
        <p>Translated from {tweet?.quote?.translation?.source_lang_en || ''}</p>
        {tweet?.quote?.translation?.text || ''}
        </div></div>
      return <>
        <div class={(!topTranslation) ? "fxt-quote-translation-text" : "fxt-translation-text"}>
        <p>Translated from {tweet?.translation?.source_lang_en || ''}</p>
        {tweet?.translation?.text || ''}
        </div>{quote_translation}
      </>
    }

    const translation = (shouldTranslate) ? renderTranslation(tweet) : '';

    function renderQuote(tweet, renderNested = false): EscapedHtml {
      const quote_nested = (tweet?.quote && renderNested) ? renderQuote(tweet.quote, false) : '';
      const quote_poll = (tweet?.poll) ? renderPoll(tweet) : ''
      const quote_translation = (shouldTranslate && !topTranslation) ? renderTranslation(tweet, true) : '';
      const media = tweet.media.all ? renderMedia(tweet) : [];

      return <div class="fxt-quote">
        <div class="fxt-quote_meta">
          <a class="fxt-quote_meta_profile" href={tweet.author.url} title={tweet.author.description} target="_blank"
            referrerpolicy="no-referrer">
            <img src={tweet.author.avatar_url} referrerpolicy="no-referrer" />
          </a>
          <a href={tweet.url} referrerpolicy="no-referrer">
            <div class="fxt-quote_meta_author">
              <span class="fxt-quote_meta_author_username">{tweet.author.name}</span>
              <span class="fxt-quote_meta_author_account">@{tweet.author.screen_name}</span>
            </div>
          </a>
        </div>
        <div class="fxt-quote-text">{tweet.text}</div>
        {(!topTranslation) ? quote_translation : ''}
        <div class="fxt-quote_media_container">
          {quote_poll}
          {...media}
        </div>
      </div>;

      return <><hr /><blockquote>
        <div style="display: flex;padding-bottom: 1em;">
          <a href={tweet.url}>
            <div>
              <img src={tweet.author.avatar_url} style="width: 24px;transform: translateX(-50%) translateY(-50%);border-radius: 9999px;" />
            </div>
            <div style="margin: -2.25em 0 0 1em;">{tweet.author.name} (@{tweet.author.screen_name}) {renderDate(tweet)}</div>
          </a>
        </div>
        <p lang={tweet?.lang || 'en'} dir="ltr" style="margin-top: 0">{tweet.text}</p>
        {...renderMedia(tweet)}
        {quote_poll}
        {quote_nested}
        {quote_translation}
      </blockquote></>
    }

    let repliesJsx: EscapedHtml[] = [];
    if (replies.length > 1) {
      repliesJsx.push({ innerHTML: "<em>Replying To</em><br/>", [isEscaped]: true });
      for (let i = replies.length - 1; i > 0; i--) {
        repliesJsx.push(renderQuote(replies[i], true));
      }
    }

    const media = renderMedia(tweet);
    const quote = (tweet?.quote) ? renderQuote(tweet.quote) : ''

    const poll = (tweet?.poll) ? renderPoll(tweet) : '';
    const created_at = renderDate(tweet);

    const innerHTML: EscapedHtml = <article class="fxt-card">
      <a class="fxt-meta"  href={tweet.author.url} title={tweet.author.description} target="_blank"
        referrerpolicy="no-referrer">
        <div class="fxt-meta_profile">
          <img src={tweet.author.avatar_url} referrerpolicy="no-referrer" />
        </div>
        <div class="fxt-meta_author">
          <span class="fxt-meta_author_username">{tweet.author.name}</span>
          <span class="fxt-meta_author_account">@{tweet.author.screen_name}</span>
        </div>
        {/*<a href={tweet.url} title="Open tweet in a new tab"><i class="fa-solid fa-up-right-from-square"></i></a> */}
      </a>
      {(topTranslation) ? translation : ''}
      <div class="fxt-text">{tweet.text}</div>
      {(!topTranslation) ? translation : ''}
      <div class="fxt-media_container">
        {poll}
        {...media}
      </div>
      {quote}
      <div class="fxt-stats">
        <div class="fxt-stats_time">{created_at}</div>
        <div class="fxt-stats_meta">
          <a href={`https://twitter.com/intent/tweet?in_reply_to=${tweet.id}`}>
            <span class="fxt-replies">
              {Icon.raw("comment")}
              {tweet.likes.toLocaleString()}
            </span>
          </a>
          <a href={`https://twitter.com/intent/retweet?tweet_id=${tweet.id}`}>
            <span class="fxt-reposts">
              {Icon.raw("shuffle")}
              {tweet.retweets.toLocaleString()}
            </span>
          </a>
          <a href={`https://twitter.com/intent/like?tweet_id=${tweet.id}`}>
            <span class="fxt-likes">
              {Icon.raw("heart")}
              {tweet.replies.toLocaleString()}
            </span>
          </a>
        </div>
      </div>
    </article>;


    /*<>
      {...repliesJsx}
      <p lang={tweet.lang || 'en'} dir="ltr">{tweet.text}</p>
      {...media}
      {poll}
      {translation}
      {quote}
      <hr />
      &mdash; {tweet.author.name} (@{tweet.author.screen_name}) {created_at}
      <br />
      {Icon.raw("comment")}{tweet?.replies || 0}&nbsp;{Icon.raw("shuffle")}{tweet?.retweets || 0}&nbsp;{Icon.raw("heart")}{tweet?.likes || 0}
    </>;*/

    // @ts-ignore
    // el.firstChild.innerHTML = innerHTML.innerHTML;
    // @ts-ignore
    // el.style = 'white-space: pre-line';
    // Linkify.process(el.firstChild);

    el.innerHTML = innerHTML.innerHTML;
    const linkifyNodes = [
      ...el.getElementsByClassName('fxt-text'),
      ...el.getElementsByClassName('fxt-quote-text'),
      ...el.getElementsByClassName('fxt-translation-text'),
      ...el.getElementsByClassName('fxt-quote-translation-text'),
    ]
    for (const textNode of [...linkifyNodes]) {
      Linkify.process(textNode);
    }
    el.style.height = 'fit-content';
    el.style.width = 'fit-content';
    el.style.overflow= 'auto';
  });
  return el;
}