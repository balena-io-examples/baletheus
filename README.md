# baletheus: balenaCloud Service Discovery for Prometheus

Monitor your balenaCloud devices with Prometheus directly via the file service discovery (sd) mechanism.

## How to use:

This project will deploy a full Prometheus instance to a device, along with a sidecar for balenaCloud device discovery.
By default the device discovery will include all devices owned by the user who deploys this project.

Deploy directly to balenaCloud to run a Prometheus instance with a sidecar sd daemon.
The sd sidecar writes to a shared volume that Prometheus reads from directly.

## To deploy:

1. Create an account on [balenaCloud](https://dashboard.balena-cloud.com)
1. [Provision a device](https://www.balena.io/docs/learn/getting-started/raspberrypi3/nodejs/)
1. [Deploy this project to the application containing the
   device](https://www.balena.io/docs/learn/getting-started/raspberrypi3/nodejs/#deploy-code)
1. Generate an [API key](https://www.balena.io/docs/learn/manage/account/#api-keys) to use in this project
1. [Set the API_KEY value in balenaCloud](https://www.balena.io/docs/learn/manage/serv-vars/)
1. Access the Prometheus instance via public URL port 80
* Note that if you are using public URLs, you will need to do that manually (the daemon does not modify that property on
  the devices)

## baletheus Configuration options

All runtime configuration is done via environment variables:

| Environment Variable Name | Type | Required? | Use |
|:-----------|:------------|:------------|:------------|
| `API_KEY` | string | true | Key to access balenaCloud API |
| `SD_FILE_PATH` | string | false | File path to write devices to |
| `REFRESH_RATE` | number | false | Refresh interval (ms) (default | 5000) |
| `USE_PUBLIC_URLS` | boolean | false | Enable scraping via public URL |
| `WRITE_EMPTY` | boolean | false | Enable writing file without any devices (disable failsafe) |

## Labels:

Exported labels include:

| Label | Type |
|:-----------|:------------|
| device_name | string |
| uuid | string |
| device_type | string |
| commit | string |
| os_version | string |
| os_variant | string |
| supervisor_version | string |

## NOTE:

At this point, only one sidecar per device is supported. A meta-exporter is in the works, stay tuned!
