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
      let photos = 0;
      return tweet.media?.all?.map((media,i) => {
        switch (media.type) {
          case 'photo':
            photos += 1;
            return <div class="fxt-media" style={(i == 0 && tweet.media.all.length < 5 && tweet.media.all.length > 2) ? `grid-column:1/${(tweet.media.all.length%2==0) ? tweet.media.all.length/2 : tweet.media.all.length};grid-row:1/${(tweet.media.all.length%2==0) ? tweet.media.all.length/2 : tweet.media.all.length};` : ''}>
              <a href={`${tweet.url}/photo/${photos}`} target="_blank" referrerpolicy="no-referrer"><img src={media.url} alt={media.altText} width={media.width} height={media.height}
                referrerpolicy="no-referrer" /></a>
            </div>;
          case 'video':
          case 'gif':
            return <div class="fxt-media">
              <video controls width={media.width} height={media.height} poster={media.thumbnail_url} loop={media.type === 'gif'} >
                <source src={media.url} type={media.format} />
              </video>
            </div>
        }
      }) || [];
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
        <div class={`fxt-choice ${index === maxChoiceIndex ? 'highlight' : ''}`}>
          <span class="fxt-choice_label">{choice.label}</span>
          <span class="fxt-choice_percentage">{choice.percentage}%</span>
          <div class="bar" style={`width: ${choice.percentage}%`} />
        </div>
      );

      return <div class="fxt-poll">
        {...pollChoices}
        <div class="total-votes">{tweet.poll.total_votes.toLocaleString()} votes</div>
      </div>;
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
        <div class="fxt-quote_media_container" style={(media.length < 5 && media.length > 2) ? `grid-template-columns:repeat(${(media.length%2==0) ? media.length/2 : media.length}, 1fr);` : ''}>
          {quote_poll}
          {...media}
        </div>
      </div>;
    }

    let repliesJsx: EscapedHtml[] = [];
    if (replies.length > 1) {
      repliesJsx.push({ innerHTML: "<em>Replying To</em><br/>", [isEscaped]: true });
      for (let i = replies.length - 1; i > 0; i--) {
        console.log('reply: ', replies[i])
        repliesJsx.push(renderArticle(replies[i]));
      }
    }

    function renderArticle(tweet): EscapedHtml {
      const translation = (shouldTranslate) ? renderTranslation(tweet) : '';
      const media = renderMedia(tweet);
      const quote = (tweet?.quote) ? renderQuote(tweet.quote) : ''

      const poll = (tweet?.poll) ? renderPoll(tweet) : '';
      const created_at = renderDate(tweet);
      return <article class="fxt-card">
        <a class="fxt-meta"  href={tweet.author.url} title={tweet.author.description} target="_blank"
          referrerpolicy="no-referrer">
          <div class="fxt-meta_profile">
            <img src={tweet.author.avatar_url} referrerpolicy="no-referrer" />
          </div>
          <div class="fxt-meta_author">
            <span class="fxt-meta_author_username">{tweet.author.name}</span>
            <span class="fxt-meta_author_account">@{tweet.author.screen_name}</span>
          </div>
        </a>
        {(topTranslation) ? translation : ''}
        <div class="fxt-text">{tweet.text}</div>
        {(!topTranslation) ? translation : ''}
        <div class="fxt-media_container" style={(media.length < 5 && media.length > 2) ? `grid-template-columns:repeat(${(media.length%2==0) ? media.length/2 : media.length}, 1fr);` : ''}>
          {poll}
          {...media}
        </div>
        {quote}
        <div class="fxt-stats">
          <div class="fxt-stats_time"><a href={tweet.url} target="_blank" referrerpolicy="no-referrer">{created_at}</a></div>
          <div class="fxt-stats_meta">
            <a href={`https://twitter.com/intent/tweet?in_reply_to=${tweet.id}`} target="_blank" referrerpolicy="no-referrer">
              <span class="fxt-replies">
                {Icon.raw("comment")}
                {tweet.replies.toLocaleString()}
              </span>
            </a>
            <a href={`https://twitter.com/intent/retweet?tweet_id=${tweet.id}`} target="_blank" referrerpolicy="no-referrer">
              <span class="fxt-reposts">
                {Icon.raw("shuffle")}
                {tweet.retweets.toLocaleString()}
              </span>
            </a>
            <a href={`https://twitter.com/intent/like?tweet_id=${tweet.id}`} target="_blank" referrerpolicy="no-referrer">
              <span class="fxt-likes">
                {Icon.raw("heart")}
                {tweet.likes.toLocaleString()}
              </span>
            </a>
          </div>
        </div>
      </article>
    }

    const innerHTML: EscapedHtml = <>{...repliesJsx}{renderArticle(tweet)}</>;

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
    if (repliesJsx.length > 0) {
      if (el.scrollHeight > 600) {
        el.style.height = '600px';
      }
      const lastTweet = Array.from(document.querySelectorAll('article.fxt-card')).pop();
      el.scrollTo({top: lastTweet.getBoundingClientRect().y-700})
    }
  });
  return el;
}