FROM alpine:3.3

# Install base packages
RUN apk update && apk upgrade && \
    apk add curl wget bash tree

COPY dist /

EXPOSE 9000

ENTRYPOINT ["/swarmui.sh"]
CMD ["/bin/bash"]

