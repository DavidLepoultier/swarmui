#!/bin/bash

cd  ~/orange/OPE/Ansible
role_hist=""
filename_hist=""
type_hist=""
nwe_key=""
printf "["
grep -nR "{{" roles/* | grep -v ".sql:" | grep -v "README.md" | grep -v item | grep -v "\- name" | while read line
do
	filename=`echo $line | awk -F":" '{print $1}'`
	linenumber=`echo $line | awk -F":" '{print $2}'`
	filename1=`echo $filename | awk -F"/" '{print $4}'`
	filename2=`echo $filename | awk -F"/" '{print $5}' | awk -F":" '{print $1}'`
	filename3=`echo $filename | awk -F"/" '{print $6}' | awk -F":" '{print $1}'`
	if [ "$filename2" != "" ];then
		filename1=${filename1}/${filename2}
	fi
	if [ "$filename3" != "" ];then
		filename1=${filename1}/${filename3}
	fi
	role=`echo $filename | awk -F"/" '{print $2}'`
	type=`echo $filename | awk -F"/" '{print $3}'`
	key1="{\"keyname\":\"`echo $line | awk -F"{{" '{print $2}' | awk -F"}}" '{print $1}' | tr -d '[:space:]' | sed 's/"/\\\\\\\\\"/g'`\"}"
	key2=`echo $line | awk -F"{{" '{print $3}' | awk -F"}}" '{print $1}' | tr -d '[:space:]' | sed 's/"/\\\\\\\\\"/g'`
	if [ "$key2" != "" ]; then
		key1="$key1,{\"keyname\":\"$key2\"}"
		key3=`echo $line | awk -F"{{" '{print $4}' | awk -F"}}" '{print $1}' | tr -d '[:space:]' | sed 's/"/\\\\\\\\\"/g'`
		if [ "$key3" != "" ]; then
			key1="$key1,{\"keyname\":\"$key3\"}"
			key4=`echo $line | awk -F"{{" '{print $5}' | awk -F"}}" '{print $1}' | tr -d '[:space:]' | sed 's/"/\\\\\\\\\"/g'`
			if [ "$key4" != "" ]; then
				key1="$key1,{\"keyname\":\"$key4\"}"
				key5=`echo $line | awk -F"{{" '{print $6}' | awk -F"}}" '{print $1}' | tr -d '[:space:]' | sed 's/"/\\\\\\\\\"/g'`
				if [ "$key5" != "" ]; then
					key1="$key1,{\"keyname\":\"$key5\"}"
					key6=`echo $line | awk -F"{{" '{print $7}' | awk -F"}}" '{print $1}' | tr -d '[:space:]' | sed 's/"/\\\\\\\\\"/g'`
					if [ "$key6" != "" ]; then
						key1="$key1,{\"keyname\":\"$key6\"}"
						key7=`echo $line | awk -F"{{" '{print $8}' | awk -F"}}" '{print $1}' | tr -d '[:space:]' | sed 's/"/\\\\\\\\\"/g'`
						if [ "$key7" != "" ]; then
						key1="$key1,{\"keyname\":\"$key7\"}"
						fi
					fi
				fi
			fi
		fi
	fi
	if [ "$role_hist" != "$role" ];then
		if [ "$role_hist" != "" ];then
			printf "]}]}]},"
		fi
		type_hist=""
		printf "{\"role\":\"$role\",\"$role\":["
	fi
	if [ "$type_hist" != "$type" ];then
		if [ "$type_hist" != "" ];then
			printf "]}]},"
		fi
		filename_hist=""
		printf "{\"type\":\"$type\",\"$type\":["
	fi
	if [ "$filename_hist" != "$filename1" ];then
		if [ "$filename_hist" != "" ];then
			printf "]},"
		fi
		new_key=""
		printf "{\"filename\":\"$filename1\",\"$filename1\":["
	fi
	if [ "$new_key" != "" ];then
		printf ","
	fi
	printf "{\"linenumber\":\"$linenumber\",\"keynames\":[$key1]}"
	role_hist=$role
	filename_hist=$filename1
	type_hist=$type
	new_key=$key1
done
printf "]}]}]}]"



