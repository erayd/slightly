BROWSERIFY := node_modules/.bin/browserify
MINIFY := node_modules/.bin/minify
PRETTIER := node_modules/.bin/prettier
AJV := node_modules/.bin/ajv

CLEAN_FILES := $(wildcard *.dist.js *.min.js) schema.js
PRETTIER_FILES := slightly.js schema.json

.PHONY: all
all: deps prettier slightly.dist.js slightly.min.js

.PHONY: deps
deps:
	yarn install

.PHONY: prettier
prettier: $(PRETTIER)
	$(PRETTIER) --write $(PRETTIER_FILES)

.PHONY: clean
clean:
	rm -rf $(CLEAN_FILES)

slightly.dist.js: slightly.js schema.json
	$(AJV) compile -s schema.json -o schema.js
	$(BROWSERIFY) -p esmify -o slightly.dist.js slightly.js

slightly.min.js: slightly.dist.js
	$(MINIFY) slightly.dist.js > slightly.min.js
