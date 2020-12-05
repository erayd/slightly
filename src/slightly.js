"use strict";

import { default as validateConfig } from "./schema.js";
import * as jsyaml from "js-yaml";
import MarkdownIt from "markdown-it";

(function() {
    /**
     * If a meta tag for this value exists, run the provided callback
     *
     * @param string name
     * @param function(value) callback
     * @return Promise
     */
    function meta(name) {
        let n = document.querySelector(`meta[name="slightly-${name}"][content]`);
        if (n) return Promise.resolve(n.getAttribute("content"));
        else return Promise.reject(new Error(`Slightly parameter not defined: ${name}`));
    }

    // default config
    var config = {
        template: undefined,
        target: undefined,
        prefix: "",
        suffix: "",
        env: {}
    };

    // load config & initialise window.site
    meta("config")
        .then(url => {
            return fetch(url)
                .then(r => (r.ok ? r.json() : Promise.reject(r)))
                .then(c => {
                    if (!validateConfig(c)) return Promise.reject(new Error("Invalid config"));
                    for (let key in config) {
                        if (c.hasOwnProperty(key)) config[key] = c[key];
                    }
                })
                .catch(r => {
                    return Promise.reject(new Error(`Unable to load config (${r.status}): ${url}`));
                });
        })
        .catch(err => {
            console.log(err);
        })
        .then(() => {
            var site = (window.site = new Slightly(config));
            site.render();
        });

    /**
     * Main CMS class
     */
    class Slightly {
        constructor(config) {
            Object.defineProperty(this, "config", {
                value: Object.assign({}, config),
                enumerable: true,
                writable: false
            });
            Object.freeze(this.config);
        }

        /**
         * Render the page
         */
        render() {
            this.page()
                // load template
                .then(p => {
                    if (!p.config.template) return Promise.resolve(p);
                    let cache = {};
                    function fetchCached(url) {
                        if (cache.hasOwnProperty(url)) return Promise.resolve(cache[url]);
                        return (cache[url] = fetch(url).then(r =>
                            r.ok ? r.text() : Promise.reject(`Unable to load template: ${url}`)
                        ));
                    }
                    function resolve(templates) {
                        return Promise.all(
                            templates.map(t => {
                                return fetchCached(t[0]).then(html => {
                                    let d = new DOMParser().parseFromString(html, "text/html");
                                    let s = d.querySelector(t[2]) || d.documentElement;
                                    t[1].replaceWith(s);
                                    return resolve(
                                        [...s.querySelectorAll("[slightly-template]")].map(t => [
                                            t.getAttribute("slightly-template"),
                                            t,
                                            t.getAttribute("slightly-selector")
                                        ])
                                    );
                                });
                            })
                        ).then(discard => p);
                    }

                    return resolve([[p.config.template, document.documentElement]]);
                })
                // inject content
                .then(p => {
                    // document
                    if (p.config.target) {
                        let t = document.querySelector(p.config.target) || document.body;
                        while (t.firstChild) t.removeChild(t.firstChild);
                        while (p.content.body.firstChild) t.appendChild(p.content.body.firstChild);
                        this.scripts(
                            p.config.template ? document : document.querySelector(p.config.target)
                        );
                    } else {
                        document.documentElement.replaceWith(p.content.documentElement);
                        this.scripts(document);
                    }

                    // variables
                    document.querySelectorAll("[slightly-env]").forEach(el => {
                        let matches = el.getAttribute("slightly-env").match(/^env.(.+)/u);
                        if (matches) el.textContent = p.config.env[matches[1]] || "undefined";
                        else
                            el.textContent =
                                p.config[el.getAttribute("slightly-env")] || "undefined";
                    });

                    // toc
                    document.querySelectorAll("[slightly-toc]").forEach(toc => {
                        let ol = p.toc(parseInt(toc.getAttribute("slightly-toc")) || 6);
                        if (ol) toc.replaceWith(ol);
                        else toc.parentNode.removeChild(toc);
                    });

                    // set title
                    if (!document.querySelector("title")) {
                        let t = document.createElement("title");
                        document.head.appendChild(t);
                    }
                    document.querySelector("title").textContent = p.config.title;

                    // set description
                    if (p.config.description) {
                        let description = document.querySelector("meta[name='description']");
                        if (!description) {
                            description = document.head.appendChild(document.createElement("meta"));
                            description.setAttribute("name", "description");
                        }
                        description.setAttribute("content", p.config.description.trim());
                    }
                })
                .catch(err => {
                    console.log(err);
                    throw err;
                });
        }

        /**
         * Reinject & run any script tags within the given target element
         *
         * @param DOMElement target
         */
        scripts(target) {
            target.querySelectorAll("script").forEach(script => {
                var s = document.createElement("script");
                s.innerHTML = script.innerHTML;
                for (let a of script.attributes) {
                    s.setAttribute(a.name, a.value);
                }
                script.parentNode.replaceChild(s, script);
            });
        }

        /**
         * Fetch & process the page at the given path
         *
         * @param string path
         * @return object
         */
        page(path) {
            var mdPath = `${window.location.pathname}.md`.replace(/\/\.md$/iu, "index.md");
            return fetch(mdPath)
                .then(r => (r.status < 500 ? r.text() : Promise.reject(r)))
                .then(md => {
                    var config = {
                        title: "Untitled Page",
                        template: this.config.template,
                        target: this.config.target,
                        prefix: this.config.prefix,
                        suffix: this.config.suffix,
                        description: undefined,
                        env: Object.assign({}, this.config.env)
                    };
                    let matches = md.match(/^(?:---\r?\n\r?(.*)\r?\n\r?---\r?\n\r?)?(.*)/su);
                    if (!matches) throw new Error(`Invalid content document: ${mdPath}`);
                    if (matches[1]) {
                        let yaml = jsyaml.safeLoad(matches[1]);
                        if (!validateConfig(yaml)) throw new Error("Invalid frontmatter config");
                        for (let key in config) {
                            if (config.hasOwnProperty(key) && yaml.hasOwnProperty(key)) {
                                if (typeof config[key] === "object")
                                    Object.assign(config[key], yaml[key]);
                                else config[key] = yaml[key];
                            }
                        }
                    }
                    config.title = `${config.prefix}${config.title}${config.suffix}`;
                    let html = new MarkdownIt({ html: true, typographer: true }).render(matches[2]);
                    let content = new DOMParser().parseFromString(html, "text/html");
                    let toc = this.toc(content.body);
                    return { config, content, toc };
                })
                .then(p => {
                    // post-process images
                    p.content.querySelectorAll("img[src*='#']").forEach(img => {
                        if (img.parentNode.childElementCount === 1) img.parentNode.replaceWith(img);
                        let f = document.createElement("figure");
                        f.style.maxWidth = img.style.maxWidth;
                        img.style.maxWidth = "100%";
                        f.style.maxHeight = img.style.maxHeight;
                        img.style.maxHeight = "100%";
                        img.replaceWith(f);
                        f.appendChild(img);
                        if (img.alt) {
                            let c = document.createElement("figcaption");
                            c.textContent = img.alt;
                            f.appendChild(c);
                        }
                        let [, src, format] = img.src.match(/(.*?)#(.*)/u);
                        img.src = src;
                        decodeURI(format)
                            .split(";")
                            .forEach(attr => {
                                let matches = attr.trim().match(/^(.+?)(?:\s*=\s*(.+))?$/);
                                if (!matches) return;
                                let [, key, val] = matches;
                                switch (key) {
                                    case "w":
                                        f.style.width = val;
                                        break;
                                    case "h":
                                        f.style.height = val;
                                        break;
                                    default:
                                        f.classList.add(key);
                                        break;
                                }
                            });
                    });

                    return p;
                })
                .catch(err => {
                    console.log(err);
                    return Promise.reject(new Error(`Unable to load content: ${mdPath}`));
                });
        }

        /**
         * Generate TOC structure
         *
         * @param DOMNode target
         * @return DOMElement
         */
        toc(target) {
            let d = target.ownerDocument;
            let i = 1;
            let links = [];
            let names = [];
            // create anchors
            target.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(h => {
                let name = h.textContent
                    .toLowerCase()
                    .trim()
                    .replace(/[^\w-]+/gu, "-")
                    .replace(/-+$/i, "");
                if (names.includes(name)) name += `-${i}`;
                names.push(name);

                let a = d.createElement("a");
                a.setAttribute("name", name);
                h.insertAdjacentElement("beforeBegin", a);
                links.push({
                    index: i,
                    level: parseInt(h.nodeName.match(/([0-9])/)[0]),
                    text: h.textContent,
                    name
                });
                i++;
            });

            return function(maxLevel) {
                // build toc structure
                let top = d.createElement("ol");
                top.level = 1;

                let ol = top;
                for (let l of links) {
                    if (l.level > maxLevel) continue;
                    let a = d.createElement("a");
                    a.setAttribute("href", `#${l.name}`);
                    a.textContent = l.text;
                    while (l.level > ol.level) {
                        let level = ol.level;
                        if (!ol.childElementCount) ol.appendChild(d.createElement("li"));
                        ol = ol.lastChild.appendChild(d.createElement("ol"));
                        ol.level = ++level;
                    }
                    while (l.level < ol.level) {
                        ol = ol.parentNode.closest("ol");
                    }
                    let li = ol.appendChild(d.createElement("li"));
                    li.appendChild(a);
                }
                while (top && top.childElementCount === 1) top = top.querySelector("ol");
                top.classList.add("slightly-toc");

                return top;
            };
        }
    }
})();
