import { inject } from 'aurelia-dependency-injection';
import { LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';


@inject(EventAggregator)
export class AureliaGemiusStream {
    constructor(eventAggregator) {
        this.eventAggregator = eventAggregator;
        this.initialized = false;
	this.logger = LogManager.getLogger('gemius-stream-plugin');

    }

    init(prefix, identifier, debug = false) {
        this.prefix = prefix;
        this.identifier = identifier;
        this.debug = debug;
        this.loadScript();
        this.initialized = true;

    }

    attach(options = { getExtra: () => { } }) {
        if (!this.initialized) {
            const errorMessage = 'AureliaGemiusStream must be initialized before use.';
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        }
        this.options = options;
        this.gemiusPlayer = new GemiusPlayer(1, this.identifier, { resolution: '1920x1080'});
        this.eventAggregator.subscribe('stats:init', ({ program, playlist }) => {
            this.logger.debug('AureliaGemiusStream.init', program, playlist);
            this.program = program;
            this.playlist = playlist;
            this.currentPlaylistItem = null;
        });

        this.eventAggregator.subscribe('stats:nextPlaylistItem', payload => {
            this.nextPlaylistItem(payload);
        });

        this.eventAggregator.subscribe('stats:event', payload => {
            this.handleEvent(payload);
        });
    }

    loadScript() {
        this.logger.debug('loadScript');
        const script = document.createElement('script');
        script.text = 
            "function gemius_player_pending(obj,fun) {obj[fun] = obj[fun] || function() {var x = window['gemius_player_data'] ="
            + "window['gemius_player_data'] || []; x[x.length]=[this,fun,arguments];};};"
            + "gemius_player_pending(window,\"GemiusPlayer\");"
            + "gemius_player_pending(GemiusPlayer.prototype,\"newProgram\");"
            + "gemius_player_pending(GemiusPlayer.prototype,\"newAd\");"
            + "gemius_player_pending(GemiusPlayer.prototype,\"adEvent\");"
            + "gemius_player_pending(GemiusPlayer.prototype,\"programEvent\");"
            + "gemius_player_pending(GemiusPlayer.prototype,\"setVideoObject\");"
            + "(function(d,t) {try {var gt=d.createElement(t),s=d.getElementsByTagName(t)[0],"
            + "l='http'+((location.protocol=='https:')?'s':''); gt.setAttribute('async','async');"
            + "gt.setAttribute('defer','defer'); gt.src=l+'://"
            + this.prefix
            + ".hit.gemius.pl/gplayer.js'; s.parentNode.insertBefore(gt,s);} catch (e){}})(document,'script');"
        document.querySelector('body').appendChild(script);
    }

    handleEvent(payload) {
        this.logger.debug('GemiusStreamService.handleEvent', payload);
        const offset = (payload.offset) ? Math.round(payload.offset) : 0;

        if (this.currentPlaylistItem.type === 'program') {
            if (payload.eventName === 'play') {
                programEvent(this.program.id, offset, payload.eventName, { autoPlay: payload.autoPlay });
            } else {
                programEvent(this.program.id, offset, payload.eventName);
            }
        } else {
            if (payload.eventName === 'play') {
                adEvent(this.program.id, this.currentPlaylistItem.id, offset, payload.eventName, { autoPlay: payload.autoPlay });
            } else {
                adEvent(this.program.id, this.currentPlaylistItem.id, offset, payload.eventName);
            }
        }
    }

    nextPlaylistItem(playlistItem) {
        this.currentPlaylistItem = playlistItem;
        if (playlistItem.type === 'program') {
            this.gemiusPlayer.newProgram(playlistItem.id, {
                programName: playlistItem.title,
                programDuration: playlistItem.duration,
                programType: 'Video',
                series: playlistItem.orig.subtitle,
            });
        } else {
            this.gemiusPlayer.newAd(playlistItem.id, {
                adName: playlistItem.title,
                adDuration: playlistItem.duration,
            });
        }
    }
}
