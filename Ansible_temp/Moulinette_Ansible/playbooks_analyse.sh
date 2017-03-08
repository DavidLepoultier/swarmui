#!/bin/bash
filename_hist=""
role_hist=""
new_key=""
printf "["
grep -n "role:" playbook-* | while read line
do
	filename=`echo $line | awk -F":" '{print $1}'`
	linenumber=`echo $line | awk -F":" '{print $2}'`
	role=`echo $line | awk -F":" '{print $4}' | awk -F"," '{print $1}' | tr -d '[:space:]'`
	if [ "$filename_hist" != "$filename" ];then
		if [ "$filename_hist" != "" ];then
			printf "]},"
		fi
		new_key=""
		printf "{\"filename\":\"$filename\",\"roles\":["
	fi
	if [ "$new_key" != "" ];then
		printf ","
	fi
	printf "{\"linenumber\":\"$linenumber\",\"role\":\"$role\"}"
	filename_hist=$filename
	new_key=$filename
done
printf "]}]"



