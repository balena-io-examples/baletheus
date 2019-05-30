import * as Promise from 'bluebird';
import { rename, writeFile } from 'fs';
import * as balenaSdk from 'balena-sdk';
import * as settings from 'balena-settings-client';

balenaSdk.setSharedOptions({
	apiUrl: settings.get('apiUrl'),
	imageMakerUrl: settings.get('imageMakerUrl'),
	dataDirectory: settings.get('dataDirectory'),
})

const balena = balenaSdk();
const SD_FILE_PATH = process.env.SD_FILE_PATH || './balena.json';

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
	targets: string[],
	labels: Labels
}

interface Labels {
	// TODO: maybe location, tags, application
	// TODO: many of these "labels" should be moved to a single exporter..
	device_name: string,
	uuid: string,
	device_type: string,
	commit: string,
	os_version: string,
	os_variant: string,
	supervisor_version: string
}

const getDevices = (): Promise<any> => {
	if (process.env.APPLICATION) {
		console.log(`filtering results to application ${process.env.APPLICATION}`);
		return balena.models.device.getAllByApplication(process.env.APPLICATION);
	} else {
		return balena.models.device.getAll();
	}
}

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
const writeDevices = (proxyUrl: string): void => {
	let allTargets = new Array<Device>();
	getDevices().then((devices: balenaSdk.Device[]) => {

		devices.forEach((device) => {
			const labels = {device_name: device.device_name,
					uuid: device.uuid,
					device_type: device.device_type,
					commit: device.is_on__commit,
					os_version: device.os_version,
					os_variant: device.os_variant,
					supervisor_version: device.supervisor_version} as Labels;
			if (!process.env.USE_PUBLIC_URLS) {
				if (device.ip_address) {
					const targets: string[] = device.ip_address.split(" ");
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
						const newDevice = {
							targets: [`${device.uuid}.${proxyUrl}`],
							labels,
						} as Device;
						allTargets.push(newDevice);
					}
				} else {
					console.log(`device ${device.device_name} does not have the public web URL enabled`);
				}
			}
		});
		return allTargets;
	}).then((targets: Device[]) => {
		if (targets.length === 0 && !process.env.WRITE_EMPTY) {
			console.error('Cowardly refusing to write file with 0 devices');
		} else {
			const newFile = `${SD_FILE_PATH}.new`;
			return new Promise(resolve => {
				writeFile(newFile, JSON.stringify(targets, null, 2), (err) => {
					if (!err) {
						resolve()
					}
					else throw err
				})
			}).then(() => {
				return new Promise(resolve => {
					rename(newFile, SD_FILE_PATH as unknown as string, (err) => {
						if (!err) {
							resolve()
						}
						else throw err
					})
				})
			}).then(() => {
				console.log(`SD file at ${SD_FILE_PATH} has been updated with ${targets.length} devices`)
				console.log()
			})
		}
	})
}

if (!process.env.API_KEY) {
	console.error('Pass an API_KEY via environment variable to connect to balenaCloud');
	process.exit(1);
} else {
	balena.auth.loginWithToken(process.env.API_KEY).then(() => {
		balena.auth.isLoggedIn().then((isLoggedIn: boolean) => {
			if (!isLoggedIn) {
				throw new Error('Authentication Error')
			}
		})
	});
}

const REFRESH_RATE: number = process.env.REFRESH_RATE as unknown as number || 5000;
setInterval(() => {
	balena.settings.get('proxyUrl').then((proxyUrl: string) => {
		writeDevices(proxyUrl);
	});
}, REFRESH_RATE as unknown as number);
