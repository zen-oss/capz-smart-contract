.PHONY: dev
dev:
	$(CURDIR)/dev/geth js $(CURDIR)/dev/test-init.js
	$(CURDIR)/dev/geth console

purge:
	@rm -rf /var/tmp/geth

clean:
	@rm -f "$(CURDIR)/run-test"

run-test: contracts/*.sol test/*.js
	@touch "$(CURDIR)/run-test"
	npx truffle test

watch-test: clean
	@-npx truffle test
	@inotifywait contracts/ test/ -mq -e modify,close_write,create,delete | while read; \
	  do \
	    $(MAKE) -s run-test || true; \
	  done \
