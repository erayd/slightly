VERSION ?= $(shell cat .version)

.PHONY: all
all: package

.PHONY: package
package:
	$(MAKE) -C src

.PHONY: live
live: package
	echo "$(VERSION)" > .version
	[ -d public/dist ] || mkdir -p public/dist
	cp src/slightly.dist.js public/dist/slightly-$(VERSION).dist.js
	cp src/slightly.min.js public/dist/slightly-$(VERSION).min.js
	rm -f public/dist/slightly-latest.{dist,min}.js
	ln -rs public/dist/slightly-$(VERSION).dist.js public/dist/slightly-latest.dist.js
	ln -rs public/dist/slightly-$(VERSION).min.js public/dist/slightly-latest.min.js
	for f in $(VERSION).dist $(VERSION).min latest.dist latest.min; do \
	    HASH="sha256-$$(openssl dgst -sha256 -binary public/dist/slightly-$$f.js | openssl base64 -A)"; \
	    echo "$$HASH" > public/dist/slightly-$$f.js.sri; \
	done
	cp .version public/dist/version

.PHONY: release
release: live
	git add .version public/dist
	git commit -m "v$(VERSION)"
	git tag "v$(VERSION)"

.PHONY: clean
clean:
	$(MAKE) -C src clean
