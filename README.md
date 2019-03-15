# baletheus: balenaCloud Balena Service Discovery for Prometheus

Monitor your balenaCloud devices with Prometheus directly via the file service discovery (sd) mechanism.

## How to use:

Deploy directly to balenaCloud to run a Prometheus instance with a sidecar file sd daemon.
The file sd sidecar writes to a shared volume that Prometheus reads from directly.

## To deploy:

1. Create an account on balenaCloud
1. Provision a device
1. Set the API_KEY value in the `docker-compose.yml` file
1. Access the Prometheus instance via public URL port 80

## baletheus Configuration options

Pass in an API_KEY value in the `docker-compose.yml` file or in the environment

```sh
--filePath/-f=PATH : File path to write devices to
	REQUIRED
--refresh/-r=NUMBER : Refresh interval (ms)
	REQUIRED
--publicUrls/-p : Enable scraping via public URL
	BOOLEAN
--writeEmpty/-z : Enable writing file without any devices (disable failsafe)
	BOOLEAN
```

## NOTE:

At this point, only one sidecar per device is supported. A meta-exporter is in the works, stay tuned!
