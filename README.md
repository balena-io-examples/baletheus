# balenaCloud Prometheus file sd example

Monitor your balenaCloud devices with Prometheus directly via the file service discovery mechanism.

Deploy directly to balenaCloud to run a Prometheus instance with a sidecar file sd daemon.

To deploy:

1. Create an account on balenaCloud
1. Provision a device
1. Set the API_KEY value in the `docker-compose.yml` file

The file sd sidecar writes to a shared volume that Prometheus reads from directly.

## NOTE:

At this point, the scraping only works on the same network. Support for public URL scraping is coming, stay tuned!
