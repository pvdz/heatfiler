# Heatfiler
## JS profiler slash code coverage reporting tool

### Summary

Heatfiler allows you to easily run through your code and find the heavy points. Alternatively, you can use it to figure out which parts of your code are unused. It does this, for both cases, with a visueal heatmap which updates live as the code runs. It can either run on the same page (profiler and code) or in two different tabs, communicating through `localStorage`. There is also support for tracing a nodejs project this way.

It's fairly easy to integrate Heatfiler into an existing web project (unless it uses a module loader of some kind, like requirejs) by modifying the script tags and including Heatfiler. There are some examples in the project to demonstrate this. For nodejs it's even easier, though that requires some kind of webserver to work with.

The initial version was hacked together in about two days. The current version contains some more work. It uses [ZeParser2](http://github.com/qfox/zeparser2/) as the JS parsing and rewriting backend.

## Demo

See [heatfiler.qfox.nl](http://heatfiler.qfox.nl/#run,files,here) for a live demo of the profiler.

Alternatively you can visit [the github version](https://qfox.github.io/heatfiler/src/index.html#run,files,here) which is probably more up to date :)

There is an example, you can [click here](https://qfox.github.io/heatfiler/src/#run,files,here,start) to immediately run it.

I've also added three integration examples. Open one of:
- http://heatfiler.qfox.nl/dragon/
- http://heatfiler.qfox.nl/parallax/
- http://heatfiler.qfox.nl/js1k/

and then open [heatfiler](http://localhost/heatfiler/src/#listen,immediately) in another tab (if not starting, click "Listen" tab and go). The heatmap updates real-time.

## How it works

The profiler parses your script, injects "ping" calls into statements and expressions, and runs it. These "pings" will simply count how many times a certain (small) part of the script is executed. These stats are collected and processed. They are represented in the heatmap in a shade of red which signifies how often that part is executed. Red parts mean the script is executed often. To determine this it will check which part was called most often. All other counts are relative to this number. The shade of red is too.

The rewriting occurs with a set of rules that are "safe" and should not change the working of the code (though there might still be a bug for very obscure syntax, please report them if you find any). It should be possible for virtually any code to be rewritten this way. I've tried my best to catch'em'all :)

The code coverage does almost exactly the same thing as the profiler, except, of course, that it only highlights in red those parts which were never executed.

## Build

Note that the build directory contains a built file (`heatfiler-build.js`). This file (should be up to date, but check commits to be sure) already includes zeparser2 and is a single .js resource to include in your projects, or nodejs. It's not minified, but I don't think that is important since this is a debugging tool. If the build is not up to date or you just want to build it yourself you can run `bin/build.js` from the project root.

## UI

![Tabs](https://f.cloud.github.com/assets/209817/1846699/51163758-7612-11e3-9ece-d906859bff48.png)

The first tab, "Run code", allows you to enter code to execute. You can either enter actual JavaScript code there or a bunch of file urls. You can select to run them locally, or have the results stored to `localStorage` to load in another tab.

When you enter code, it will immediately show you the translated result, though that should not be very important to you. When using files, the translation will also appear below the code when running.

The "Listen" tab is used to start polling `localStorage` for results.

The "NodeJS" tab is used to poll a nodejs project. It should have Heatfiler integrated (see below) and the output file should be "ajaxable".

The "Result" tab, initially disabled, is where the heatmap will appear once you start running code or listening for results. It will be the most interesting part ;)

## Run code

![runcode](https://f.cloud.github.com/assets/209817/1846705/ca30bc44-7612-11e3-96b2-b4863351b7fd.png)

Select whether you are inputting code or a list of files. There will be a placeholder to get you started. The placeholder looks ugly on firefox :( But only because the spec for placeholder is messed up. Just press the example button.

For code, just enter the JavaScript code. It will be included through a dynamic `<script>` tag.

For the files, enter each file on its own line;

- Prefix something with `@` to have it eval as regular code instead of file path.
- Prefix with a `+` or `-` to load it and include or exclude it from the stats. All files will be fetched and loaded (dynamic `<script>` tags) in given order.
- Without prefix, `+` is assumed.
- Prefix `#` for comments

All prefixes must be first chars. Whitespace is not ignored because I'm lazy.

## Heatmap

![heatmap](https://f.cloud.github.com/assets/209817/1846709/4dcfed4a-7613-11e3-95c1-c43851e7e17d.png)

The results tab has a few gimmicks that I'd like to highlight:

- Live updating heatmap
- Mouse hover for stats
- Expressions have truthy, falsy, and type stats
- Functions show cumulative return value stats and other stats for key statements
- Switches show case choice stats
- Browser blocked status spinner
- Exclude functions from stats
- Focus on functions
- File selection tabs
- Minimap for navigation
- Options
-- Make stats relative to this file or whole project
-- Pause refreshing the heatmap
-- Enable code coverage mode
-- Show line numbers column
-- Auto start when refreshing
-- Show list of most called functions (in this file)
-- Show list of most called statements
-- Show some JIT information (tentative)

### Heatmap

![heatmap](https://f.cloud.github.com/assets/209817/1846713/a8ef1b56-7613-11e3-9055-a3a502f0afd7.png)

The heatmap will update as the stats are updated. It will continuously poll the localStorage or nodejs file for updates and adjust the heatmap accordingly.

The map might be a bit confusing at first, due to the granularity of the map and the limitations of html/css. Sometimes it might appear as if only a small part of an expression is executed, like `foo(bar)` will only allow you to highlight `foo(` for stats. But rest assured, that part does cover the entire `foo(bar)` call. The reason it is "cut short" is that you could otherwise not hover over `bar` for it's specific stats (without screwing up other things). I might fix this in some future... More difficult is the wrapper case `({a:x})` where only `(` is highlight-able but where I would like it to highlight the entire range up to `)`.

You can click on the `function` keyword or the `⤣` icon left of one to focus on that function only. All stats will be relative to this function. Similarly you can click on `⊕` to exclude a function from the stats entirely.

The stats you see when hovering over various parts of the code can basically be split in three types:

__Statements__:
Statements that don't start with an expression can only show the run count, since they do not return a value (so no type information).

__Expressions__:
The value of expressions are also shown, either by an accumulated "truthy" or "falsy" value (T/F), or by the "typeof" result. It also includes a special case for `NaN`s.

__Functions__:
For functions the accumulated T/F is shown for all `return`s, explicit or implicit. The "types" can also include `implicit`, for implicit returns. They could be a code smell.

It also shows you how many times certain statement types inside that function were executed, like loops and switches.

Function declarations also display the declaration count as a separate value from the call count. This is because a function might be declared but never invoked (due to hoisting or simply never being called).

### Browser blocked spinner

The spinner at the top of the heatmap, shown only when running the code in the same tab as the heatmap, will show you when your code is blocking the browser UI thread (and thus preventing any scrolling or updating the heatmap visually).

It's an old trick.

### File selection tabs

![files](https://f.cloud.github.com/assets/209817/1846716/da71f798-7613-11e3-895f-5ca0d2a4886c.png)

When running files or listening to a nodejs project you will get tabs in the top-right corner for each file that was profiled.

Each file has their own stats, and using the menu you can toggle showing the highlighting relative to the stats of all files or just to the file you are currently showing.

### Minimap

![minimap](https://f.cloud.github.com/assets/209817/1846717/fa64efc4-7613-11e3-88f1-caca2220ce10.png)

An awesome feature is a code minimap that will be shown on the right of the heatmap (if the code spans more than the height of the page). This allows you to quickly navigate through your code. Just click and/or drag to the right place.

### Pause refreshing

It's possible to pause the updating process by clicking the toggle. Stats are still gathered but the heatmap is not updated to reflect this.

### Code coverage mode

![codecoverage](https://f.cloud.github.com/assets/209817/1846725/3a24cf62-7614-11e3-81fd-60e3fda0bade.png)

Since code coverage is all about code that is or is not ran, a code coverage mode was fairly trivial to implement.

Note that this is an expression based code coverage! It's more thorough than statement based coverage, but less thorough than branch based coverage.

When this mode is active, red parts of the code have not been executed so far (their count will be `0`).

### Auto start

Sometimes you'll be busy on a project and just want to see the results as you go along.

To make this refresh process a bit easier you can toggle "auto start mode", which will immediately open the heatmap with the current settings when you refresh.

### Function list

![functionlist](https://f.cloud.github.com/assets/209817/1846729/efdd27e6-7614-11e3-8901-01d80ee1f359.png)

The menu has a button called "Most called funcs", which will pop up a list of functions in this file that were called the most times. Their name is guessed and sometimes not available.

You can click on the function name to jump right to it.

### Statement list

![statementlist](https://f.cloud.github.com/assets/209817/1846732/14f5a53a-7615-11e3-9e2e-bb32c907acd0.png)

Similar to the function list, the statement list pops up a list of most executed statements.

Note that this is not about which keyword is invoked the most, the description is just so you can click through on it to see the entire line of code.

### JIT info

![jitinfo](https://f.cloud.github.com/assets/209817/1846736/5a063f2c-7615-11e3-98e3-f99d4a24eb23.png)

Heatfiler will collect type stats as well. This option will popup an overview for the functions in this file.

You can click on each result to get a list of functions that matched the result. You can use this to pinpoint additional performance problems in your code.

Generally speaking, functions with a single return type optimize better. Likewise, functions that receive the same type of arguments in every call optimize better as well.

## Macros

There are a few macros you can use to control additional inspection.

- ``/*HF:count-ranged [<numbers>] `<expression>`*/``
- ``/*HF:count-ranged [-1, 0, 3..15] `mything.length`*/``
- ``/*HF:count-ranged [0, 1, 2, 3] `currentFlag()`*/``

- ``/*HF:count-exact [<numbers>] `<expression>`*/``
- ``/*HF:count-exact [-1, 0, 3..15] `mything.length`*/``
- ``/*HF:count-exact [0, 1, 2, 3] `currentFlag()`*/``

- ``/*HF:count-any [<numbers>] `<expression>`*/``
- ``/*HF:count-any [-1, 0, 3..15] `mything.length`*/``
- ``/*HF:count-any [0, 1, 2, 3] `currentFlag()`*/``

These will make HeatFiler tally up the number of times the expression evaluated to some particular value and display these counts in the result in place of the comment. 

These count based macros pretty much do the same thing; they count value occurrences. `count-ranged` puts each (numeric) value in a bucket, `count-exact` does a `===` match, and `count-any` will count any (stringified) value as is.

The `<expression>` should be a valid JS expression in place of the comment and will be wrapped, as is, with some special metric calls. The expression is assumed to be valid to replace the macro in place. Meaning the surrounding code should be okay with the expression. In particular check if a semi-colon is needed (but don't include it in the comment) and make sure not to put it immediately after return values and such. No effort is made to validate this. The comment is simply replaced as a whole with your expression wrapped in some metrics, all leading to a single expression. Generally use this at the start of a statement and not after a `return` keyword. 

Don't use backticks in the expression, the parser has no escape mechanism. Too much an edge case. Don't blame me if you do anyways and "it works sometimes". It probably didn't work.

The `<numbers>` should be an "array".

- For `count-ranged` this should be a list of numbers, ordered low to high. HeatFiler will take each number to mean "Bigger than the previous number, lesser or equal to the current number". The first number is "preceded" by negative infinity in this sense. You can add a range of integers with two dots; `[0..3]` and separate numbers with comma's.
- For `count-exact` you can add any value. The `..` expanding trick works here as well. If you want to match strings, quote them. If you have `nn..nn` in your string this will be auto-expanded as well since the code makes no validation effort.
- For `count-any` this list is not expected, of course.

The parser for these macros is a little rigid. Some edge cases may be a problem but in general you should be fine.

## Tests

This was more of a quick hack than anything else. There's a simple test suite which I've taken from my JS parser. This does not cover everything (specifically, runtime issues) but it sufficed for me in most cases. Due to the nature of the setup of the tests, certain errors will only show once the code is actually called (right now it only creates a function to safely check for syntax errors).

Want unit tests? I'll be awaiting your pull request.

## Known problems

All in all it's still a hack. Not all possible cases are caught, though it's fairly generic. Common problems are:

- No recovery for syntactically incorrect code (if ZeParser2 doesn't grok it, Heatfiler can't run it)
- If you start to run code twice and the old code works with timers/callbacks, errors will happen
- Files (run code, nodejs) will need to be ajaxable (so requires same domain or CORS)
- Files (run code, nodejs listener) requires page to be served from webserver (for ajax)
- In web integration projects, inline event handlers are not processed

Please report translation errors to me (put an issue in the issue tracker), and I'll see what I can do about it.

## Web integration

To integrate Heatfiler into your web project the following must be done:

- Inline scripts must be translated
- External scripts must be translated (this is why module loaders don't work unless you can bootstrap them)
- Heatfiler code must be loaded
- Heatfiler must be bootstrapped

To do this, a few fairly trivial steps have to be taken (but this might not be that trivial depending on the complexity of your project):

- For every script (file or tag) you want profiled, set `type="profile"` in the `<script>` tag
- For every other script file, set `type="noprofile"` in the `<script>` tag
- Include the build file for Heatfiler (`/build/heatfiler-build.js`) anywhere (don't set type on this tag)
- Bootstrap Heatfiler by adding `<script>new HeatFiler().integrate();</script>` before the `</body>` (NOT in an existing `onload`, it will be too late at that point!)

Note: inline event handlers (`<a onclick="..."`) are not supported by this integration.

All files marked `type="profile"` and `type="noprofile"` will be loaded and executed in original sequence.

If nothing happens, please check your console. It's possible something went wrong in the transformation. Be a champ and try to figure out what went wrong and report it in the issue tracker for this repo. Would be great! :)

See the examples for integration examples.

## Nodejs integration

NodeJS supports a `require` hook (undocumented) which allows Heatfiler to hook into and transform scripts as they are loaded. Though the Node BDF has announced this feature to be dropped at some point, it's currently still working in <= v9.2 (and apps like Heatfiler depend on it).

To include Heatfiler in a NodeJS project, simply `require` the build file as early as possible (preferably with a special loader file) because it needs to bootstrap `require` and won't be active until it does so.

The regular process of node is not changed so unless you do magic stuff with `require.extensions` that clashes with what heatfiler needs to do this should work for any project.

Actual use is: `require('<heatfiler.js>').heatfiler.runNode('<path to export stats to>', ['<complete url of file to profile>', ...]);`

The first argument is the path to which the stats will be written. This is the file you want to load from the "NodeJS" tab in the UI.

By default no file is profiled. This is different from the web profiler, where you need to exclude files explicitly. The reason is that NodeJS will also require many other files and it just doesn't make sense for most files.

The second parameter is an optional list of files you want to be profiled. They should match the exact and complete path that `require` uses (check UI NodeJS tab for all files that were included).

The output file is used from the UI. It will be fetched through AJAX and the stats are used just like they are from `localStorage` from there on out.

Note: in my tests, node seemed to run considerably slower than web. Your mileage might vary :)

Note: this is using the undocumented `module._compile` in NodeJS (but it does so exactly the same as node would). I was ensured this is the only way of doing it and the only alternative would be that you would be required to manually store translated source into your project. This was unacceptable for me so I decided this was worth the cause. It turns out to be the only way to be the middle man between a fetch for `require` and the evaluation. But it works quite well. I was also told this will remain to be supported on the `1.x` branch. So if node hits v2, beware.

## Blog post

For (even) more information... :)
- [about v1](http://qfox.nl/weblog/268)
- [about v2](http://qfox.nl/weblog/305)

## Have fun

Hope you liked it :)

Taking (reasonable) pull requests, will fix important bugs. Not sure if, and if so when, I'll continue to work on this project.
