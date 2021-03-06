Slightly
========

Slightly is a small, client-side template engine that uses static markdown files
to manage content.

## Usage

Include the following code within the head of your index page. 

    <script defer src="https://slightly.erayd.net/dist/slightly-latest.min.js" crossorigin></script>
    <meta name="slightly-config" content="/config.json" />

If a template is not specified, then the index page will be used. All paths on
your site that do not map to a file should be configured on the webserver to
return the index page.

## Configuration

Slightly uses two configuration methods. The first is a site-wide configuration
file, and the other is an optional YAML frontmatter section for each markdown
page.

### Config File

The config file may be located wherever is convenient. The following meta tag
must be present:

    <meta name="slightly-config" content="/url/for/config.json" />

The config file takes the following format:

    {
        "template": "/url/for/template.html",
        "target": "#selector-to-inject-page-content",
        "prefix": "Title Prefix",
        "suffix": "Title Suffix"
    }

Any value within this file may be overridden by individual pages. All are
optional.

| Parameter   | Purpose                                            |
| :---------- | :------------------------------------------------- |
| `template`  | Path to the template file used to display pages    |
| `target`    | HTML selector for where to inject the page content |
| `prefix`    | Prefix to apply to the page title                  |
| `suffix`    | Suffix to apply to the page title                  |

### YAML Frontmatter

Pages may include optional YAML frontmatter as follows:

    ---
    title: "Page Title",
    template: "/url/for/template.html",
    target: "#selector-to-inject-page-content",
    description: "This is the page meta description"
    ---
    # Markdown Document

    This is some markdown content.

The parameters available here override any that may be set in the config file.
All are optional.

| Parameter     | Purpose                                            |
| :------------ | :------------------------------------------------- |
| `title`       | Page HTML title                                    |
| `template`    | Path to the template file used to display pages    |
| `target`      | HTML selector for where to inject the page content |
| `prefix`      | Prefix to apply to the page title                  |
| `suffix`      | Suffix to apply to the page title                  |
| `description` | Page meta description                              |

## Content

Content is provided as simple static  markdown files, with optional YAML
[frontmatter](#yaml-frontmatter). It should be present on the webserver at the
request path, with a `.md` file extension.

### Images

Images will be rendered inside `<figure>` blocks. If the image has an `alt`
attribute, the contents of that will be appended after the image as a
`<figcaption>`.

Some basic styling of the figure is possible using the fragment portion of the
image URL. This consists of a semicolon-separated set of key / value pairs. The
value is optional.

Any unrecognised key is added to the figure as a class, and the value is
discarded.

    ![Image caption](/url/of/image.jpg#right;w=50%;my-class)

The above example will display a right-floated figure, 50% wide, with the class
`my-class`.

| Key     | Description            |
| :------ | :--------------------- |
| `left`  | Float the figure left  |
| `right` | Float the figure right |
| `w`     | Set the figure width   |
| `h`     | Set the figure height  |

### 404 Errors

In order to return the correct HTTP status code, any request for which the
request path does not have a corresponding markdown file (e.g. if `/not-a-file`
is requested, and the file `/not-a-file.md` does not exist) should be configured
to return a 404 status code. There are no other considerations necessary.

Custom 404 pages using the main template engine are not currently implemented,
but will be available in a future version.

## Templates

Slightly templates are just regular HTML files. If you wish to include
sub-templates, you can do so as follows:

    <div slightly-template="/path/to/sub-template.html" slightly-selector="#sub-fragment"></div>

The tag may be of any kind, and does not need to be a div. It will be replaced
by the included sub-template. The `slightly-selector` attribute is optional, but
if present then the first matching element of the sub-template will be used. If
absent, then the sub-template document element will be used.

Templates may be listed to any level, however care must be taken not to nest
them recursively.

### Table of Contents

If you wish to include a table of contents, simply add the `slightly-toc`
attribute to any element. This element will be replaced with a generated TOC.
The TOC attribute may be used on more than one element, and may even appear
within a content markdown file.

The value of this attribute should be set to the maximum level of heading you
wish to include. By default, all headings will be included. If there are no
available headings that fit within the selected level, the TOC element will
simply be deleted.

    <div slightly-toc="3"></div>

If the top level of the TOC contains only one heading, it will be omitted, and
the next level of heading will be promoted. This promotion mechanism does *not*
affect the level of heading selected by `slightly-toc`.
