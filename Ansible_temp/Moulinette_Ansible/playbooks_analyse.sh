#!/bin/bash
filename_hist=""
printf "["
grep -n "roles" playbook-* | while read line
do
	filename=`echo $line | awk -F":" '{print $1}'`
	if [ "$filename_hist" != "$filename" ];then
		if [ "$filename_hist" != "" ];then
			printf "]},"
		fi
		new_key=""
		printf "{\"filename\":\"$filename\",\"roles\":["
	fi
	filename_hist=$filename
done
printf "]}]"



