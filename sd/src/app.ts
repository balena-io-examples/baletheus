import * as capitano from 'capitano';
import * as Promise from 'bluebird';
import * as fs from 'fs';
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
		console.log(process.env.API_KEY);
		balena.auth.loginWithToken(process.env.API_KEY).then(function() {
			balena.auth.isLoggedIn().then(function(isLoggedIn) {
				// TODO: check if login was successful. this needs to either back off, or bail harder
				if (isLoggedIn === false) {
					throw new Error('Authentication Error')
				}
			})
		})
		setInterval(function() {
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
class Device {
		constructor(
				private targets: Array<string>,
				private labels: Labels
		)
		{}
}

class Labels {
		// TODO: maybe location, tags, application
		constructor(
				private device_name: string,
				private uuid: string,
				private device_type: string,
				private commit: string,
				private os_version: string,
				private os_variant: string,
				private supervisor_version: string
		)
		{}
}

const writeDevices = (params: Params, opts: Opts) => {
	let allTargets = new Array<Device>();
	balena.models.device.getAll().then(function(devices) {
			for (let device of devices) {
					let labels = new Labels(device.device_name,
							device.uuid,
							device.device_type,
							device.is_on__commit,
							device.os_version,
							device.os_variant,
							device.supervisor_version);
					let targets = [];
					if (!opts.publicUrls) {
									if (device.ip_address !== null) {
											let targets = device.ip_address.split(" ");
											let newDevice = new Device(
													targets,
													labels
											);
											allTargets.push(newDevice);
									} else {
											console.log(`skipping device ${device.device_name}, no ip_address`);
									}
					} else {
							// TODO implement me using public urls!
							console.error('Remote scraping via public URL not currently supported')
							throw new Error('Remote scraping via public URL not currently supported')
					}
			}
			return allTargets
	}).then(function(targets) {
		if (targets.length !== 0 || opts.writeEmpty === true) {
			return new Promise(resolve => {
				// TODO should write to second file and mv into place (atomic write)
				fs.writeFile(opts.filePath, JSON.stringify(targets, null, 2), (err) => {
					if (!err) resolve()
					else throw err
				})
			}).then(function() {
				console.log(`SD file at ${opts.filePath} has been updated with ${targets.length} devices`)
			})
		} else {
			console.error('Cowardly refusing to write file with 0 devices')
		}
	})
}

capitano.run(process.argv, (error: Error) => {
	if (error != null) {
		console.log(error);
		process.exit(1);
	}
});
