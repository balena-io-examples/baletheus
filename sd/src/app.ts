import * as capitano from 'capitano';
import * as Promise from 'bluebird';
import { rename, writeFile } from 'fs';
import * as balenaSdk from 'balena-sdk';
import * as settings from 'balena-settings-client';

balenaSdk.setSharedOptions({
	apiUrl: settings.get('apiUrl'),
	imageMakerUrl: settings.get('imageMakerUrl'),
	dataDirectory: settings.get('dataDirectory'),
})

const balena = balenaSdk()

interface Params {}

interface Opts {
	publicUrls: boolean;
	writeEmpty: boolean;
	apiToken: string;
	filePath: string;
	refresh: number;
}

interface Cmd {
	signature: string;
	description: string;
	isWildcard: () => boolean;
}

interface Device {
	targets: Array<string>,
	labels: Labels
}

interface Labels {
	// TODO: maybe location, tags, application
	device_name: string,
	uuid: string,
	device_type: string,
	commit: string,
	os_version: string,
	os_variant: string,
	supervisor_version: string
}

capitano.command({
	signature: '*',
	// TODO better help text
	// TODO all from env?
	description: 'Generate Prometheus SD file from balenaCloud API',
	options: [
		{
			signature: 'publicUrls',
			required: false,
			boolean: true,
			alias: ['p']
		},
		{
			signature: 'writeEmpty',
			required: false,
			boolean: true,
			alias: ['z']
		},
		{
			signature: 'filePath',
			required: true,
			parameter: 'filePath',
			alias: ['f']
		},
		{
			signature: 'refresh',
			required: true,
			parameter: 'refresh',
			alias: ['r']
		},
	],
	action: (params: Params, opts: Opts) => {
		balena.auth.loginWithToken(process.env.API_KEY).then(() => {
			balena.auth.isLoggedIn().then((isLoggedIn) => {
				// TODO: check if login was successful. this needs to either back off, or bail harder
				if (!isLoggedIn) {
					throw new Error('Authentication Error')
				}
			})
		});
		setInterval(() => {
			writeDevices(params, opts);
		}, opts.refresh);
	}
});

// prometheus file_sd format
// from: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#file_sd_config
// [
//  {
//	"targets": [ "<host>", ... ],
//	"labels": {
//	  "<labelname>": "<labelvalue>", ...
//	}
//  },
//  ...
//]
const writeDevices = (params: Params, opts: Opts) => {
	let allTargets = new Array<Device>();
	balena.models.device.getAll().then((devices) => {

		devices.forEach((device) => {
			const labels = {device_name: device.device_name,
					uuid: device.uuid,
					device_type: device.device_type,
					commit: device.is_on__commit,
					os_version: device.os_version,
					os_variant: device.os_variant,
					supervisor_version: device.supervisor_version} as Labels;
			const targets = [];
			if (!opts.publicUrls) {
				if (device.ip_address) {
					const targets = device.ip_address.split(" ");
					const newDevice = {
						targets,
						labels,
					} as Device;
					allTargets.push(newDevice);
				} else {
					console.log(`skipping device ${device.device_name}, no ip_address`);
				}
			} else {
				if (device.is_web_accessible) {
					if (device.uuid) {
						balena.settings.get('proxyUrl')
						.then((proxyUrl) => {
							const newDevice = {
								targets: [`${device.uuid}.${proxyUrl}`],
								labels,
							} as Device;
							console.log(newDevice);
							allTargets.push(newDevice);
						});
					}
				} else {
					console.log(`device ${device.device_name} does not have the public web URL enabled`);
				}
			}
		});
		return allTargets;
	}).then((targets) => {
		if (targets.length === 0 && !opts.writeEmpty) {
			console.error('Cowardly refusing to write file with 0 devices');
		} else {
			const newFile = `${opts.filePath}.new`;
			return new Promise(resolve => {
				writeFile(newFile, JSON.stringify(targets, null, 2), (err) => {
					if (!err) {
						resolve()
					}
					else throw err
				})
			}).then(() => {
				return new Promise(resolve => {
					rename(newFile, opts.filePath, (err) => {
						if (!err) {
							resolve()
						}
						else throw err
					})
				})
			}).then(() => {
				console.log(`SD file at ${opts.filePath} has been updated with ${targets.length} devices\n`)
			})
		}
	})
}

capitano.run(process.argv, (error: Error) => {
	if (error != null) {
		console.log(error);
		process.exit(1);
	}
});
