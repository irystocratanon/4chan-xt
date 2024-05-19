import h, { type EscapedHtml, hFragment, isEscaped } from '../../../globals/jsx';
import Icon from "../../../Icons/icon";
import Time from '../../../Miscellaneous/Time';

export const tweetTemplate = `
  <style>
tweet-embed {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}
.tweet-card {
  font-family: system-ui;
  color: rgb(247, 249, 249);
  background-color: rgb(21, 32, 43);
  padding: 16px;
  border: 1px solid rgb(66, 83, 100);
  border-radius: 12px;
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tweet-meta {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
.tweet-meta_profile {
  height: 48px;
  width: 48px;
  aspect-ratio: 1;
  border-radius: 100%;
  overflow: hidden;
}
.tweet-meta_author {
  display: flex;
  flex-direction: column;
}
.tweet-meta_author_username {
  font-weight: bold;
}
.tweet-meta_author_account {
  font-size: 90%;
  color: rgb(66, 83, 100);
}
.tweet-stats_time {
  color: rgb(66, 83, 100);
  border-bottom: 1px solid rgb(66, 83, 100);
  padding-bottom: 8px;
}
.tweet-stats_meta {
  padding-top: 8px;
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  gap: 8px;
  & span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}
.tweet-stats_meta_likes { color: rgb(249, 24, 128); }
.tweet-stats_meta_retweets { color: rgb(2, 169, 115); }
.tweet-stats_meta_replies { color: rgb(28, 142, 218); }

.tweet-text {
  overflow-wrap: anywhere;
  word-break: normal;
}

.tweet-poll {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.choice {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 75%;
  height: 24px;
}
.choice.highlight {
  font-weight: bold;
  & .bar {
    background-color: color-mix(in srgb, rgba(255, 255, 255, .2), rgb(28, 142, 218));
  }
}
.choice_label {
  margin-left: 6px;
  z-index: 1;
}
.choice_percentage {
  margin-right: 6px;
  z-index: 1;
}
.choice .bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 24px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, .2);
  z-index: 0;
}
.total-votes {
  font-size: 75%;
  color: rgb(66, 83, 100);
}
.tweet-media {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
}
.tweet-media :is(img, video) {
  display: block;
  max-width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}
.tweet-media_container:has(.tweet-media:only-child) {
  display: grid;
  gap: 0;
  grid-template-columns: 1fr;
}
.tweet-media_container:has(.tweet-media) {
  display: grid;
  gap: 4px;
  grid-template-columns: 1fr 1fr;
}

.tweet-quote {
  border: 1px solid rgb(66, 83, 100);
  border-radius: 12px;
  overflow: hidden;
}
.tweet-quote_meta_profile {
  height: 24px;
  width: 24px;
  aspect-ratio: 1;
  border-radius: 100%;
  overflow: hidden;
}
.tweet-quote_meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 4px;
}
.tweet-quote_meta_author {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.tweet-quote_meta_author_username {
  font-weight: bold;
}
.tweet-quote_media_container :is(img, video) {
  max-width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  object-position: center;
}
.tweet-quote_media_container {
  width: 100%;
  height: 200px;
}
  </style>
  <article class="tweet-card">
	<div class="tweet-meta">
    	<div class="tweet-meta_profile"><slot name="tweet-meta_profile"></slot></div>
    	<div class="tweet-meta_author"><slot name="tweet-meta_author_username" class="tweet-meta_author_username"></slot><slot name="tweet-meta_author_account" class="tweet-meta_author_account"></slot></div>
    	<slot name="tweet-meta_url" title="Open tweet in a new tab"></slot>
  	</div>
	<div class="tweet-text"><slot name="tweet-text"></slot></div>
	<slot name="tweet-media_container"></slot>
	<div class="tweet-quote">
		<div class="tweet-quote_meta">
    		<div class="tweet-quote_meta_profile"><img src="https://pbs.twimg.com/profile_images/1440762338643091469/gQgRfdbG_200x200.jpg"></div>
    		<div class="tweet-quote_meta_author"><span class="tweet-quote_meta_author_username">jhanna</span><span class="tweet-quote_meta_author_account">@xjhannaa</span>
    		</div>
  		</div>
	</div>
	<slot name="tweet-stats"></slot>
  </article>
`;

function renderMedia(tweet) {
	const mediaItems = tweet?.media?.all || [];
	let media = [];
	let photos = 1;
	for (let i = 0; i < mediaItems.length; i++) {
		const mediaItem = mediaItems[i];
		switch (mediaItem.type) {
			case 'photo':
				media.push(<div class="tweet-media"><a target="_blank" href={`${tweet.url}/photo/${photos}`}>
						   <img src={mediaItem.url} referrerpolicy="no-referrer" style="max-width: 100%; height: 100%;" />
						   </a></div>);
						   photos += 1;
						   break;
			case 'video':
			case 'gif':
				media.push(<div class="tweet-media"><video controls={true} preload="auto" src={mediaItem.url} poster={mediaItem.thumbnail_url} style="max-width: 100%;height: 100%;" width={`${mediaItem.width}`} height={`${mediaItem.height}`} loop={mediaItem.type === 'gif'} /></div>)
				break;
        }
	}
	if (tweet?.poll) {
		let highlight = [0, tweet.poll.choices[0].count];
		for (let i = 1; i < tweet.poll.choices.length; i++) {
			if (tweet.poll.choices[i].count > tweet.poll.choices[i-1].count) {
				highlight = (tweet.poll.choices[i].count > highlight[1]) ? [i, tweet.poll.choices[i].count] : highlight;
			}
		}
		const choices = tweet.poll.choices.map((choice,i) => <div class="choice" style="display: flex;position: relative;align-items:center;justify-content:space-between;height:24px;"><span class="choice_label" style="margin-left:6px;z-index: 1;">{choice.label}</span><span class="choice_percentage">{choice.percentage}%</span><div class="bar" style={`position:absolute;top:0;left:0;height:24px;border-radius:4px;z-index:0;width: ${choice.percentage}%;${(i === highlight[0]) ? 'background-color: color-mix(in srgb, rgba(255, 255, 255, .2), rgb(28, 142, 218));font-weight:bold;' : 'background-color: rgba(255, 255, 255, .2);'}`}></div></div>)
		const poll = <div class="tweet-poll" style="display: flex;flex-direction: column;gap: 4px;font-size: 75%;">
				{...choices}
				<div class="total-votes" style="color:rgb(66, 83, 100);">{`${tweet.poll.total_votes || 0}\u00A0votes \u00B7 ${tweet.poll.time_left_en || ''}`}</div>
			</div>
		media.push(poll)
	}
	return media;
}

function renderDate(tweet) {
	return Time.format(new Date(tweet.created_at));
}

export const TwitterComponent = (tweet) => {
	console.log(tweet);
	return <tweet-embed>
		<img slot="tweet-meta_profile" src={`${tweet.author.avatar_url}`} width="48" height="48" />
		<span slot="tweet-meta_author_username">{`${tweet.author.name}`}</span>
		<span slot="tweet-meta_author_account">@{`${tweet.author.screen_name}`}</span>
		{(tweet?.text?.length > 0) && <p slot="tweet-text">{`${tweet.text}`}</p>
		}
		{(tweet?.media?.all?.length > 0 || tweet?.poll) && <div class="tweet-media_container" slot="tweet-media_container" style={`max-width:80vw;max-height:80vh;display:grid;${(tweet?.media?.all?.length < 2) ? 'gap:0;grid-template-columns:1fr;' : 'gap:4px;grid-template-columns:1fr 1fr;'}`}>
    	    {...renderMedia(tweet)}
			</div>
		}
		<div slot="tweet-quote"></div>
		<a href={tweet.url} title="Open tweet in a new tab" slot="tweet-stats">
		<div class="tweet-stats">
			<p class="tweet-stats_time" style="color:rgb(66, 83, 100);border-bottom:1px solid rgb(66, 83, 100);padding-bottom:8px;">{renderDate(tweet)}</p>
  			<div class="tweet-stats_meta" style="display:flex;padding-top:8px;flex-direction:row;justify-content:space-evenly;gap:8px;">
  				<button class="tweet-stats_meta_likes" style="cursor:pointer;background:transparent;border:none;color:rgb(249, 24, 128);display:inline-flex;align-items:center;gap:4px;">{Icon.raw("heart")}{tweet?.likes || 0}</button>
  				<button class="tweet-stats_meta_retweets" style="cursor:pointer;background:transparent;border:none;color:rgb(2, 169, 115);display:inline-flex;align-items:center;gap:4px;">{Icon.raw("shuffle")}{tweet?.retweets || 0}</button>
				<button class="tweet-stats_meta_replies" style="cursor:pointer;background:transparent;border:none;color:rgb(28, 142, 218);display:inline-flex;align-items:center;gap:4px;">{Icon.raw("comment")}{tweet?.replies || 0}</button>
			</div>
		</div>
		</a>
	</tweet-embed>;
}
