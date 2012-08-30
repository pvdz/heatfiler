# Heatfiler
## JS profiler slash code coverage reporting tool

### Summary

Heatfiler allows you to easily run through your code and find the heavy points. Alternatively, you can use it to figure out which parts of your code are unused. It does this, for both cases, with a visueal heatmap which updates live as the code runs. It can either run on the same page (profiler and code) or in two different tabs, communicating through `localStorage`.

You can also easily integrate Heatfiler in an existing project by including the script and adding `type` attributes to other script tags with the value of `profile` (include in profiler) and `noprofile` (load and execute, but do not profile). This will work as long as your project includes all files in the html (so requirejs and related loaders are not supported).

This project was hacked together in about two days. It uses ZeParser as the JS parsing and rewriting backend.

## Demo

See [heatfiler.qfox.nl](http://heatfiler.qfox.nl/) for a live demo of the profiler.

I've also added two integration examples. Open up [this](http://heatfiler.qfox.nl/dragon.php) or [this](http://heatfiler.qfox.nl/parallax.php) and then open [heatfiler](http://heatfiler.qfox.nl/) in another tab (click `Ping integration` there). The heatmap updates real-time.

## How it works

The profiler parses your script, injects "ping" calls into statements and expressions, and runs it. These "pings" will simply count how many times a certain (small) part of the script is executed. These stats are collected and processed. They are represented in the heatmap in a shade of red which signifies how often that part is executed. Red parts mean the script is executed often. To determine this it will check which part was called most often. All other counts are relative to this number. The shade of red is too.

The rewriting occurs with a set of rules that are "safe" and should not change the working of the code (though there might still be a bug for very obscure syntax, please report them if you find any). It should be possible for virtually any code to be rewritten this way. I've tried my best to catch'em'all :)

The code coverage does almost exactly the same thing as the profiler, except, of course, that it only highlights in red those parts which were never executed.

## Different methods

The `src/index.html` is the main entry point of the tool. It's a "simple" UI with a bunch of buttons, toggles and inputs. Here's what's what the buttons do:

- (A) Ping integration: Check `localStorage` for source codes to use, parse it, heatmap it. Ping `localStorage` for stats, reflect them in the heatmap. See notes below.
- (B) Run code locally: Take the input from the left-most textarea, parse it, run it, heatmap it. You'll see the translated code in the middle textarea. On the left of the page the heatmap will appear, updated as your code runs.
- (C) Run code to local storage: Take input from left-most textarea, parse it, run it. All pings are recorded and stored (once per second) to `localStorage`.
- (D) Ping code from local storage: Take input from left-most textarea, parse it, heatmap it. Ping `localStorage`, once per second, for updates. Reflect these in the heatmap. See notes below.
- (E) Run files locally: Take list of files from the right textarea. Fetch them through (regular!) xhr. Files without a `-` before it are NOT included in the profiling, but are still loaded. Any other file is loaded and transformed and shown in the heatmap. All files are executed. Note that this will show buttons for each file.
- (F) Run files to local storage: Same as "Run files locally" button, except that it won't display a heatmap and will send the stats to `localStorage`.
- (G) Ping files from local storage: Same as "Run files locally" button, except that it won't execute the code. It will ping `localStorage` once a second for stats and reflect them in the heatmap. See notes below.
- (F) Node integration: Include heatfiler in the initial part of your project. Hooks into `require` and stores stats in a file so you can xhr to them for the heatmap.

So you have four choices;

Either you run the code on the same page as the heatmap. This is fine, but a bit of a problem for blocking code.

You can also run the code in one tab and listen to `localStorage` updates from another tab. Note that in that this case, the textareas must contain exactly the same. Especially for the code inputs, this is very important.

Alternatively you can integrate Heatfiler into a project as a script tag. In that case you can listen to it on another tab, similar to the other methods, except that your listener tab will also fetch the source codes through `localStorage`. This was required because it's not very user friendly to have to list all the files or sources after integration :p

Lastly, you can include heatfiler in any node project. It will store the stats in a file and the client can ping this file to show you the stats like above. The file will also contain the file names (listed in the UI) and the sources.

## Settings

All settings are toggle-able live and will take effect immediately.

- Use max from any file / Uxe max from individual file: When computing relative stats, should a max be computed from all the files that are profiled or on a per file basis?
- Code coverage / Profiling: Switch between shoing the frequency of execution and showing the code that was not executed at all.
- Hide inputs: simply hides the textareas.
- Location of node stats file: relative to current url, should be xhr-able. Note that you can specify where heatfiler should write the stats to, which is probably more convenient for you.

## Function list

When you've got a heatmap, you'll also get a button at the top called "function list". When you press this you'll get a list of functions (I've tried my best to tie a name to each function occurrence, but some functions are simply anonymous, like `forEach` arguments). This list is ordered by frequency of having been called. The list is not updated by the way. You can click to jump to that function in the code. This list is relative to the currently shown file.

## Function zooming

Every function keyword is highlighted in blue. It's alt (title) will tell you how often it has been called, and how much that number compares to the function that was called most (100% means that this function was called most times). These stats are sensitive to the file relative setting.

You can click on the blue keywords. This will pop out the function and show you the stats relative to that function. I find this invalueable to get a quick overview of metrics for one function, even if it's not the most called function.

You can click on the blue keyword again to pop the function back in. Note that zooming in is still live, so (all) stats are updated, you won't disturb this process.

## Alt

The alt of almost part of code tells you how often it has been executed. The percentage behind it tells you how much that number is of the highest executed part.

Some parts tend to show just `1x` even though their direct neighbors are executed multiple times. This is probably something like a function expression. The `1x` denotes evalutation of the entire func expr. So it's an artifact of the heatmap, ignore it :)

## Multi tab

If you don't want to run the code in the same tab as the heatmap, you can open two tabs. One tab will run the code while the other tab listens for the stats.

Note that in this case both tabs must have exactly the same inputs. This goes for code (must be perfect match) as well as when listening for files (same order, same profiler inclusion). If you don't you'll see errors in console and nothing happens in the heatmap.

In case of integration this requirement is dropped. The sources are individually put in `localStorage` and the listener will fetch them from it.

Note that in the case of integration, the listener tab must run on the same (sub)domain:port as the project you integrated into. This is because otherwise the two tabs will not use the same `localStorage`.

## Tests

This was more of a quick hack than anything else. There's a simple test suite which I've taken from my JS parser. This does not cover everything (specifically, runtime issues) but it sufficed for me in most cases. Due to the nature of the setup of the tests, certain errors will only show once the code is actually called (right now it only creates a function to safely check for syntax errors).

Want unit tests? I'll be awaiting your pull request.

## Errors

This was a pretty quick development cycle. I did not go through the trouble of catching every possible case. Common problems are:

- Syntactically incorrect code
- Master / listener tabs do not contain same source code or files
- Integrated tab and listener tab do not run on same domain
- Listener tab was started (button pressed) before master started running
- Weird language construct that was not translated well by my transformer

Only in the last case, please report this to me (put an issue in the issue tracker), and I'll see what I can do about it.

## Integration

Integration of Heatfiler is the action of adding a build (the js file from the `/build` dir) to your project html as a normal script tag, at the end of the html (like, right before `</body>`. Then edit all other script tags (whom must preceed it) and add a `type` attribute. The value of this attribute must be `profile` for files which are to be actually profiled, and `noprofile` for files which must be loaded (in sequence) but not actually profiled.

For files who's order is not important and who are not to be profiled (like jQuery or other libraries), the `type` attribute can probably be omitted.

Heatfiler will load the script tags sequentially, in order of occurrence.

When heatfiler loads in your project, it will search for all `script` tags (whether file or inline). It will filter them for having a type attribute of either `profile` or `noprofile` (any other tag is ignored). It will fetch all scripts that have a `src` attribute. Then it will transform any `script` tag that had `type="profile"` and put their original source in `localStorage`. All gathered scripts are then executed (by dynamic script insertion) and your project should run as usual.

If nothing happens, please check your console. It's possible something went wrong in the transformation. Be a champ and try to figure out what went wrong and report it in the issue tracker for this repo. Would be great! :)

I've added two examples for integration, from two rather old projects. You can use them as an example, or to play around with.

First open [Dragon fractal thingy](http://heatfiler.qfox.nl/dragon.php) or [parallax demo](http://heatfiler.qfox.nl/parallax.php) .

Then open [heatfiler](http://heatfiler.qfox.nl/) in another tab and click `Ping integration`. Enjoy the magic :)

## Nodejs

You can include heatfiler in pretty much any project by simply `require`ing it and running an exposed method. This will hook heatfiler into the `require` system and intercept file loads. This allows heatfiler to modify the script, like it would in the browser, to be able to do its magic. It then compiles it as node would otherwise do too. In other words, the regular process of node is not changed so unless you do magic stuff with `require.extensions` that clashes with what heatfiler needs to do, this should work for any projects.

An example of usage is: `require('<heatfiler.js>').heatfiler.runNode(['<complete url of file to profile>', ...], '<path to export stats to>');`

You should export the file to a location that's exposed by a webserver. Then after you start running the project in node, open heatfiler in a tab and change the location right of the "Ping node" button to point towards that file.

To make the file whitelist process easier for you heatfiler will update the list of all files that were `require`d as it gets updates. It will ping the stats file once every two seconds (same rate as node will save them). The files textarea will contain the list of files and from there you can easily copy/paste them into the require call above.

Node will also transfer the sources that were fetched through require, so no need to enter files or sources manually in the browser. Heatfiler also handles the progressive `require`s that can happen. So you don't have to make sure everything is `require`d in one go.

Note that in my tests, node did run considerably slower than it usually would. But this maybe due to my older node version (and so older v8 engine). Other than that, things looked fine.

Note: this is using the undocumented `module._compile` (but it does so exactly the same as node would). I was ensured this is the only way of doing it and the only alternative would be that you would be required to manually store translated source into your project. This was unacceptable for me so I decided this was worth the cause. It turns out to be the only way to be the middle man between a fetch for `require` and the evaluation. But it works quite well. I was also told this will remain to be supported on the `1.x` branch. So if node hits v2, beware.

## Blog post


For (even) more information, check [the blog post](http://qfox.nl/weblog/268) :p

## Have fun

Hope you liked it :)

Taking (reasonable) pull requests, will fix important bugs. Not sure if, and if so when, I'll continue to work on this project.
