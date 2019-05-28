#!/bin/bash -x
setcap 'cap_net_bind_service=+ep' /usr/sbin/grafana-server
/app/api.sh &
grafana-server -homepath /usr/share/grafana -config /etc/grafana/grafana.ini
