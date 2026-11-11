import streamDeck, { action, SingletonAction } from '@elgato/streamdeck';
import { displayUsage } from '../services/display-usage';
import { ProgressBarRenderer, Slot } from '../ui/progress-bar-renderer';
import { ServiceTheme } from '../interfaces/theme';
import { formatTimeUntil } from '../utils/time-formatter';

// Renderer lineage: lenadweb/stream-deck-ai-limits; downstream baseline 594338b.
class CacheAction extends SingletonAction<Record<string, any>> {
    protected provider: 'claude' | 'antigravity' | 'chatgpt' = 'claude';
    protected theme: ServiceTheme = 'claude';
    private tiles = new Map<string, any>();
    private timer?: NodeJS.Timeout;
    private renderer = new ProgressBarRenderer();
    override async onWillAppear(ev: any) {
        this.tiles.set(ev.action.id, ev);
        await this.draw(ev);
        this.timer ??= setInterval(() => { for (const tile of this.tiles.values()) void this.draw(tile); }, 60000);
    }
    override async onWillDisappear(ev: any) {
        this.tiles.delete(ev.action.id);
        if (!this.tiles.size) { clearInterval(this.timer); this.timer = undefined; }
    }
    override async onDidReceiveSettings(ev: any) {
        const previous = this.tiles.get(ev.action.id);
        if (previous) { previous.payload.settings = ev.payload.settings; await this.draw(previous); }
    }
    override async onKeyDown(ev: any) { await this.draw(this.tiles.get(ev.action.id) ?? ev); }
    override async onDialUp(ev: any) { await this.onKeyDown(ev); }
    override async onTouchTap(ev: any) { await this.onKeyDown(ev); }
    private async draw(ev: any) {
        try {
            const result = displayUsage(this.provider);
            const settings = ev.payload.settings ?? {};
            const slot = (metric: string): Slot => {
                const key = this.provider === 'claude' ? ({session:'five_hour',weekly:'seven_day',weeklySonnet:'7d_sonnet_quota'} as any)[metric] ?? metric : this.provider === 'chatgpt' ? (metric === 'weekly' ? 'primary_window' : metric) : metric;
                const bucket = result.perModel?.[key];
                const label = ({five_hour:'Session',seven_day:'Week','7d_fable_quota':'Fable','primary_window':'GPT Week','argon-weekly':'Argon','gemini-argon-wtu-weekly':'Argon'} as any)[key] ?? metric;
                return bucket ? {kind:'gauge',label,percent:bucket.usagePercent ?? 0,caption:bucket.resetTime ? formatTimeUntil(bucket.resetTime) : undefined} : {kind:'stat',label,valueText:'—',caption:'no data',muted:true};
            };
            const defaults = this.provider === 'antigravity' ? ['argon-weekly','argon-weekly'] : this.provider === 'chatgpt' ? ['weekly','none'] : ['session','weekly'];
            const metric = this.provider === 'antigravity' ? settings.model : settings.metric;
            const top = this.provider === 'antigravity' ? settings.topModel : settings.topMetric;
            const bottom = this.provider === 'antigravity' ? settings.bottomModel : settings.bottomMetric;
            const opts = {showName:settings.showProviderName !== false,size:settings.size};
            const render = (w:number,h:number) => result.error ? this.renderer.renderError(result.error.message,this.theme,w,h,opts) : settings.layout === 'ring' ? this.renderer.renderRing(slot(metric || defaults[0]),this.theme,w,h,opts) : this.renderer.renderSlots([top || defaults[0],bottom || defaults[1]].filter(x=>x !== 'none').map(slot),this.theme,w,h,opts);
            const uri = (svg:string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
            if (ev.payload.controller === 'Encoder') await ev.action.setFeedback({full_view:uri(render(200,100))});
            else await ev.action.setImage(uri(render(144,144)));
            streamDeck.logger.info(`[${this.provider}] sent cached display ${JSON.stringify(result.perModel)} error=${result.error?.message ?? 'none'}`);
        } catch { streamDeck.logger.error(`[${this.provider}] display send failed`); }
    }
}
@action({UUID:'com.wlrudxo.usagecache.progress'})
class Claude extends CacheAction {}
@action({UUID:'com.wlrudxo.usagecache.antigravity'})
class Argon extends CacheAction { protected override provider = 'antigravity' as const; protected override theme = 'antigravity' as const; }
@action({UUID:'com.wlrudxo.usagecache.codex.progress'})
class GPT extends CacheAction { protected override provider = 'chatgpt' as const; protected override theme = 'codex' as const; }
streamDeck.actions.registerAction(new Claude());
streamDeck.actions.registerAction(new Argon());
streamDeck.actions.registerAction(new GPT());
streamDeck.connect();
