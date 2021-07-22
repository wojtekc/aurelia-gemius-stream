import { AureliaGemiusStream } from './aurelia-gemius-stream';

export function configure(aurelia, configCallback) {
	const instance = aurelia.container.get(AureliaGemiusStream);
	if (configCallback !== undefined && typeof configCallback === 'function') {
		configCallback(instance);
	}
	aurelia.singleton(instance);
}
