# Monitoring all the way down
### Self-similar monitoring for the edge

## Introduction
Properly monitoring a fleet of devices is an evolving art. One of the current leaders in the server world for
application and hardware monitoring is [Prometheus](https://prometheus.io/), both for bare metal and as a first-class
citizen in the Kubernetes world. In order to reduce the friction between the edge and the cloud, this project will
deploy a Prometheus stack to monitor an entire fleet of [balenaCloud](https://balena.io/cloud) devices (from a balena
device, nonetheless!).

We have [showcased](https://www.balena.io/blog/monitoring-linux-stats-with-prometheus-io/) Prometheus a few [other
times](https://www.balena.io/blog/prometheusv2/), and this tutorial expands on those to provide a fair bit more
functionality.

This demo is the first part of a series on how to monitor your stack & fleet with Prometheus, everything from service
discovery to instrumentation to alerting. Stay tuned for future updates!

The finished product:
![node-exporter](https://github.com/balena-io-playground/baletheus/blob/master/node-exporter.png "Graphing metrics")

## Goals
Here are our goals with this tutorial:

1. **Prometheus** monitoring stack monitoring a discovered fleet (from the fleet nonetheless!)
1. Integrated **[Grafana](https://grafana.com/)** for visualization also deployed to balena device(s)
1. **Service discovery** mechanism to automatically detect new devices
1. Basic machine monitoring deployed to a device using one open source exporter to expose service metrics
  * Note: for this tutorial, we will limit ourselves to **one open source exporter** (exporters are services that expose
	metrics for Prometheus to ingest) for simplicity's sake. Stay tuned for later installments where we will dive into
	running multiple exporters and instrumenting custom code!

## Requirements

1. Two applications, one to do the monitoring (let us call this `monitor`) and one to be monitored (call this
   application `thingy`)
1. This design is especially powerful if the application is
   [multicontainer](https://www.balena.io/docs/learn/develop/multicontainer/), though it need not be.

## Set up

### `monitor` application
1. The monitoring stack can be deployed to many different locations. In this example, we will deploy it to balenaCloud
   and run it on a device within the fleet. [Sign up for free](https://dashboard.balena-cloud.com/signup) if you don’t
   already have an account.
1. Start by creating an application to deploy to. For the sake of the demo, let us call it `monitor`.
1. Since the service discovery is configured purely via an environment variable, we will want to preset some to ensure
   our monitoring starts up without a hitch.
1. [Generate an API key](https://www.balena.io/docs/learn/manage/account/#api-keys) and save the key in your application
   as an environment variable named `API_KEY`.
1. If you plan to monitor remotely (i.e. via the public URLs), set an environment variable `USE_PUBLIC_URLS` to `true`
1. Next, clone the example repository [here](https://github.com/balena-io-playground/baletheus) and push it to your
   newly-created application using `balena push` or `git` ([read
   more](https://www.balena.io/docs/learn/deploy/deployment/)).
1. If you now enable the [public URL](https://www.balena.io/docs/learn/manage/actions/#enable-public-device-url) of the
   device(s) running the `monitor` application and navigate to the public URL, you should be able to view and access
   your very own Grafana instance.
   * Note: the default username/password is admin/admin, we recommend you change that as soon as you log in for the
	 first time (Grafana will prompt you).

### `thingy` application
1. If you do not already have an application running that you would like to instrument, you can create a new application
   for demo purposes. Let us call this application `thingy`.
1. At a bare minimum, to get the most from your device you will want to run
   [`node_exporter`](https://github.com/prometheus/node_exporter), which exports machine metrics like packet counters
   and memory usage. We will use this exporter to show how to configure and scrape a device, but there are many other
   useful exporters that may interest you as well:
  * [MQTT exporter](https://github.com/inovex/mqtt_blackbox_exporter)
  * [Redis exporter](https://github.com/oliver006/redis_exporter)
  * [OpenVPN exporter](https://github.com/kumina/openvpn_exporter)
  * [Redis exporter](https://github.com/oliver006/redis_exporter)
  * [PostgreSQL exporter](https://github.com/wrouesnel/postgres_exporter)
  * Scan [this list](https://github.com/prometheus/prometheus/wiki/Default-port-allocations) for any other open-source
	code you may be running. If an exporter exists for your preferred database/message queue/application, it is always a
	good practice to track it. Since there are many pre-baked exporters and
	[dashboards](https://grafana.com/dashboards), you can monitor almost everything you did not write with minimal
	setup. The real power comes when instrumenting your own code, more on that in another post!
1. Using our [`node_exporter` example](https://github.com/balena-io-playground/balena-device-node-exporter), add your exporter to your
`docker-compose.yml` to configure the on-device scraping process. If you are not using multicontainer mode, you can just
daemonize the `node_exporter` process as part of your single container application.
1. If using public URLs, ensure that the [public URLs are
enabled](https://www.balena.io/docs/learn/manage/actions/#enable-public-device-url) for the devices you want to monitor.
1. Find or create a dashboard in Grafana to visualize what you need from the data you are now collecting (make sure the
`datasource` type is Prometheus!)
   * If you are following along with the `node_exporter` example, we recommend using [this sample
	 dashboard](https://grafana.com/dashboards/405).
1. Drop the dashboard json blob into the `grafana/dashboards` directory, following the `node_exporter` example
[here](https://github.com/balena-io-playground/baletheus/blob/master/grafana/provisioning/dashboards/node-exporter-server-metrics_rev8.json).

Upon completion, `baletheus` should log letting you know it is updating the registry of devices:

![baletheus-logging](https://github.com/balena-io-playground/baletheus/blob/master/baletheus-logging.png "baletheus logging")

## Bonus points

The real power of PromQL (Prometheus' query language) comes when filtering by tags, which are metadata associated with
different timeseries. Since `baletheus` by default exposes a bevy of tags to Prometheus, it is trivial to begin
dissecting your data by commit/OS version/device type. This feature will allow you to track changes side-by-side and be
more sure than ever when promoting a new OS version or code release to production.

At this point, you should be able to monitor any number of (single) exporters and create beautiful graphs and
visualizations for those devices/exporters/applications. This tutorial is just the tip of the iceberg, Grafana and
Prometheus are incredibly active communities that are evolving every day. Some other things potentially worth
investigating (though mostly outside the scope of this tutorial):

* Instrument your own code and export only the metrics you see fit
* Configuring and managing alerting via [Alertmanager](https://prometheus.io/docs/alerting/alertmanager/)
* Monitoring various cloud providers usage via Grafana ([HetznerCloud](https://github.com/promhippie/hcloud_exporter),
  [AWS CloudWatch](https://github.com/prometheus/cloudwatch_exporter),
  [GitHub](https://github.com/promhippie/github_exporter))
* Lock down Grafana to [authenticate via third-party authentication
  provider](http://docs.grafana.org/installation/configuration/#auth)
* Connect Grafana to other datasources via [plugins](https://grafana.com/plugins)
  ([Pagerduty](https://grafana.com/plugins/xginn8-pagerduty-datasource),
  [Datadog](https://grafana.com/plugins/grafana-datadog-datasource),
  [sensu](https://grafana.com/plugins/grafana-sensu-app1))

## Final notes

Grafana and Prometheus are both fairly robust, resource-intensive applications. While it is possible to deploy a full
monitoring stack following the instructions above if you have any data retention requirements we recommend either
[streaming the timeseries to a persistent
backend](https://prometheus.io/docs/operating/integrations/#remote-endpoints-and-storage) or deploying directly in the
cloud for any production deployment. Prometheus makes use of persistent storage (which can shorten the life of some
media like SD cards), though Grafana should be fully configurable proscriptively.

This tutorial has been adjusted to make Grafana as lightweight as possible to run on an edge device. Since this tutorial
attempts to minimize disk writes, upon every subsequent deploy the admin password will need to be reset.

Alternatively, feel free to configure [a more persistent storage
medium](https://grafana.com/docs/installation/configuration/#database) One of the niceties of a pull-based monitoring
system is you can redeploy the same stack in multiple places without reconfiguring the clients, saving the headache of
changing the whole fleet. Tell us how you monitor your own stack & fleet in the [forums](https://forums.balena.io/)!

## Pictures are worth more

![data flow for baletheus](https://github.com/balena-io-playground/baletheus/blob/master/prometheus-v3.png "Data flow diagram")

## Glossary
#### [Prometheus](https://prometheus.io/):
* Pull-based monitoring system and time series database
#### [Grafana](https://grafana.com/):
* Visualization platform for time series data
#### [Alertmanager](https://prometheus.io/docs/alerting/alertmanager/):
* Prometheus-project secondary component that handles alerting
#### service discovery:
* Supported mechanism to add new scrape targets to Prometheus backend
#### sidecar:
* Process that runs alongside an application, aggregating data and exporting when scraped by Prometheus
#### exporter:
* Sidecar process that runs alongside an application and returns metrics describing the state of the application
