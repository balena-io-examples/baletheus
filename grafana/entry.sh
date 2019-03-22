#!/bin/bash
setcap 'cap_net_bind_service=+ep' /usr/sbin/grafana-server
grafana-server -homepath /usr/share/grafana -config /etc/grafana/grafana.ini
