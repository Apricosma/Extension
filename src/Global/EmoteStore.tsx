import { BitField } from '@typings/src/BitField';
import { Constants } from '@typings/src/Constants';
import { DataStructure } from '@typings/typings/DataStructure';
import React from 'react';
import EmojiData from 'src/Content/Util/Emoji.json';
import twemoji from 'twemoji';
import { EmoteComponent } from 'src/Content/Components/EmoteComponent';
import { Logger } from 'src/Logger';
import { Twitch } from 'src/Page/Util/Twitch';

const TWITCH_SET_NAME = 'twitch';
const EMOJI_SET_NAME = 'emoji';
export class EmoteStore {
	size = 0;
	private cachedElements = new Map<string, JSX.Element>();
	sets = new Map<string, EmoteStore.EmoteSet>();

	addElement(id: string, jsx: JSX.Element): JSX.Element {
		this.cachedElements.set(id, jsx);

		return jsx;
	}

	getElement(id: string): JSX.Element | undefined {
		return this.cachedElements.get(id);
	}

	getEmote(nameOrID: string): EmoteStore.Emote | null {
		for (const set of this.sets.values()) {
			for (const emote of set.getEmotes()) {
				if (emote.name === nameOrID || emote.id === nameOrID) {
					return emote;
				}
			}
		}

		return null;
	}

	fromTwitchEmote(data: Twitch.ChatMessage.EmoteRef): EmoteStore.Emote {
		if (!this.sets.has(TWITCH_SET_NAME)) {
			this.sets.set(TWITCH_SET_NAME, new EmoteStore.EmoteSet(TWITCH_SET_NAME));
		}

		const set = this.sets.get(TWITCH_SET_NAME) as EmoteStore.EmoteSet;
		set.push([{
			id: data.emoteID ?? '',
			name: data.alt,
			provider: 'TWITCH',
			visibility: 0,
			mime: '',
			status: Constants.Emotes.Status.LIVE,
			tags: []
		}], false);

		return set.getEmoteByName(data.alt) as EmoteStore.Emote;
	}

	fromEmoji(data: HTMLImageElement): EmoteStore.Emote {
		if (!this.sets.has(EMOJI_SET_NAME)) {
			this.sets.set(EMOJI_SET_NAME, new EmoteStore.EmoteSet(EMOJI_SET_NAME));
		}

		const set = this.sets.get(EMOJI_SET_NAME) as EmoteStore.EmoteSet;
		const index = EmojiData.index[twemoji.convert.toCodePoint(data.alt).toUpperCase() as keyof typeof EmojiData.index] as number;
		const emoji = EmojiData.list[index];
		const fallback = encodeURIComponent(data.alt);

		const urls = [] as [string, string][];
		for (let i = 1; i <= 4; i++) {
			urls.push([`${i}`, data.src]);
		}
		set.push([{
			id: emoji?.unified ?? fallback,
			name: emoji?.name.toLowerCase() ?? '',
			visibility: DataStructure.Emote.Visibility.GLOBAL,
			tags: [],
			mime: '',
			status: Constants.Emotes.Status.LIVE,
			provider: 'EMOJI',
			urls
		}]);

		return set.getEmoteByID(emoji?.unified ?? fallback) as EmoteStore.Emote;
	}

	enableSet(name: string, emotes: DataStructure.Emote[]): EmoteStore.EmoteSet {
		const set = new EmoteStore.EmoteSet(name).push(emotes);

		this.sets.set(set.name, set);
		Logger.Get().debug(`Enabled emote set: ${name} (${emotes.length} emotes)`);
		return set;
	}
}

export namespace EmoteStore {
	export class EmoteSet {
		private emotes = new Map<string, Emote>();
		get size(): number {
			return this.emotes.size;
		}

		/**
		 * A set of emotes, such as that of a channel or global
		 *
		 * @param name the name of the set
		 */
		constructor(
			public name: string
		) {

		}

		/**
		 * Push emotes to this set, overwriting any data present beforehand
		 *
		 * @param emotes the emotes that will be in this set
		 * @returns this
		 */
		push(emotes: DataStructure.Emote[], override = true): EmoteSet {
			if (override) {
				this.emotes.clear();
			}

			const arr = emotes.map(e => new Emote(e));
			for (const e of arr) {
				this.emotes.set(e.id, e);
			}

			return this;
		}

		getEmotes(): Emote[] {
			return Array.from(this.emotes.values());
		}

		getEmoteByID(id: string): Emote | null {
			return this.emotes.get(id) ?? null;
		}

		getEmoteByName(name: string): Emote | null {
			for (const emote of this.emotes.values()) {
				if (emote.name === name) {
					return emote;
				}
			}
			return null;
		}

		/**
		 * Resolve this set into its data form
		 *
		 * @returns An object matching the EmoteSet.Resolved interface
		 */
		resolve(): EmoteSet.Resolved {
			return {
				name: this.name,
				emotes: this.getEmotes().map(e => e.resolve())
			};
		}
	}
	export namespace EmoteSet {
		export interface Resolved {
			name: string;
			emotes: DataStructure.Emote[];
		}
	}

	export class Emote {
		id = '';
		name = '';
		mime = '';
		tags = [] as string[];
		visibility: DataStructure.Emote.Visibility = 0;
		owner: Partial<DataStructure.TwitchUser> | null = null;
		provider: DataStructure.Emote.Provider = '7TV';
		urls = [] as [string, string][];

		constructor(private data: DataStructure.Emote) {
			this.id = data.id ?? '';
			this.name = data.name ?? '';
			this.mime = data.mime ?? '';
			this.visibility = data.visibility ?? 0;
			this.provider = data.provider ?? '7TV';
			if (!!data.owner) {
				this.owner = data.owner;
			}
			if (Array.isArray(data.urls)) {
				this.urls = data.urls;
			}
		}

		/**
		 * Get the URL to this emote
		 *
		 * @param size the size of the emote to return
		 */
		cdn(size: '1' | '2' | '3' | '4'): string {
			const url = this.urls.filter(([s]) => s === size)?.[0] ?? this.urls[this.urls.length - 1];

			switch (this.provider) {
				case 'TWITCH':
					return `https://static-cdn.jtvnw.net/emoticons/v2/${this.id}/default/dark/${size}.0`;
				default:
					return url[1];
			}
		}

		/**
		 * @returns whether the emote is global
		 */
		isGlobal(): boolean {
			return BitField.HasBits(this.visibility, DataStructure.Emote.Visibility.GLOBAL);
		}

		/**
		 * @returns whether the emote is private
		 */
		isPrivate(): boolean {
			return BitField.HasBits(this.visibility, DataStructure.Emote.Visibility.PRIVATE);
		}

		toJSX(store?: EmoteStore): JSX.Element {
			let element: JSX.Element | undefined;
			if (!!store) {
				element = store.getElement(this.id);
			}

			if (!!element) {
				return element;
			} else {
				element = <EmoteComponent
					emote={this}
					provider={this.provider}
				/>;
			}

			store?.addElement(this.id, element);
			return element;
		}

		resolve(): DataStructure.Emote {
			return this.data;
		}
	}
}
