import { cpSync, mkdirSync } from 'node:fs';
const source = 'src/cache', destination = 'com.wlrudxo.usagecache.sdPlugin';
mkdirSync(`${destination}/ui`, { recursive: true });
for (const name of ['imgs', 'layouts', 'manifest.json']) {
    cpSync(`${source}/${name}`, `${destination}/${name}`, { recursive: true });
}
cpSync(`${source}/settings.html`, `${destination}/ui/settings.html`);
