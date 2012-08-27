/**
###################################################
#            CDE class
#              v2.00a4
#        Custom DOM Element
#
#	       http://cde.qfox.nl
#
# CDE objects have a number of methods that serve
# as syntactical sugar. It reduces the number of
# lines to produce the same result when creating
# and styling DOM elements by DHTML.
###################################################
*/
var CDE = function(dom){
	// save element (we actually save the element 
	// so the CDE element can be safely included 
	// in closures, without leaking the dom elements)
	if (dom) this._id = dom._id = CDE._getId(dom);
	//if (!dom.id) id = "["+this._id+"]";
	//debug("id: "+this._id);
};

// ################################
// #          Inner Core          #
// ################################


/**
 * Create a CDE object (Custom DOM Element). Returns an object 
 * that wraps that element and some methods that allow chaining.
 * You can get the DOM element by the `el` method of the object.
 * If the argument is not a CDE element and resolves to a dom
 * element this function first checks the cache before returning
 * a new CDE element. This speeds up stuff.
 * @param mix mix Target element
 * - If string, document.getElementById(mix) is wrapped
 * - If object and mix.isCde, mix is returned
 * - If object and not mix.isCde, mix is wrapped (asumed to be dom)
 * - If parameter evals to false, null is returned
 * @param bool boolPlaceholder=false return an empty element if nothing could be parsed. Used in conjunction with .ifExists
 * @return CDE
 */
CDE.wrap = function(mix, boolPlaceholder){
	// will we return something?
	var bool = true;
	// dont do this...
	if (!mix) bool = false;
	// if type cde, just return it
	if (bool && mix.isCde) return mix;
	// if string, fetch DOM
	if (bool && typeof mix == 'string') mix = document.getElementById(mix);
	// if dge returned null...
	if (!mix) bool = false;

	// create a new cde object with it
	if (bool) return new CDE(mix);
	
	// something was wrong but you want a placeholder anyways
	if (boolPlaceholder) return new CDE();
	
	// just return nothing
	return null;
};

/**
 * Extract a dom element from the parameter.
 * @param mix mix
 * @return dom
 */
CDE.toDom = function(mix){
	if (!mix) return null;
	if (typeof(mix) == 'string') return document.getElementById(mix);
	if (mix.isCde) return mix.dom();
	return mix;
};

/**
 * Use ID's to prevent closure leaks of dom elements.
 * Basically, by storing the dom's inside this array,
 * IE won't leak dom elements when closing down...
 * @param dom dom
 * @return int
 */
CDE._getId = function(dom){
	if (!dom) {
		debug("CDE._getId: element is falsy");
		return 0;
	}
	if (!CDE._doms) {
		CDE._doms = [0]; // cache
		CDE._cacheSize = 0; // counter
	}
	var id = dom._id;
	// if no id or current id is not found, add it (back) to the cache
	if (!id || !CDE._doms[id]) {
		CDE._doms[id = CDE._doms.length] = dom;
		++CDE._cacheSize;
		CDE.debug('cacheSize');
	}
	return id;
};

/**
 * Remove given node from the cache. Optionally remove all of it's childeren.
 * Used when removing some panel which you know will be permanently removed.
 * Warning: This renders any CDE tied to them useless!
 * Dont use this on elements to which .on is applied! Or the event fails.
 *
 * @param dom dom
 * @param bool boolAndChilderen=false Walk through all the childNodes (and their childNodes) and remove them from cache as well.
 * @param bool boolSkipDom=false Do not delete the parent (it's already been deleted more efficient. this saves a search through the cache)
 * @return null
 */
CDE.uncache= function(dom, boolAndChilderen, boolSkipDom){
	var i;
	if (!dom) return;
	// first remove this element from the cache
	if (!boolSkipDom) CDE._uncache(dom);
	
	if (boolAndChilderen) {
		// now remove it's childeren, recursively
		i = dom.childNodes.length;
		while (i--) CDE.uncache(dom.childNodes[i], true); // recurse
	}
	
	return null;
};

/**
 * Uncache one element, if found
 * @param dom dom
 */
CDE._uncache = function(dom){
	if (dom._id && CDE._doms && CDE._doms[dom._id]) {
		delete CDE._doms[dom._id];
		--CDE._cacheSize;
		CDE.debug('cacheSize');
	}
};

/**
 * Add an element to the gc.
 * @param cde cde
 * @param target=default Specific bin to put object into.
 * @return cde
 */
CDE._gcAdd = function(cde,target){
	if (!target) target = 'standard';
	if (!CDE._arrGc) CDE._arrGc = {};
	if (!CDE._arrGc[target]) CDE._arrGc[target] = [cde];
	else CDE._arrGc[target].push(cde);
	return cde;
};
/**
 * Cleanup garbage. Uncache all elements in the gc.
 */
CDE.gc = function(target){
	var cde,a;
	if (CDE._arrGc) {
		if (target) {
			a = CDE._arrGc[target];
		} else {
			a = CDE._arrGc.standard;
		}
		// now uncache all
		if (a) while (cde = a.pop()) cde.uncache();
	}
};

// ################################
// #      Object attributes       #
// ################################

/**
 * Helps to identify CDE objects
 */
CDE.prototype.isCde = true;
/**
 * @var bool _boolFailProof=false Prevent errors if element does not exist. See CDE.prototype.ifExists
 */
CDE.prototype._boolFailProof = false;

// ################################
// #      Object methods          #
// ################################

/**
 * The actual element
 * @return dom
 */
CDE.prototype.dom = function(){ // return dom
	var e = CDE._doms[this._id];
	if (!e) debug("Error: CDE.prototype.dom("+this._id+") is empty. Most likely it was deleted (from another object?)...");
	return e;
};
/**
 * Add multiple childeren to an element. If an array is passed 
 * on, every element of the array is added. Every element is
 * wrapped, then added. empty arguments are ignored.
 * @param mix any number of arguments is accepted
 * @return CDE this
 */
CDE.prototype.add = function(){
	var e = this.dom();
	if (arguments.length == 0 || (this._boolFailProof && !e)) return this;
	// check all arguments
	for (var i=0; i<arguments.length; ++i) {
		// ignore false/empty args
		if (!arguments[i] || arguments[i].length === 0) continue;
		// strings mean DOM id's, fetch them, add them
		if (typeof arguments[i] === 'string') e.appendChild(CDE.toDom(arguments[i]));
		// if specified argument is an array, process each element in the array
		else if (typeof arguments[i].length == 'number') this.add.apply(this, Array.prototype.slice.call(arguments[i]));
		// if single CDE element, append it's element
		else if (arguments[i].isCde) e.appendChild(arguments[i].dom());
		// otherwise asume DOM element, append it
		else e.appendChild(arguments[i]);
	}
	return this;
};
/**
 * Map for mix.add(this)
 * @param CDE mixParent Add this to the argument CDE object
 * @param DOM mixParent Add this to the argument DOM element
 * @param string mixParent Fetch DOM element and add this to it
 * @return CDE this
 */
CDE.prototype.addTo = function(mix){ // cde.add(this)
	if (this._boolFailProof && !this.dom()) return this;
	CDE.toDom(mix).appendChild(this.dom());
	return this;
};
/**
 * Insert this element before mixTarget.
 * Takes this element and makes it the child of the parent of mix, before mix, using 
 * mix as argument to insertBefore.
 * @param mix mixTarget Argument to CDE.wrap, must be part of dom, <this> will be added before mix.
 * @param bool boolStart=false Insert as first child of this element
 * @return CDE (this)
 */
CDE.prototype.ins = function(mixTarget, boolAsFirstChildOfThis){ // insertBefore target before this
	var e = this.dom();
	if (this._boolFailProof && !e) return this;
	// actually add the element
	mixTarget = CDE.toDom(mixTarget);
	if (boolAsFirstChildOfThis) {
		// insert given element before first child of this
		e.insertBefore(mixTarget, e.firstChild);
	} else {
		// we should maybe check for existence of the argument dom, but we wont.
		mixTarget.parentNode.insertBefore(e, mixTarget);
	}
	return this;
};
/**
 * Remove this element from parent element
 * After invocation, the returned element will not be part of the dom
 * @param bool boolAlsoCache=false Also remove dom element from CDE cache.
 * @param bool boolAndAllChildNodes=false In conjunction with boolAlsoCache, also removes all childnodes from the cache.
 * @return CDE <this>
 */
CDE.prototype.del = function(boolAlsoFromCache, boolAndAllChildNodes){ // remove from DOM
	var e = this.dom();
	if (this._boolFailProof && !e) return this;
	if (e.parentNode) e.parentNode.removeChild(e);
	// remove from cache. Be carefull!
	if (boolAlsoFromCache) this.uncache(boolAndAllChildNodes);
	return this;
};
/**
 * Remove this element from the internal CDE cache. Only do this when certain you wont use it anymore!
 * Dont use this on elements to which .on is applied! Or the event fails.
 * @param bool boolChilderenToo=false Recursively remove also all the childNodes this element has.
 * @param bool boolAndAllChildNodes=false In conjunction with boolAlsoCache, also removes all childnodes from the cache.
 * @return null;
 */
CDE.prototype.uncache = function(boolChilderenToo){
	var arr,i;
	// stop all running ease timers
	if ((arr = this.dom().arrEaseObjects) && (i = arr.length) > 0) {
		while (i--) {
			if (arr[i]) clearInterval(arr[i].timer);
		}
	}
	// remove the element
	return CDE.uncache(this.dom(), boolChilderenToo);
};
/**
 * Put this CDE into a garbage collector.
 * When CDE.gc() is called, all elements in the bin
 * are uncached.
 * This helps to cleanup the cache when creating gui's.
 * Never put an element into this bin to which .on() is
 * applied. This probably fails the event because the 
 * CDE object is wrapped in a closure. When the object
 * wants to refer to the dom, the element is gone.
 *
 * @param string target=default Target bin to throw this into. Defaults to 'default'
 * @return cde <this>
 */
CDE.prototype.gc = function(target){
	return CDE._gcAdd(this, target);
};
/**
 * Set attributes of this CDE. Every attribute of given object is set on <this>.dom().
 * If the parameter is a string, it is asumed to be the css class
 * @param mixed mix When the second parameter is set, this is the attribute for that value. Otherwise, if this is a string, it's asumed to be the className, otherwise every attribute from this object is copied to the element.
 * @param mixed mixValue=false When set, this.dom()[mix] = mixValue is executed.
 * @return CDE <this>
 */
CDE.prototype.atr = function(mix, mixValue){
	if (!mix || (this._boolFailProof && !this.dom())) return this;
	
	// set an attribute by name:value pair
	var f = function(dom, name, value){
		try { dom[name] = value;
		} catch(er){
			if (window.debug) debug('CDE.atr fail: e:['+dom+'], key:['+name+'], val:['+value+'], err:['+er.description+']');
		}
	};
	
	if (arguments.length == 2) f(this.dom(), mix, mixValue);
	else if (typeof mix === 'string') f(this.dom(), 'className', mix);
	else for (var key in mix) f(this.dom(), key, mix[key]);
	
	return this;
};
/**
 * Set attributes of the style object of this CDE. Every attribute of given object is set on <this>.dom().style
 * If the parameter is a string, it is asumed to be the CSS class name
 * @param mixed mix If object, all name:value pairs are copied to this.dom().style. When string and second parameter undefined, mix is asumed to be the classname. Otherwise arguments are asumed to be name:value pair and set accordingly.
 * @param mixed mixValue=false When true, first parameter should be a string and its the same as calling this.css({mix, mixValue})
 * @return CDE <this>
 */
CDE.prototype.css = function(mix, mixValue){
	if (!mix || (this._boolFailProof && !this.dom())) return this;
	
	// inner function to set a style
	var f = function(name, value, s){ // s=style
		// common error fixes (name = requested value, key will actually be set)
		var key = name;
		// float is reserved, should be cssFloat
		if (name == 'float') key = 'cssFloat';
		// opacity is a subject on its own
		if (name == 'opacity') {
			if (typeof value !== 'number') {
				if (window.debug) window.debug("invalid opacity value: "+value+" (not a number)");
				return;
			}
			if (value < 0 || value > 1) {
				if (window.debug) window.debug("Error: Invalid value for opacity: use 0..1 ("+value+")");
				if (value < 0) value = 0;
				if (value > 1) value = 1;
			}
		}
		try {
			if (key == 'opacity') {
				// set opacity in IE (actually setting "opacity" causes an error...)
				if (typeof(s.filter) != 'undefined') s.filter = "alpha(opacity="+Math.round(value*100)+")"; // works in IE6+, but also succeeds in opera...
				// set for all other browsers (causes problem in IE, but since Opera "supports" filters, we have to set it anyways)
				try { s[key] = value; } catch(er){}
			} 
			// except in IE, cssFloat is styleFloat (just set both, otherwise we have to do browser detection)
			else if (key == 'cssFloat' && document.all) s.styleFloat = value;
			// other values can be set, i think
			else s[key] = value;
		} catch (er) {
			if (key == 'overflow' && value == '-moz-scrollbars-vertical') { // ie borks this
			} else if (window.debug) debug('<span style="color:red;">CDE.css fail</span>: Tried setting ['+key+'] to ['+value+']. Error: '+er);
		}
	};

	// first check whether two args were given. if so, asume them to be a name:value pair
	if (arguments.length == 2) f(mix, arguments[1], this.dom().style);
	// now check for string. if mix is a string, the classname was passed on instead (because the second parameter is empty)
	else if (typeof mix === 'string') this.atr('className', mix);
	// otherwise it should be an array with name:value pairs for the style object
	else for (var key in mix) f(key, mix[key], this.dom().style);

	return this;
};
/**
 * This function, inspired by thomas fuchs, accepts some css arguments and slowly updates
 * the properties of this to become what's given. The change will be gradual, in a certain
 * timeframe with certain time steps. It allows for simple transitions and effects.
 * This will be a work in progress for a little while...
 * This function uses timeout to accomplish what it does.
 * Several special exceptions have been made, like fading (because that relies on other 
 * properties like display and visibility) and margin,padding and border.
 * Some special properties are actually a lot like others (margin=padding=border(width))
 * There's basically three types of values; color, size and opacity. We need to
 * handle them all. I guess...
 * Default value for sizes are px. Deal with it. Color values are only supported in 
 * some number format (hex or rgb) because things get bloated to support all colors.
 * That includes colors _you_ set in your css. Use numbers, not names! Or this probably fails.
 * If you call an ease effect for the same property as another ease effect that's still running,
 * the property will be removed from the old effect (but the effect left in tact). If this means
 * the old effect has no more properties left to ease over, the ease call is considered "complete"
 * and the callback is called (unless specifically told otherwise). The function is "smart", which
 * means it take subsets of any running ease effect and compare them to the new call.
 * @param obj targets An object literal with target values for certain styles. Can be more than one.
 * @param obj options Certain options which can be set:
 * - callback: function called when the transition completes
 * - boolLinear=false: Let every step change equally, rather than on a curve (default)
 * - boolDisplayInline=false: For opacity, set display to inline, instead of block (default) at start or finish.
 * - boolNoDisplayChange=false: Do not set display=none when opacity=0
 * - intStepTime=10: time between each step (ms)
 * - intEaseTime=500: time for full effect (ms)
 * - boolCancelOldCallback=false: if this ease call canceled the last property of a previous ease call that's still running, cancel the callback (if any) rather than executing it.
 * - boolIgnoreRunningEase=false: Do not check for other running ease effects. Can have unexpected results... will not cancel properties of running ease effects which would clash with the current call.
 * - boolAfterFadeDelete=false: When the fade completes, remove the element from DOM
 * - boolAfterEaseUncache=false: When the fade completes, remove the element from cache
 * - boolAfterEaseUncacheCompletely: When the fade complets, remove the element AND its childeren from cache

demo :
var rep,r = function(){ return Math.round((Math.random()*239)+16).toString(16); };
rep = function(cde){ cde.ease( { opacity: Math.random(), backgroundColor: '#'+r()+r()+r() }, { callback: function(){ rep(cde); } } ); };
rep(CDE.div().bgc('00ff00').abs(10,400,200,200).dba());

demo:
CDE.div() .bgc('red') .abs(10,300,200,300) .txt("moo") .dba() .ease({padding:30},{callback: function(){debug("done!");}})
 
 * @return this
 */
CDE.prototype.ease = function(targets, options){
	//debug("CDE.ease: ["+targets+"]["+options+"]");
	if (this._boolFailProof && !this.dom()) return this;
	// ignore empty args
	if (!targets) return this;
	// ensure this obj exists
	if (!options) options = {};
	// reference to this cde
	var that = this;

	// define our vars
	var atr, stepTime, easeTime, startTime, currentDisplay, currentVis, obj, arr, oldTargets, i, cb, bool;

	// preprocessing
	for (atr in targets) {
		if (atr == 'margin' || atr == 'padding') {
			targets[atr+'Top'] = targets[atr];
			targets[atr+'Right'] = targets[atr];
			targets[atr+'Bottom'] = targets[atr];
			targets[atr+'Left'] = targets[atr];
			delete targets[atr];
		} else if (atr == 'border') {
			// todo..
		}
	}

	// Now if a certain effect is busy, we want to make sure it stops, while not 
	// affecting the other effects. Like when we're fading and changing color, and
	// we want to fade again, the second fade should only stop the first fade but
	// let the color change continue. Cue complex situation.
	if (!options.boolIgnoreRunningEase && (arr = that.dom().arrEaseObjects) && (i = arr.length)) {
		// loop through the array
		while (i--) {
			if (!arr[i]) continue; // empty elements have been canceled/completed already
			oldTargets = arr[i].targets;
			// ok, another ease effect is busy. check if any of the targeted attributes 
			// are equal to the ones about to start the current effect...
			for (atr in oldTargets) {
				if (atr in targets) {
					// found one. now delete this and move on to the next attribute
					delete oldTargets[atr]; // wile make sure (atr in obj) === false
				}
			}
			// if there are any properties, just continue with the next item in the array
			bool = false;
			for (var tst in oldTargets) { bool = true; break; };
			if (bool) continue;
			// at this point, there are no more properties
			// stop timer
			clearInterval(arr[i].timer);
			// remember callback
			cb = arr[i].options.callback;
			// cleanup trash, do not splice because a reference is kept through indices
			oldtargets = arr[i] = arr[i].options = arr[i].targets = arr[i].timer = null;
			// call the callback, unless canceled
			if (!options.boolCancelOldCallback && cb) {
				if (cb.constructor == Function) cb();
				else debug("old callback was not a function... ["+cb+"]");
			}
		}
	}
	
	// determine timing
	stepTime = options.intStepTime||10; // about 50ms per step
	easeTime = options.intEaseTime||1000; // 500ms for entire effect
	startTime = (new Date()).getTime(); // allow us to track actual position in case browser takes longer than stepTime for one step

	// prepare values for each attribute to ease
	for (atr in targets) {
		//debug("ease: ["+atr+"]["+target+"]");
		obj = targets[atr] = { target: targets[atr], suffix: 'px' };
		if (atr == 'opacity') {
			obj.noRound = true; // opacity uses float values :)
			obj.suffix = 0; // and no suffix (this prevents the number to be casted to string and throw an error..)
			// an object that's currently not visible should first get an opacity equal to zero
			currentDisplay = that.getStl('display');
			currentVis = that.getStl('visibility');
			// if not visible, the current opacity is 0, regardless of the true value
			obj.current = parseFloat(currentDisplay === 'none' || currentVis === 'hidden' ? 0 : that.getStl('opacity') ) || 0; // if NaN, use 0
			// make sure the element is visible
			if (currentDisplay === 'none') {
				that.o(0);
				if (options.boolDisplayInline) that.di();
				else that.db();
			}
			if (currentVis === 'hidden') that.o(0).vv();
		} else {
			// get current value of attribute
			if (atr == 'top' || atr == 'left') {
				// top and left are fetched slightly differently, and always relative to the parent
				if (atr == 'left') obj.current = this.pos(true).x;
				else obj.current = this.pos(true).y;
			} else {
				// just get it already
				obj.current = this.getStl(atr);
			}
			// are we messing with a color?
			if (atr == 'color' || atr == 'backgroundColor') {
				obj.isColor = true;
				// colors dont have suffices :)
				obj.suffix = '';
				// dont round colors...
				obj.noRound = true;
				// get the rgb values of the normalized color
				obj.current = CDE.nColor(obj.current);
				obj.currentRgb = CDE.rgb(obj.current);
				obj.target = CDE.nColor(obj.target); // hex color WITH hash prefix
				obj.targetRgb = CDE.rgb(obj.target); 
			// otherwise get the number part of the current value (lose any suffix string)
			} else {
				obj.current = parseFloat(obj.current)||0;
				obj.target = parseFloat(obj.target)||0;
			}
		}
		//debug(atr+":["+obj.current+"]["+obj.target+"]");
	}	
	
	// save all parameters to this fade
	obj = {targets: targets, options: options};
 	obj.timer = setInterval(function(){
 		// from within this function, the variable i should be preserved under closure, to reference the object
		var timeNow, pos, newValue, cb;
		timeNow = (new Date()).getTime();
		pos = (timeNow - startTime) / easeTime; // the position of the transition on a scale of 0..1
		pos = pos<0?0:(pos>1?1:pos); // ensure the position is within 0..1 boundaries
		if (!options.boolEase) pos = (-Math.cos(pos*Math.PI)/2) + 0.5; // apply easing function (thanks thomas fuchs)
		
		//debug("step["+name+"]: pos:"+pos+", newValue:"+newValue);
		
		// are we done?
		if (pos >= 1) {
			// set to target (just to make sure no rounding errors occurred)
			for (atr in targets) that.css(atr, targets[atr].target+targets[atr].suffix);
			// stop timer
			clearInterval(that.dom().arrEaseObjects[i].timer);
			// set display if opacity
			if (atr == 'opacity' && targets[atr].target == 0 && !options.boolNoDisplayChange) that.dn();
			// cleanup trash
			that.dom().arrEaseObjects[i] = that.dom().arrEaseObjects[i].timer = null;
			// call callback, if (still) exists
			if (options.callback) {
				if (options.callback.constructor == Function) options.callback();
				else debug("options.callback was not a function...");
				options.callback = null; // prevent calling it more than once
			}
			// woohoo, done! fire post ease options
			if (options.boolAfterFadeDelete) that.del(); // delete from dom
			// uncache (should be last action, it'll wreck anything else)
			if (options.boolAfterEaseUncacheCompletely) that.uncache(true); // delete from cache, and all childeren
			else if (options.boolAfterEaseUncache) that.uncache; // delete from cache

		// otherwise, set the current newValue and wait for the next iteration
		} else {
			for (atr in targets) {
				obj = targets[atr];
				// add to the current value the amount of value according to the current position of the transition effect (yeah, yeah)
				if (obj.isColor) newValue = CDE.rgb(Math.round(obj.currentRgb.r + ((obj.targetRgb.r-obj.currentRgb.r) * pos)), Math.round(obj.currentRgb.g + ((obj.targetRgb.g-obj.currentRgb.g) * pos)), Math.round(obj.currentRgb.b + ((obj.targetRgb.b-obj.currentRgb.b) * pos)));
				else newValue = obj.current + ((obj.target-obj.current) * pos); 
				// do we require round values (we usually do, opacity seems to be the only exception...)
				if (!obj.noRound) newValue = Math.round(newValue);
				that.css(atr, newValue+obj.suffix);
				//debug(atr+":"+newValue+obj.suffix+" ("+(pos+'').substring(0,5)+")");
			}
		}
	}, stepTime);
	
	// save the parameters in the dom element (its important that there's no dom reference in this object...)
	// the parameter object is saved under closure, but so are the parameters themselves anyways, so that's
	// no real problem.
	if (!that.dom().arrEaseObjects) that.dom().arrEaseObjects = [];
	// note that i will be remembered under closure. so the inner function will still be able to refer to it, 
	// and reference the correct array value accordingly
	i = that.dom().arrEaseObjects.length;
	that.dom().arrEaseObjects[i] = obj;
	
	return this;
};
/**
 * Get absolute position of the element in the document body. Walks the entire tree.
 * Use opos if you just want the offset values to the parent.
 * You need this function when you want to compute onmouse coordinates relative to element.
 * @param boolToParent=false Only retrieve information relative to the (first) parent
 * @param boolInner=false Retrieve width of element excluding margin, border and padding?
 * @return object {w,h[,x,y]}
 */
CDE.prototype.pos = function(boolToParent, boolInner){ // absolute position relative to document
	var w, h, e=this.dom(), intTotalTop=0, intTotalLeft=0;
	if (this._boolFailProof && !e) return {x:0,y:0,w:0,h:0};
	
	if (boolInner) {
		w = e.clientWidth;
		h = e.clientHeight;
	} else {
		w = e.offsetWidth;
		h = e.offsetHeight;
	}
	
	// now climb the DOM tree
	do {
		intTotalTop += e.offsetTop;
		intTotalLeft += e.offsetLeft;
		e = e.offsetParent;
	// quit if we want it relative to parent, if there was no parent or if parent is body
	} while(!boolToParent && e && e.nodeName && e.nodeName.toUpperCase() != 'BODY');
	
	return {x: intTotalLeft, y: intTotalTop, w: w, h: h};
};
/**
 * Return the four offset*** or client*** vales of this element
 * @param bool boolInner=false Return client (otherwise returns offset)
 * @return object {x,y,w,h}
 */
CDE.prototype.qpos = function(boolInner){ // boolInner=client positions, else offset positions
	var e = this.dom();
	if (this._boolFailProof && !e) return {x:0,y:0,w:0,h:0};
	if (boolInner) {
		return {
			x: e.clientLeft,
			y: e.clientTop,
			w: e.clientWidth,
			h: e.clientHeight
		};
	}
	return {
		x: e.offsetLeft,
		y: e.offsetTop,
		w: e.offsetWidth,
		h: e.offsetHeight
	};
};
/** 
 * Append <this>.dom() to the body by document.body.appendChild
 * Dont call before domLoaded in explorer or before creation of body element in other browsers
 * @return CDE <this>
 */
CDE.prototype.dba = function(){ // document.appendChild
	if (this._boolFailProof && !this.dom()) return this;
	CDE.dba(this);
	return this;
};
/**
 * Crossbrowser events. Fixes context, argument, mousecoordinates, mousebutton.
 * For explorer, the context of the event will be the same as with addEventListener 
 * and the event argument is supplied as well (but also available in "event" global).
 * As an added bonus, evt.intButton will always contain the correct button (ie and 
 * the others) where left=1,middle=2,right=3. Of course only if your browser allows it.
 * Check out the link for more details on the coordinates and mouse buttons.
 * @see http://unixpapa.com/js/mouse.html
 * @param string strEvent Should be the event without 'on' prefixed (click, load, etc)
 * @param function func The function to execute when the event fires. It's (optional) arguments are: callback(evt, x, y, domOrg). x and y can be bogus/empty/crap. `this` is equal to domOrg 
 * @param string mixType=false 
			Second and third parameter of callback are x/y of mouse relative to parameter: 
			- "screen" (entire screen), 
			- "viewport" (browser content window regardless of scroll state), 
			- "body" (content including scroll), 
			- "element" (target element including margin/border/padding)
			- dom (a DOM element)
			- cde (a CDE)
			For keyboard, the second callback parameter is the key pressed
			- "keyboard"
 * @return CDE <this>
 */
CDE.prototype.on = function(strEvent, func, mixType){ // mousetype: 'screen', 'viewport', 'body', 'element', cde, dom
	var e = this.dom();
	if (this._boolFailProof && !e) return this;
	
	var cdeTarget = this;
	// fix cde / dom (string is special, not id!). if not string, its the element object, either cde or dom
	if (mixType && typeof mixType != 'string') {
		// set the target element to the requested target
		if (mixType.isCde) cdeTarget = mixType;
		else cdeTarget = CDE.wrap(mixType);
		// now act as if domTarget is the element and use the element type
		mixType = 'element';
	}

	// note that actual event callbacks are created by factories below
	// to prevent leaks, we dont pass on dom elements, but their CDE wrapped
	// elements. These don't reference the dom element directly, but indirectly
	// through a number. Because of that, their event handlers will not cause 
	// leakage when closing the document...
	
	if (!func && window.debug) debug("CDE.on: no function passed on...");
	if (!func) return;
	
	// all except ie
	if (e.addEventListener) e.addEventListener(strEvent, CDE._onFx(mixType, func, cdeTarget, this), false);
	// ie, call the func parameter in the context of this (attachEvent normally binds to window)
	else e.attachEvent('on'+strEvent, CDE._onIe(mixType, func, cdeTarget, this));

	return this;
};
// Fx factory for cde.on()
CDE._onFx = function(mixType, func, cdeTarget, cdeOrg){
	return function(evt){
		// fix button (left=1,middle=2,right=3)
		evt.intButton = (evt.which < 2) ? 1 : ((evt.which == 2) ? 2 : 3); // others
		// call callback depending on mousetype
		switch (mixType) {
			case 'screen':
				func.call(cdeTarget.dom(), evt, evt.screenX, evt.screenY, cdeOrg.dom());
				break;
			case 'viewport':
				func.call(cdeTarget.dom(), evt, evt.clientX, evt.clientY, cdeOrg.dom());
				break;
			case 'element':
				var pos = cdeTarget.pos();
				func.call(cdeTarget.dom(), evt, evt.pageX-pos.x, evt.pageY-pos.y, cdeOrg.dom());
				break;
			case 'body':
				func.call(cdeTarget.dom(), evt, evt.pageX, evt.pageY, cdeOrg.dom());
				break;
			case 'keyboard':
				func.call(cdeTarget.dom(), evt, evt.keyCode, cdeOrg.dom());
				break;
			default:
				func.call(cdeTarget.dom(), evt, cdeOrg.dom());
		}
	};
};
// Ie factory for cde.on()
CDE._onIe = function(mixType, func, cdeTarget, cdeOrg){
	return function(){
		// fix button (left=1,middle=2,right=3)
		event.intButton = (event.button < 2) ? 1 : ((event.button == 4) ? 2 : 3); // ie
		// call callback depending on mousetype
		switch (mixType) {
			case 'screen':
				func.call(cdeTarget.dom(), event, event.screenX, event.screenY, cdeOrg.dom());
				break;
			case 'viewport':
				func.call(cdeTarget.dom(), event, event.clientX, event.clientY, cdeOrg.dom());
				break;
			case 'element': // for element and browser, we first need to compute event.pageX/Y
			case 'body':
	      var d = (document.documentElement && document.documentElement.scrollLeft != null) ? document.documentElement : document.body;
	      var pageX = event.clientX + d.scrollLeft;
	      var pageY = event.clientY + d.scrollTop;
	      if (mixType == 'element') {
					var pos = cdeTarget.pos();
					func.call(cdeTarget.dom(), event, pageX-pos.x, pageY-pos.y, cdeOrg.dom()); 
	      } else { // browser
					func.call(cdeTarget.dom(), event, pageX, pageY, cdeOrg.dom()); 
				}
				break;
			case 'keyboard':
				func.call(cdeTarget.dom(), event, event.keyCode, cdeOrg.dom());
				break;
			default:
				func.call(cdeTarget.dom(), event, cdeOrg.dom());
		}
	};
};
/**
 * Remove all childeren from this element
 * @return CDE <this>
 */
CDE.prototype.empty = function(){ // del all childeren
	var f, e = this.dom();
	if (this._boolFailProof && !e) return this;
	while (f = e.firstChild) e.removeChild(f);
	return this;
};
/**
 * Get the current style for this object using css names (background-color).
 * The script will convert these to their javascript equivallent in IE
 * For transparency, use 'opacity'
 * Use CDE.nColor() to normalize the results to a hex string
 * @param string strName Style name (css dashed, not javascript camelcased)
 * @param bool boolNormColor=false Normalize the returned value (only use for colors, will default to #ffffff if unparsable)
 * @return mix
 */
CDE.prototype.getStl = function(strName, boolNormColor){ // get computed style
	var e = this.dom();
	if (this._boolFailProof && !e) return this;
	if (window.getComputedStyle) { // FX et al
		// convert camelcase to dashed css syntax
		strName = CDE.jsToCss(strName);
		// float is reserved and should be cssFloat when not in IE
		if (strName == 'float' || strName == 'styleFloat') strName = 'cssFloat';
		
		var a,b;
		if ((a = document.defaultView) && (b = a.getComputedStyle(e,null))) {
			if (boolNormColor) return CDE.nColor(b.getPropertyValue(strName));
			return b.getPropertyValue(strName);
		}
	} else if (e.currentStyle) { // IE
		if (strName == 'opacity') {
			try {
				// ie8, error if DXImageTransform does not exist (http://developer.yahoo.com/yui/docs/Dom.js.html)
				// also fails if not set at all (defaults to returning 1 eventually)
				return e.filters.item("DXImageTransform.Microsoft.Alpha").opacity / 100;
			} catch(er){
				try {
					// the ie7 way
					// also fails if not set at all (defaults to returning 1 eventually)
					return e.filters('alpha').opacity / 100;
				} catch(er2){
					// if not found, opacity was probably not set and defaults to 1
					return 1;
				}
			}
		} else { // still ie :)
			// convert dashed css syntex to camelcase
			strName = CDE.cssToJs(strName);
			// float is reserved and should be styleFloat in IE
			if (strName == 'float' || strName == 'cssFloat') strName = 'styleFloat';

			if (boolNormColor) return CDE.nColor(e.currentStyle[strName]);
			return e.currentStyle[strName];
		}
	}
	if (window.debug) debug("CDE.getStl: Did not know what to do... [strName]");
	return NaN; // unknown...
};
/**
 * Add a new stylesheet (!).
 * This sheet is added to the cde so it will disappear when the element is removed...
 * When added to body, this stylesheet will override all other stylesheets...
 * @param string str The css for the stylsheet
 * @return CDE <this>
 */
CDE.prototype.addCss = function(str){ // add stylesheet 
	return this.add(CDE.css(str));
};
/**
 * Since CDE objects are shared and based on the dom object they wrap, we cant have one object with and another
 * object without optional existence. So we use the ifExists ... endIf methods to to this for us. Whenever you
 * want to use a CDE you know might not exist, use the cde.ifExists()...endIf() pattern to ensure no erros occur.
 * It's best not to rely on this option unless you explicitly know the element might not exist. This will help
 * you to spot problems faster...
 * @return cde <this>
 */
CDE.prototype.ifExists = function(){
	this._boolFailProof = true; // its ok for an obect not to exist?
	return this;
};
/**
 * Set the optional existence to off.
 * @see CDE.prototype.ifExists
 * @return cde <this>
 */
CDE.prototype.endIf = function(){
	this._boolFailProof = false;
	return this;
};
/**
 * Set focus to this element
 * @return CDE <this>
 */
CDE.prototype.focus = function(){
	if (this._boolFailProof && !this.dom()) return this;
	this.dom().focus();
	return this;
};
/**
 * Remove focus from this element (blur)
 * @return CDE <this>
 */
CDE.prototype.blur = function(){
	if (this._boolFailProof && !this.dom()) return this;
	this.dom().focus();
	return this;
};

// ################################
// #     Create Dom Elements      #
// ################################

/**
 * Create new DOM element.
 * Note that all subsequent creation functions have the same meaning for style and attribute parameters.
 * @param string strType Name of DOM element to create
 * @return CDE
 */
CDE.dom = function(strType) {
	// create dom element
	var dom = document.createElement(strType);
	
	return CDE.wrap(dom);
};
/**
 * Create a span with their innerHTML set to the first param
 * @param string str value for innerHTML
 * @see CDE.dom for stl and attr
 * @return CDE
 */
CDE.txt = function(str) {
	// a simple mapping to create textnodes through innerHTML
	return CDE.span(str);
};
/**
 * Create a div
 * @see CDE.dom for stl and attr
 * @return CDE
 */
CDE.div = function(str){
	var cde = CDE.dom('div');
	if (typeof str != 'undefined') cde.atr('innerHTML',str);
	return cde;
};
/**
 * Create a span
 * @see CDE.dom for stl and attr
 * @return CDE
 */
CDE.span = function(str){
	var cde = CDE.dom('span');
	if (typeof str != 'undefined') cde.atr('innerHTML',str);
	return cde;
};
/**
 * Create an img
 * @param string src The url for the image
 * @param string alt The value for this.dom().title and alt
 * @see CDE.dom for stl and attr
 * @return CDE
 */
CDE.img = function(src, alt){
	if (typeof src == 'undefined') src = '';
	return CDE.dom('img').atr({src:src,alt:alt||'',title:alt||''});
};
/**
 * Create an input of given type
 * Radio buttons can be created in IE.
 * Note that you cannot dynamically modify iframes in Explorer
 * @param string strType Should not be iframe in explorer.
 * @param string name=false
 * @param string value=false
 * @param bool bool=false Select or check this input?
 * @return CDE
 */
CDE.inp = function(strType, name, value, bool) {
	if (!strType) strType = 'text';
	var cde,e;
	if (strType == 'radio') { // radio buttons cannot normally be created dynamically in explorer...
		// create a radio button inline (this works fine in explorer...)
		cde = CDE.txt('<input type="radio" />');
		// get the child element
		e = cde.dom().firstChild;
		while (e && e.nextSibling) e = e.nextSibling; // in fx the first childNode will be a textNode. the last will always be the input node
		cde = CDE.wrap(e);
	} else {
		cde = CDE.dom('input').atr({type:strType});
	}
	
	if (typeof name != 'undefined') cde.name(name);
	if (typeof value != 'undefined' && strType != 'checkbox') cde.val(value);
	if (bool && strType == 'option') cde.sel(true);
	else if (bool) cde.chk(true);
	return cde;
};
/**
 * Create dynamic javascript link (not anchor). Link will have cursor:pointer and hover: underline
 * @param string str Text of link
 * @param function funcOnClick The callback
 * @param bool boolNoLine=false Do not add the on hover text-decoration=underline
 * @see CDE.dom for stl and attr
 * @return CDE
 */
CDE.lnk = function(txt, funcOnclick, boolNoLine) {
	if (typeof txt == 'undefined') txt = '';
	var cde = CDE.span(txt).ns().on('click', funcOnclick).cp();
	if (!boolNoLine) cde.on('mouseover', CDE._tdu).on('mouseout', CDE._tdn);
	return cde;
};
CDE._tdu = function(){ this.style.textDecoration = 'underline'; }; // can this leak?
CDE._tdn = function(){ this.style.textDecoration = 'none'; };
/**
 * Create dynamic javascript button
 * @param string str Text of button
 * @param function funcOnClick The callback
 * @see CDE.dom for stl and attr
 * @return CDE
 */
CDE.btn = function(txt, funcOnclick) {
	if (typeof txt == 'undefined') txt = '';
	if (!funcOnclick) funcOnclick = function(){};
	return CDE.dom("button").on('click', funcOnclick).txt(txt);
};
/**
 * Create an anchor
 * @param string url Url of the anchor
 * @param string str Text of the anchor
 * @see CDE.dom for stl and attr
 * @param boolean boolTB=false Target=_blank ?
 * @return CDE
 */
CDE.a = function(txt, url, boolTb) {
	if (typeof txt == 'undefined') txt = '';
	var obj = {href: url};
	if (boolTb) obj.target = '_blank';
	return CDE.dom('a').txt(txt).atr(obj);
};
/**
 * Create line breaks. Note: this does not return a CDE but a plain dom element.
 * @param int n=1 Number of line breaks to return (in an array)
 * @return dom or array if n>1
 */
CDE.br = function(n) {
	// return one BR element if none or one is requested
	// return an array of n BR elements, if a higher number is given
	if (typeof n !== 'number' || n <= 0) n = 1;
	if (n === 1) return CDE.dom('br');
	var brs = [];
	for (var i=0; i<n; ++i) brs.push(CDE.dom('br'));

	return brs;
};
/**
 * Add <this> to document.body
 * Dont call before domLoaded in explorer, and not before the element is created in other browsers...
 * @param mixed _args Variable number of arguments (DOM, CDE or string), which are all added to the body
 */
CDE.dba = function(_args) { // Document.Body.AppendChild(_CDEelements)
	CDE.wrap(document.body).add(Array.prototype.slice.call(arguments));
};
/**
 * Load an external javascript (random number appended automatically, unless specified otherwise)
 * @param string url Target url
 * @param function funcOnload Called when script is loaded
 * @param boolean boolNoAntiCache=false Do not add random number (allows caching)
 */
CDE.ljs = function(url, funcOnload, funcOnfail, boolNoAntiCache) {
	if (!boolNoAntiCache) {
		if (url.indexOf('?') >= 0) url += '&'+Math.random();
		else url += '?'+Math.random();
	}
	
	var funcDebugDone, cde, boolLoaded=false;
	
	if (window.debug) {
		var strUrl = url.substring(0,20);
		debug('Importing '+strUrl+"...");
		funcDebugDone = function() { window.debug("Imported "+strUrl+"..."); };
	}

	var funcCallback = function(){
		// prevent double execution
		if (boolLoaded) return;
		boolLoaded = true;
		// debug
		if (funcDebugDone) funcDebugDone();
		// callback
		if (funcOnload) funcOnload();
		// remove the script from the DOM after it loads
		// the var cde is a container which is remembered and
		// shared due to closure. So when this function is 
		// executed, the contents will be the CDE script which
		// is assigned later on. This prevents unneccessary
		// pollution of the DOM tree.
		cde.del();
		cde = null;
	};
	
	// add the script to the body
	cde = CDE.dom('script').on('load', funcCallback).on('readystatechange', function(){
		// loaded = fresh, complete = cached. silly ms
		if (this.readyState === 'loaded' || this.readyState === 'complete') funcCallback();
	}).atr({type: 'text/javascript', language: 'javascript', src: url}).dba();
};
/**
 * Create a table header (TH) element
 * @see CDE.dom for stl and attr
 * @return CDE
 */
CDE.th = function(txt) {
	if (typeof txt == 'undefined') txt = '';
	return CDE.dom('th').txt(txt);
};
/**
 * Create a table data (TH) element
 * @see CDE.dom for stl and attr
 * @return CDE
 */
CDE.td = function(txt) {
	if (typeof txt == 'undefined') txt = '';
	return CDE.dom('td').txt(txt);
};
/**
 * Create a table. The first parameter is used to create the contents of the table (if present).
 * Every element of the parameter should be an array and represents a table row (TR).
 * Every sub-element is considered table data (TD). The first row is considered the table header (TH).
 * @param array arrArrMix=false Double array for table data. These elements (CDE.wrap-ped) are added to the table, row by row.
 * @see CDE.dom for stl and atr (applies to table only)
 * @see CDE.dom for tdStl and tdAtr (applies to TD elements only)
 * @see CDE.dom for thStl and thAtr (applies to TH elements only)
 * @return CDE
 */
CDE.table = function(arrArrMix, stl, atr, tdStl, tdAtr, thStl, thAtr){
	if (arrArrMix) {
		var th, td, tr, i=0, j, cdeTbody, cdeTable;
		cdeTable = CDE.dom('table').css(stl).atr(atr).add(
			CDE.dom('thead'),
			cdeTbody = CDE.dom('tbody')
		);
		// first element is the header, ensure there is at least one element
		if (arrArrMix.length > 0) {
			tr = CDE.dom('tr');
			for (j=0; j<arrArrMix[i].length; ++j) {
				// create th
				th = CDE.th().css(thStl).atr(thAtr);
				// if string, set innerHTML of th to it
				if (typeof arrArrMix[i][j] === 'string') th.txt(arrArrMix[i][j]);
				// else add the CDE.wrapped element
				else th.add(CDE.wrap(arrArrMix[i][j]));
				// add to row
				tr.add(th);
			}
			cdeTbody.add(tr);
		}
		// other rows are td's
		for (i=1; i<arrArrMix.length; ++i) {
			tr = CDE.dom('tr');
			for (j=0; j<arrArrMix[i].length; ++j) {
				// create td
				td = CDE.td('',tdStl, tdAtr);
				// if string or number, set innerHTML of td to it
				if (typeof arrArrMix[i][j] === 'string' || typeof arrArrMix[i][j] === 'number') td.txt(arrArrMix[i][j]);
				// else add the CDE.wrapped element
				else {
					td.add(CDE.wrap(arrArrMix[i][j]));
				}
				// add to row
				tr.add(td);
			}
			cdeTbody.add(tr);
		}
		return cdeTable;
	} else {
		if (window.debug) window.debug("CDE.table: no data received");
	}
	return {};
};
/**
 * Create a select. Good luck applying those styles...
 * @param array arrDesc List of descriptions for each option. It's what the user sees.
 * @param array arrValue List of values for each option. If false, the index of each value is used instead.
 * @param object objOpts An options object containing these optional parameters:
 * - stl: Styles applied to select
 * - atr: Attributes applied to select
 * - intSelectedIndex=false The option to select (optionally can be other than int)
 * - boolSelectByValue=false The selected index value should be matched by the option value instead, not the index
 * - optionStl=false Style applied to every option element
 * - optionAtr=false Attributes applied to every option element
 * - boolUseDescAsValue=false The value for every option should be equal to its description (only used when no arrValue was supplied, when false this value is it's index)
 * @return CDE The select element
 */
CDE.select = function(arrDesc, arrValue, objOpts){ // stl, atr, intSelectedIndex, boolSelectByValue, optionStl, optionAtr, boolUseDescAsValue
	// ensure the object exists
	if (!objOpts) objOpts = {};
	
	// create actual select
	var cde = CDE.dom('select').css(objOpts.stl).atr(objOpts.atr);
	var val;
	// add options
	for (var i=0; i<arrDesc.length; ++i) {
		// set value to corresponding value in value array, or to same value as description or to index
		val = arrValue?arrValue[i]:(objOpts.boolUseDescAsValue?arrDesc[i]:i);
		cde.add(
			CDE.dom('option')
			.css(objOpts.optionStl) // apply style from options
			.atr(objOpts.optionAtr) // apply attributes from options
			.val(val)               // set value
			.txt(arrDesc[i])        // set text
			.sel((objOpts.boolSelectByValue?val:i) == objOpts.intSelectedIndex) // select if passed on value is equal to index or value
		);
	}
	return cde;
};
/**
 * Create a resized image using a sprite map.
 * The x,y is the top-left coordinate of the target sprite
 * in the (original sized) sprite map.
 * tw,th is the target width/height of the image itself.
 * ow,oh is the original width/height of the image in the sprite.
 * It returns a div with overflow hidden only showing that part
 * of the resized sprite map, which we want to see, creating the
 * effect of the image showing, resized, but not the whole map.
 * Note that the function first downloads the sprite map so it 
 * can get it's original dimensions. This saves you having to
 * supply them :)
 * @param int x Position of result
 * @param int y Position of result
 * @param int tw Dimension of result image (of sprite map)
 * @param int th Dimension of result image (of sprite map)
 * @param int ow Dimension of original image (in sprite map)
 * @param int oh Dimension of original image (in sprite map)
 * @param string alt='' The title/alt text for the image
 * @return CDE
 */
CDE.sprite = function(src, x, y, tw, th, ow, oh, alt){
	var cde = CDE.div().oh().rel().wh(tw,th);
	// create an image, create onload callback and load the image
	// the callback will add the image to the container, which is
	// returned immediately
	var img = new Image();
	// set onload first to prevent race condition..
	img.onload = function(){
		
		// scale factor
		var dw = tw/ow;
		var dh = th/oh;
		// new size of entire sprite map
		var w = img.width * dw;
		var h = img.height * dh;
		// new coordinate locations
		x *= dw;
		y *= dh;
		
		img = null;
		
		// add the image to the container
		CDE.img(src, alt).abs(-Math.round(x),-Math.round(y),Math.round(w),Math.round(h)).ns().addTo(cde);
	};
	// setting the source forces the browser to start downloading the file (or fetch it from cache)
	img.src = src;
	// return container, the image will be set onload
	return cde;
};
/**
 * Create a stylesheet
 * Note that after creating, you can add styles through cde.txtn()
 * @param string str=false The contents of the stylesheet
 * @return CDE
 */
CDE.css = function(str){
	var cde = CDE.dom('style').atr({type: 'text/css'});
	
	if (cde.dom().styleSheet) cde._boolStyleSheet = true; // IE only; mark as stylesheet so txtn will take note of it...
	
	if (str) cde.txtn(str);

	return cde;
};
/**
 * Create a textarea
 * @return CDE
 */
CDE.textarea = function(){
	return CDE.dom('textarea');
};

// ################################
// #       Set atr methods        #
// ################################

/**
 * Sets innerHTML to str
 * If no argument is given, the current value of innerHTML is 
 * returned (warning, this can give different results, depending 
 * on your browser. take care with html-entities)
 * @param string str=undefined When no argument is passed on, the current innerHTML is returned.
 * @param bool boolAppend=false Append the string to innerHTML rather than replacing it
 * @param bool boolPrepend=false Prepend the string to innerHTML rather than replacing it
 * @return CDE <this> or current innerHTML without arguments
 */
CDE.prototype.txt = function(str, boolAppend, boolPrepend){ // innerHTML: str
	if (this._boolFailProof && !this.dom()) return this;
	if (arguments.length == 0) return this.dom().innerHTML;
	if (boolAppend) this.dom().innerHTML += str;
	else if (boolPrepend) this.dom().innerHTML = str + this.dom().innerHTML;
	else this.dom().innerHTML = str;
	return this;
};
/**
 * Add a textnode (does not clear parent, adds document.createTextNode)
 * @param string str
 * @return CDE <this>
 */
CDE.prototype.txtn = function(str){ // add textnode
	if (this._boolFailProof && !this.dom()) return this;

	if (this._boolStyleSheet) { // IE can't handle textnodes
		this.dom().styleSheet.cssText = str;
	} else {
		var x = document.createTextNode(str);
		this.dom().appendChild(x);
	}
	return this;
};
/**
 * Set or get the text value of this element. Used on input elements.
 * When no argument is supplied, the current value is returned (and unchanged)
 * @param string str=undefined
 * @return CDE <this>
 */
CDE.prototype.val = function(str){ // value: str
	if (this._boolFailProof && !this.dom()) return this;
	if (arguments.length == 0) return this.dom().value;
		this.dom().value = str;
	return this;
};
/**
 * Either return the value of the selected index of a select input or, if argument is supplied, set or unset the selected state based on the parameter.
 * Note: this should be a select input if no argument is passed on. It should be an option element if the parameter is supplied.
 * @param bool boolState=undefined When supplied (not undefined..) it will set this.dom().selected = boolState and return the element
 * @param bool boolTxt=false Return the innerHTML of the selected option, rather than the value
 * @return mixed
 */
CDE.prototype.sel = function(boolState, boolTxt){ // get/set selected option
	if (this._boolFailProof && !this.dom()) return this;
	// if undefined, get current selected value of select element
	if (typeof boolState == 'undefined') {
		if (boolTxt) return this.dom().options[this.dom().selectedIndex].innerHTML;
		return this.dom().options[this.dom().selectedIndex].value;
	}
	// select this option element and return `this`
	this.dom().selected = boolState;
	return this;
};
/**
 * Set this.checked to the value of bool. If no argument, return the current value instead.
 * @param bool bool=undefined
 * @return CDE <this>
 */
CDE.prototype.chk = function(bool){ // get/set checked
	if (this._boolFailProof && !this.dom()) return this;
	if (arguments.length == 0) return this.dom().checked;
	return this.atr('checked', !!bool);
};
/**
 * Change the id (and name) of the element. When no argument is given, the current id is returned instead.
 * @param str strId=undefined
 * @return this <CDE>
 */
CDE.prototype.id = function(strId){ // id: id
	if (arguments.length == 0) return this.dom().id;
	return this.atr({id:strId});
};
/**
 * Set the name of this element
 * Mostly used for radio buttons.
 * When no argument is given, it returns the current value for name.
 * @param string strName=undefined
 * @return CDE <this>
 */
CDE.prototype.name = function(strName){ // name: name
	if (arguments.length == 0) return this.dom().name;
	return this.atr({name: strName});
};

// ################################
// #       Set css methods        #
// ################################

// positional methods:

/**
 * Set position to absolute and map the args to .x(x).y(y).w(w).h(h)
 * @param int/string x
 * @param int/string y
 * @param int/string w
 * @param int/string h
 * @return CDE <this>
 */
CDE.prototype.abs = function(x, y, w, h){ // position: absolute; left: left; top: top; width: width; height: height;
	return this.css({position: 'absolute'}).x(x).y(y).w(w).h(h);
};
/**
 * Set width and height for element. Maps to this.w(w).h(h); If parameters are numbers, 'px' is appended to them. Undefined parameters are not changed.
 * @param mix width
 * @param mix height
 * @return this <CDE>
 */
CDE.prototype.wh = function(w, h){ // width/height
	return this.w(w).h(h);
};
/**
 * Set width of element in px
 * @param int w
 * @return CDE <this>
 */
CDE.prototype.w = function(w){ // width
	if (typeof(w) !== 'undefined' && w !== false) this.css('width', w+(typeof w == 'number'?'px':''));
	return this;
};
/**
 * Set height of element in px
 * @param int h
 * @return CDE <this>
 */
CDE.prototype.h = function(h){ // height
	if (typeof(h) !== 'undefined' && h !== false) this.css('height', h+(typeof h == 'number'?'px':''));
	return this;
};
/**
 * Map to this.x(x).y(y)
 * @param mix x
 * @param mix y
 * @return CDE <this>
 */
CDE.prototype.xy = function(x,y){ // left, top
	return this.x(x).y(y);
};
/**
 * Set left of element. If x is negative and a number, right is set instead. If x is undefined or false, nothing changes.
 * @param int x
 * @return CDE <this>
 */
CDE.prototype.x = function(x){ // left
	if (typeof(x) == 'number' && x < 0) return this.r(-x);
	if (typeof(x) != 'undefined' && x !== false) this.css('left',x+((typeof x == 'number')?'px':''));
	return this;
};
/**
 * Set top of element. If y is negative, bottom is set instead. If y is undefined, nothing changes.
 * @param int y
 * @return CDE <this>
 */
CDE.prototype.y = function(y){ // top
	if (typeof(y) == 'number' && y < 0) return this.b(-y);
	if (typeof(y) != 'undefined' && y !== false) this.css('top',y+((typeof y == 'number')?'px':''));
	return this; 
};
/**
 * Set right. If negative, left is set instead. If undefined, nothing changes.
 * @param mix r If number, 'px' is appended to it
 * @return CDE <this>
 */
CDE.prototype.r = function(r){ // right
	if (typeof(r) == 'number' && r < 0) return this.x(-r);
	if (typeof(r) != 'undefined' && r !== false) this.css('right',r+((typeof r == 'number')?'px':''));
	return this;
};
/**
 * Set bottom. If negative, top is set instead. If undefined, nothing changes.
 * @param mix b If number, 'px' is appended to it
 * @return CDE <this>
 */
CDE.prototype.b = function(b){ // bottom
	if (typeof(b) == 'number' && b < 0) return this.y(-b);
	if (typeof(b) != 'undefined' && b !== false) this.css('bottom', b+((typeof b == 'number')?'px':''));
	return this;
};

// other css methods:

/**
 * Set the background of this element. Optionally set repeat and position
 * @param string strUrl Path to image (doh)
 * @param int intRepeat=repeat Set to 1= no-repeat, 2=repeat-x, 3=repeat-y, 4=repeat.
 * @param int intPosX=0 Sets background-position. If neither x nor y is supplied, they dont change.
 * @param int intPosY=0 Sets background-position. If neither x nor y is supplied, it doesnt change.
 * @return this
 */
CDE.prototype.bg = function(strUrl, intRepeat, intPosX, intPosY){ // background-image. no-repeat, repeat-x, repeat-y, repeat
	var obj = {backgroundImage: 'url('+strUrl+')'};
	obj.backgroundRepeat = intRepeat || 'repeat';
	if (arguments.length >= 2) obj.backgroundPosition = (intPosX||0)+'px '+(intPosY||0)+'px';
	return this.css(obj);
};
/**
 * Create a sprite image.
 * Take the image, put it as background and move it to the correct position.
 * Note that parameters are positive, while the position-offset is negative.
 * This means the function expects positive coordinates of the top-left
 * corner of the image in the sprite.
 * @see CDE.sprite for resized sprites...
 * @param string sprite Image location
 * @param int x=0 Left-most pixel of image in sprite map
 * @param int y=0 Top-most pixel of image in sprite map
 * @return CDE <this>
 */
CDE.prototype.sprite = function(sprite, x, y){
	return this.bg(sprite, 'no-repeat', -x||0, -y||0);
};
/**
 * Set the background-color for this element
 * @param string strColor html-color
 * @return this <CDE>
 */
CDE.prototype.bgc = function(strColor){ // background-color
	return this.css('backgroundColor', strColor);
};
/**
 * Set bold
 * @return CDE <this>
 */
CDE.prototype.bold = function(){ // font-weight: bold
	return this.css('fontWeight', 'bolder');
};
/**
 * The inverse of bold()
 * @return CDE <this
 */
CDE.prototype.unbold = function(){ // font-weight: normal
	return this.css('fontWeight', 'normal');
};
/**
 * Set border: 1px solid <strColor>
 * @param string strColor HTML color
 * @param int px=1 Width of border
 * @return CDE <this>
 */
CDE.prototype.sb = function(strColor, px){ // border: 1px solid
	return this.css('border', (px||1)+'px solid '+(strColor||'black'));
};
/**
 * Set border bottom. Undefined parameters are skipped. False parameters are defaulted (1,black,sold).
 * @param mix w=undefined Width
 * @param string c=undefined Color
 * @param string s=undefined Style (solid, dotted, etc)
 * @return CDE <this>
 */
CDE.prototype.bb = function(w, c, s){
	return this._setBorder('Bottom', w, c, s);
};
/**
 * Set border left. Undefined parameters are skipped. False parameters are defaulted (1,black,sold).
 * @param mix w=undefined Width
 * @param string c=undefined Color
 * @param string s=undefined Style (solid, dotted, etc)
 * @return CDE <this>
 */
CDE.prototype.bl = function(w, c, s){
	return this._setBorder('Left', w, c, s);
};
/**
 * Set border right. Undefined parameters are skipped. False parameters are defaulted (1,black,sold).
 * @param mix w=undefined Width
 * @param string c=undefined Color
 * @param string s=undefined Style (solid, dotted, etc)
 * @return CDE <this>
 */
CDE.prototype.br = function(w, c, s){
	return this._setBorder('Right', w, c, s);
};
/**
 * Set border top. Undefined parameters are skipped. False parameters are defaulted (1,black,sold).
 * @param mix w=undefined Width
 * @param string c=undefined Color
 * @param string s=undefined Style (solid, dotted, etc)
 * @return CDE <this>
 */
CDE.prototype.bt = function(w, c, s){
	return this._setBorder('Top', w, c, s);
};
/**
 * Set the border on one edge. Undefined parameters are skipped. False parameters are defaulted (1,black,sold).
 * @param string d Direction (Top, Right, Bottom, Left), first char uppercase
 * @param int w width
 * @param string c color
 * @param string s style (solid, dotted, etc)
 * @return CDE <this>
 */
CDE.prototype._setBorder = function(d, w, c, s){
	if (w === false) w = 1;
	if (c === false) c = 'black';
	if (s === false) s = 'solid';
	if (typeof w != 'undefined') this.css('border'+d+'Width', w+(typeof w == 'number'?'px':''));
	if (typeof c != 'undefined') this.css('border'+d+'Color', c);
	if (typeof s != 'undefined') this.css('border'+d+'Style', s);
	return this;
};


/**
 * Set the border of the element to a button or input
 * type of border. One achieves this by setting the
 * top and left borders to something light and bottom
 * and right borders to something dark. This causes a 
 * shadow effect causing the element itself to appear
 * higher. If you turn the colors around, the element
 * will appear to be deeper than its surroundings.
 * @param string strTopLeft HTML color for the top and left border
 * @param string strBottomRight HTML color for the bottom and right border
 * @param int px=1 Width of border
 * @return CDE <this>
 */
CDE.prototype.b3d = function(strColorTopLeft, strColorBottomRight, px){ // border: 1px solid <color1>, border-right: 1px solid <color2>, border-bottom: 1px solid <color2>
	return this.sb(strColorTopLeft, px).css({borderRight: (px||1)+'px solid '+strColorBottomRight, borderBottom: (px||1)+'px solid '+strColorBottomRight});
};
/**
 * Set text color
 * @param string str The color
 * @return CDE <this>
 */
CDE.prototype.c = function(str){ // color
	return this.css('color',str);
};
/**
 * Center this element in the viewport. Element must have layout for this to work (need to get width/height). 
 * This sets the element absolute... Unless both parameters are true, then nothing happens.
 * @param bool boolNotHor=false Dont change horizontal
 * @param bool boolNotVer=false Dont change vertical
 * @return CDE <this>
 */
CDE.prototype.center = function(boolNotHor, boolNotVer){
	if (boolNotHor && boolNotVer) return this;
	var cp = CDE.scrollPos();
	var vp = CDE.viewportSize();
	this.abs();
	var pos = this.pos();
	if (!boolNotHor) this.x(Math.round((cp.x+(vp.w/2))-(pos.w/2)));
	if (!boolNotVer) this.y(Math.round((cp.y+(vp.h/2))-(pos.h/2)));
	vp = pos = null;
	return this;
};
/**
 * Set clear: left
 * @return CDE <this>
 */
CDE.prototype.cl = function(){ // clear: left
	return this.css('clear', 'left');
};
/**
 * Set clear: right
 * @return CDE <this>
 */
CDE.prototype.cr = function(){ // clear: right
	return this.css('clear', 'right');
};
/**
 * Set clear: both
 * @return CDE <this>
 */
CDE.prototype.cb = function(){ // clear: both
	return this.css('clear', 'both');
};
/**
 * Set cursor:pointer
 * @return CDE <this>
 */
CDE.prototype.cp = function(){ // cursor:pointer
	return this.css('cursor', 'pointer');
};
/**
 * Set cursor:default
 * @return CDE <this>
 */
CDE.prototype.cd = function(){ // cursor:default
	return this.css('cursor', 'default');
};
/**
 * Set cursor:move
 * @return CDE <this>
 */
CDE.prototype.cm = function(){ // cursor: move
	return this.css('cursor', 'move');
};
/**
 * Set display: none
 * @return CDE <this>
 */
CDE.prototype.dn = function(){ // display: none
	return this.css('display', 'none');
};
/**
 * Set display: inline
 * @return CDE <this>
 */
CDE.prototype.di = function(){ // display: inline
	return this.css('display', 'inline');
};
/**
 * Set display: block
 * @return CDE <this>
 */
CDE.prototype.db = function(){ // display: block
	return this.css('display', 'block');
};
/**
 * Float left (ie version is caught and fixed at css())
 * @return CDE <this>
 */
CDE.prototype.fl = function(){ // float:left
	return this.css('cssFloat', 'left');
};
/**
 * Float right (ie version is caught and fixed at css())
 * @return CDE <this>
 */
CDE.prototype.fr = function(){ // float:right
	return this.css('cssFloat', 'right');
};
/**
 * Set font size in px
 * @param int px=1
 * @return CDE <this>
 */
CDE.prototype.fs = function(px){ // font-size
	return this.css('fontSize', (px||1)+'px');
};
/**
 * Create a hover effect by applying the on styles onmouseover and the offstyle onmouseout
 * @param obj on An objlit containing the styles to assign on mouseover
 * @param obj off An objlit containing the styles to assign on mouseout
 * @return cde <this>
 */
CDE.prototype.hover = function(on, off){
	var that = this;
	return CDE.on('mouseover', function(){ that.css(on); }).on('mouseout', function(){ that.css(off); });
};
/**
 * Set line-height
 * @param int px=1 Line-height in px
 * @return CDE <this>
 */
CDE.prototype.lh = function(px){ // line-height
	return this.css('lineHeight', (px||1)+'px');
};
/**
 * Set margin, in px.
 * This works in two ways.
 * If only one argument is given, it is set to margin.
 * If an argument is not number or string, it is ignored.
 * Numbers will get 'px' appended to them before assignment.
 * 
 * @param int|string top=false If right,bottom and left are not given at all, this parameter is set to all sides.
 * @param int|string right=false
 * @param int|string bottom=false
 * @param int|string left=false
 * @return CDE <this>
 */
CDE.prototype.m = function(top,right,bottom,left){ // margin
	var obj = {};
	// if just one number argument set it to all margins
	if (arguments.length == 1) return this.css('margin', top+(typeof top == 'number'?'px':''));
	// otherwise check each side individually
	if (typeof (top)    == 'string' || typeof(top)    == 'number') obj.marginTop    = top    +(typeof top == 'number'?'px':'');
	if (typeof (right)  == 'string' || typeof(right)  == 'number') obj.marginRight  = right  +(typeof right == 'number'?'px':'');
	if (typeof (bottom) == 'string' || typeof(bottom) == 'number') obj.marginBottom = bottom +(typeof bottom == 'number'?'px':'');
	if (typeof (left)   == 'string' || typeof(left)   == 'number') obj.marginLeft   = left   +(typeof left == 'number'?'px':'');
	
	return this.css(obj);
};
/**
 * Set margin-top
 * @param int px
 * @return CDE <this>
 */
CDE.prototype.mt = function(px){ // margin-top
	return this.m(px, false);
};
/**
 * Set margin-right
 * @param int px
 * @return CDE <this>
 */
CDE.prototype.mr = function(px){ // margin-right
	return this.m(false,px);
};
/**
 * Set margin-bottom
 * @param int px
 * @return CDE <this>
 */
CDE.prototype.mb = function(px){ // margin-bottom
	return this.m(false,false,px);
};
/**
 * Set margin-left
 * @param int px
 * @return CDE <this>
 */
CDE.prototype.ml = function(px){ // margin-left
	return this.m(false,false,false,px);
};
/**
 * NoSelection
 * Attempt to prevent selection of the text. Not really usefull for blocking 
 * text-grabbing (although it'll work for non-techies, i guess), but it is
 * usefull in GUI design for JS buttons or dragging, because selecting stuff
 * is uuuuugley.
 * Note that the DOM level 1 events onselectstart, ondragstart and 
 * onmousedown are replaced by return false functions.
 * @return CDE <this>
 */
CDE.prototype.ns = function(){ // noselect
	// dont use this.on(), that way we prevent multiple assignments...
	// in case this method gets called multiple times on the same object
	// the method would otherwise insert multiple listeners for the exact
	// same effect... quite pointless. The dangers in 'overwriting' the
	// DOM level 1 event selectstart is quite non-existent, me thinks. 
	// onmousedown could possibly be more dangerous, but when you use 
	// .on for the other events, this remains harmless.
	this.dom().onmousedown = function(){return false;}; // o
	this.dom().onselectstart = function(){return false;}; // ie
	this.dom().ondragstart = function(){return false;}; // ie
	return this.css({MozUserSelect: 'none'}); // fx
};
/**
 * Set the opacity of this element
 * @param int value 1 is completely opaque, 0 is completely transparent
 */
CDE.prototype.o = function(value){ // opacity: value
	return this.css('opacity', value);
};
/**
 * Set overflow hidden
 * @return CDE <this>
 */
CDE.prototype.oh = function(){ // overflow: hidden
	return this.css('overflow', 'hidden');
};
/**
 * Set overflow visible
 * @return CDE <this>
 */
CDE.prototype.ov = function(){ // overflow: visible
	return this.css('overflow', 'visible');
};
/**
 * This works in two ways.
 * If only one argument is given, it is set to padding.
 * If an argument is not number or string, it is ignored.
 * Numbers will get 'px' appended to them before assignment.
 *
 * @param int|string top=false If right,bottom and left are not given at all, this parameter is set to all sides.
 * @param int|string right=false
 * @param int|string bottom=false
 * @param int|string left=false
 * @return CDE <this>
 */
CDE.prototype.p = function(top,right,bottom,left){ // padding
	var obj = {};
	// if just one number argument set it to all paddings
	if (arguments.length == 1) return this.css('padding', top+(typeof top == 'number'?'px':''));
	// otherwise check each side individually
	if (typeof (top)    == 'string' || typeof(top)    == 'number') obj.paddingTop    = top    +(typeof top == 'number'?'px':'');
	if (typeof (right)  == 'string' || typeof(right)  == 'number') obj.paddingRight  = right  +(typeof right == 'number'?'px':'');
	if (typeof (bottom) == 'string' || typeof(bottom) == 'number') obj.paddingBottom = bottom +(typeof bottom == 'number'?'px':'');
	if (typeof (left)   == 'string' || typeof(left)   == 'number') obj.paddingLeft   = left   +(typeof left == 'number'?'px':'');

	return this.css(obj);
};
/**
 * Set padding-top
 * @param int px
 * @return CDE <this>
 */
CDE.prototype.pt = function(px){ // padding-top
	return this.p(px, false);
};
/**
 * Set padding-right
 * @param int px
 * @return CDE <this>
 */
CDE.prototype.pr = function(px){ // padding-right
	return this.p(false,px);
};
/**
 * Set padding-bottom
 * @param int px
 * @return CDE <this>
 */
CDE.prototype.pb = function(px){ // padding-bottom
	return this.p(false,false,px);
};
/**
 * Set padding-left
 * @param int px
 * @return CDE <this>
 */
CDE.prototype.pl = function(px){ // padding-left
	return this.p(false,false,false,px);
};
/**
 * Set position:relative
 * You need this to get absolute positioned childs to be positioned relative to their parent.
 * @return CDE <this>
 */
CDE.prototype.rel = function(){ // position: relative
	return this.css('position', 'relative');
};
/**
 * Causes a strike through-ed text effect
 * @see tdn
 * @return CDE <this>
 */
CDE.prototype.strike = function(){ // text-decoration: line-through
	return this.css('textDecoration', 'line-through');
};
/**
 * Set text-align: center
 * @return CDE <this>
 */
CDE.prototype.tac = function(){ // text-align: center
	return this.css('textAlign', 'center');
};
/**
 * Set text-align: left
 * @return CDE <this>
 */
CDE.prototype.tal = function(){ // text-align: left
	return this.css('textAlign', 'left');
};
/**
 * Set text-align: right
 * @return CDE <this>
 */
CDE.prototype.tar = function(){ // text-align: right
	return this.css('textAlign', 'right');
};
/**
 * Set text-align: justify
 * @return CDE <this>
 */
CDE.prototype.taj = function(){ // text-align: justify
	return this.css('textAlign', 'justify');
};
/**
 * Set text-decoration to none
 * @return cde <this>
 */
CDE.prototype.tdn = function(){ // text-decoration: none;
	return this.css('textDecoration','none');
};
/**
 * Set visibility to hidden
 * @return CDE <this>
 */
CDE.prototype.vh = function(){ // visibility: hidden
	return this.css('visibility', 'hidden');
};
/**
 * Set visibility to visible
 * @return CDE <this>
 */
CDE.prototype.vv = function(){ // visibility: visible
	return this.css('visibility', 'visible');
};
/**
 * Set vertical align to middle
 * @return CDE <this>
 */
CDE.prototype.vam = function(){ // vertical-align: middle
	return this.css('verticalAlign', 'middle');
};
/**
 * Set white-space to normal
 * @return cde <this>
 */
CDE.prototype.wsn = function(){ // default
	return this.css('whiteSpace', 'normal');
};
/**
 * Set white-space to nowrap
 * @return cde <this>
 */
CDE.prototype.wsnw = function(){ // white-space: nowrap (pre without ws)
	return this.css('whiteSpace', 'nowrap');
};
/**
 * Set white-space to pre
 * @return cde <this>
 */
CDE.prototype.wsp = function(){ // white-space: pre (<pre>)
	return this.css('whiteSpace', 'pre');
};
/**
 * Set white-space to pre-line
 * @return cde <this>
 */
CDE.prototype.wspl = function(){ // white-space: pre-line (also break on \n)
	return this.css('whiteSpace', 'pre-line');
};
/**
 * Set white-space to pre-wrap
 * @return cde <this>
 */
CDE.prototype.wspw = function(){ // pre with wrapping
	return this.css('whiteSpace', 'pre-wrap');
};
/**
 * Set z-index
 * @param int z
 * @return CDE <this>
 */
CDE.prototype.z = function(z){ // z-index 
	return this.css('zIndex', z);
};
/**
 * Add div to clear left floating elements
 * @return CDE
 */
CDE.clearLeft = function(){
	return CDE.div().cl();
};
/**
 * Add div to clear right floating elements
 * @return CDE
 */
CDE.clearRight = function(){
	return CDE.div().cr();
};
/**
 * Add div to clear floating elements on both sides
 * @return CDE
 */
CDE.clearBoth = function(){
	return CDE.div().cb();
};

/**
 * Fade the element out and remove it from dom after the fade completes...
 * Note that any callback supplied through the options are overwritten,
 * use the cb parameter for that. The options are passed on to ease, with
 * a custom callback (wrapping the cb parameter).
 * @param function cb=false Callback executed after del
 * @param object options=false The options parameter for ease for the fade
 * @return cde <this>
 */
CDE.prototype.fadeDel = function(cb, options){ // fade out and then remove from dom
	if (!options) options = {};
	options.boolAfterFadeDelete = true;
	options.callback = cb;
	return this.ease({opacity: 0}, options);
};
/**
 * Same as fadeDel except it also removes it and its childeren from cache
 * @param function cb=false Callback executed after del
 * @param object options=false The options parameter for ease for the fade
 * @return cde <this>
 */
CDE.prototype.fadeDelUncache = function(cb, options){ // fade out. remove from dom and uncache completely
	if (!options) options = {};
	options.boolAfterEaseUncacheCompletely = true;
	return this.fadeDel(cb, options);
};
/**
 * Simple map to ease for fading an element in
 * @param function=false func callback after fadein
 * @param object=false options for ease (callback will be overwritten by func, if present)
 * @param float max=1 Max value for opacity
 * @return cde <this>
 */
CDE.prototype.fadeIn = function(func, options, max){
	if (!options) options = {};
	if (func) options.callback = func;
	return this.ease({opacity: max||1},options);
};
/**
 * Simple map to ease for fading an element out
 * @param function=false func callback after fadein
 * @param object=false options for ease (callback will be overwritten by func, if present)
 * @param float min=0 Min value for opacity
 * @return cde <this>
 */
CDE.prototype.fadeOut = function(func, options, min){
	if (!options) options = {};
	if (func) options.callback = func;
	return this.ease({opacity: min>0?min:0},options);
};
/**
 * Set opacity to zero, add to body, center and fade in.
 * It's a common thing to do for popups.
 * @return cde <this>
 */
CDE.prototype.centerFade = function(options, max){
	return this.o(0).dba().center().fadeIn(false,options, max);
};
/**
 * Add this to given element, set opacity to 0 before doing so and
 * fade the element in afterwards. Just a shorthand for those steps.
 * @param cde cde element to add this to
 * @param object options Passed on to ease directly
 * @return cde <this>
 */
CDE.prototype.addToFading = function(cde, options, max){ // .o(0).addTo(cde).fadeIn()
	return this.o(0).addTo(cde).fadeIn(false, options, max);
};

// ###################################
// #        Helper functions         #
// ###################################

/**
 * Return an object literal with the width and height of the document 
 * (not the window, not the browser, not the viewport but the entire 
 * document including the parts hidden by scrollbars)
 * @see http://unixpapa.com/js/mouse.html for some 
 *
 * @return {w:int, h:int}
 */
CDE.docSize = function(){
	return {
		w: document.documentElement.scrollWidth,
		h: document.documentElement.scrollHeight
	};
};

/**
 * Return the size of the viewport (the actual content area of the browser, not hidden by scrollbars).
 * See CDE.docSize for total area of content area
 * Untested in IE6
 * @return {w:int, h:int}
 */
CDE.viewportSize = function(){
	var size = {w:0,h:0};
	if (window.innerWidth) { // all but ie
		size.w = window.innerWidth;
		size.h = window.innerHeight;
	} else if (document.documentElement && document.documentElement.clientHeight) { // ie7/8
		size.w = document.documentElement && document.documentElement.clientWidth;
		size.h = document.documentElement && document.documentElement.clientHeight;
	} else if (document.body && document.body.offsetWidth) { // ?
		size.w = document.body.offsetWidth;
		size.h = document.body.offsetHeight;
	}
	return size;
};

/**
 * Get the scroll position of the browser
 * @return {x:int,y:int}
 */
CDE.scrollPos = function(){
  var pos = {x:0,y:0};
  if( typeof( window.pageYOffset ) == 'number' ) {
    //Netscape compliant
    pos.x = window.pageXOffset;
    pos.y = window.pageYOffset;
  } else if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
    //DOM compliant
    pos.x = document.body.scrollLeft;
    pos.y = document.body.scrollTop;
  } else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
    //IE6 standards compliant mode
    pos.x = document.documentElement.scrollLeft;
    pos.y = document.documentElement.scrollTop;
  }
  return pos;
};

/**
 * Disable the page.
 * Puts a black semi-transparent div over the entire document.
 * The div catches all the events effectively rendering the
 * page disabled. In IE6 you'll need to hide any comboboxes...
 * Note that this will not work well with other (semi)transparent
 * content in the page, as well as flash-objects (which is a
 * particular impossible problem in fx, you can fix it in ie by
 * setting the wmode of the flash object to transparent).
 * @param string id=false The id for the element
 * @param int trans=0.5
 * @param int z=1000 z-index for div (in case you use z-indexes beyond 1000 or need to put the div between certain z-indices)
 * @return CDE (the div)
 */
CDE.disablePage = function(id, trans,z){
	var size = CDE.docSize();
	return CDE.div().z(z||1000).bgc('black').id(id).abs(0,0,size.w,size.h).o(0).dba().ease({'opacity': trans||0.5});
};

/**
 * Show a popup, centered on screen.
 * You probably want to specify a max width or height in objPopupStyles...
 * The styles, optional, are applied after the default styles, so you can override anything with them.
 * The function returns a function to control the popup, like recentering it in case some dimension change...
 * @param string strTitle Text for the popup title
 * @param mix content The content for the popup. If string, will be wrapped in a span. Otherwise it's wrapped in CDE.
 * @param function funcOk The callback for clicking ok. The cancel option is not shown when there is no ok or cancel callback, or when explicitly hidden.
 * @param object options=false Optional additional parameters for the popup:
 *       string strOk=ok: title of the ok button
 *       string strCancel=cancel: title of the cancel button
 *       function funcCancel: The callback for clicking cancel.  The cancel option is not shown when there is no ok or cancel callback.
 *       object objPopupStyles: This object sets/overrides styles of the popup container
 *       object objHeadStyles: This sets/overrides the title bar
 *       object objBodyStyles: This sets/overrides the content container
 *       bool boolNoDisable: do not disable the entire page (used for showing a second popup while one is already up, or whatever)
 *       bool boolNoCancel: do not show the cancel button (if you want certain behavior by the ok button)
 *       bool boolNoFocus: do not set focus to ok or cancel link (cancel is set by default, unless it doesn't exist or is overridden, in which case the ok link is focussed)
 *       function funcAfterFade: Called after the panel has faded out after clicking hte ok or cancel button (to cleanup visual stuff)
 * @return obj {reposition:func,hideButtons:func,showButtons:func,ok:func,cancel:func,show:func,hide:func,cde:cdePopup} Control functions for the popup
 */
CDE.popup = function(strTitle, content, funcOk, options) { // funcCancel, funcAfterFade, boolNoCancel, strOk, strCancel, objPopupStyles, objHeadStyles, objBodyStyles, boolNoDisable, boolNoFocus, boolFocusOk
	var cdeBlack, cdeButtons, cdePopup, boolClosed, boolCancelButton, cdeOk, cdeCancel, funcs;

	// make sure this object exists
	if (!options) options = {};
	
	// show black disable panel?
	if (!options.boolNoDisable) cdeBlack = CDE.disablePage();
	// is the popup "open" or "closed" ?
	boolClosed = false;
	
	// the popup controller
	funcs = {};
	
	// clicking ok
	funcs.ok = function(){
		boolClosed = true;
		cdePopup.fadeDelUncache(options.funcAfterFade);
		if (cdeBlack) cdeBlack.fadeDelUncache();
		if (funcOk) funcOk();
	};
	// clicking cancel
	funcs.cancel = function(){
		boolClosed = true;
		cdePopup.fadeDelUncache(options.funcAfterFade);
		if (cdeBlack) cdeBlack.fadeDelUncache(false, true, true);
		if (options.funcCancel) options.funcCancel();
	};

	// recenter the popup
	funcs.center = function(){
		cdePopup.center();
	};
	
	// make sure we have a CDE for content
	if (typeof content == 'string') content = CDE.txt(content);
	else content = CDE.wrap(content);

	// only add cancel option if either callback is given and it should not be hidden in the first place
	// when true, the cross gets the innerCancel callback, else it's tied to the innerOk callback
	boolCancelButton = !!(!options.boolNoCancel && (funcOk || options.funcCancel));

	// create a div and add content
	// get the dimensions and position it centered, depending on this position
	// to get the position, the element needs to be displayed, but right now
	// we dont know yet where because we need the dimensions first. this is a
	// vicious loop we break by first adding the div invisibly. then we get
	// it's dimensions, reposition it and fade it in. Ain't it great? ;)
	cdePopup = CDE.div().cd().z(1001).abs(0, 0).o(0).css(options.objPopupStyles).add(
		CDE.div().p(2).bgc('blue').c('white').css(options.objHeadStyles).rel().add(
			CDE.div().w(100).h(1), // artificially force a minimum width
			CDE.lnk('X', boolCancelButton ? funcs.cancel : funcs.ok).abs().r(5).ns(), // should cancel, unless cancel button is not shown, use ok in that case
			CDE.txt(strTitle||'')
		),
		CDE.div().br(1,'black').bb(1,'black','solid').p(3).bgc('white').css(options.objBodyStyles).rel().add(
			content,
			cdeButtons = CDE.div().cb().add(
				cdeOk = CDE.lnk(options.strOk||'Ok', funcs.ok).c('blue'),
				(boolCancelButton?[
					CDE.txt('&nbsp;&nbsp;'),
					cdeCancel = CDE.lnk(options.strCancel||'Cancel', funcs.cancel).c('blue')
				]:null)
			)
		)
	).dba(); // add to body to force browser to compute dimensions (still hidden at this point)
	
	// focus the cancel link, unless specified otherwise or it doesnt exist
	if (!options.boolNoFocus && boolCancelButton && !options.boolFocusOk) cdeCancel.dom().focus();
	// cancel was not focussed, focus ok, unless not focussing at all
	else if (!options.boolNoFocus) cdeOk.dom().focus();
	
	funcs.hideButtons = function(boolFade){
		if (boolFade) cdeButtons.ease({opacity:0});
		else cdeButtons.dn();
	};
	funcs.showButtons = function(boolFade){
		if (boolFade) cdeButtons.ease({opacity:1});
		else cdeButtons.o(1).db();
	};
	funcs.show = function(){ cdePopup.ease({opacity: 1}); };
	funcs.hide = function(){ cdePopup.ease({opacity: 0}); };
	funcs.cde = cdePopup;
	
	// now center the popup
	funcs.center();
	// and show
	funcs.show();
	
	// return the controller for this popup
	return funcs;
};

/**
 * Return the argument as hex color.
 * If the color is a name, these are supported by default build: beige, black, blue, brown, cyan, gold, gray, green,
 * indigo, ivory, khaki, lavender, lime, linen, magenta, maroon, moccasin, navy, olive, orange, orchid, peru, pink,
 * plum, purple, red, salmon, sienna, silver, snow, tan, teal, thistle, tomato, turquoise, violet, wheat, white, yellow
 * You can find all the colors as well, just decomment them to get their support (adds about 3.5kb to the size of CDE)
 
 debug(CDE.nColor('#abc'));
 debug(CDE.nColor('abc'));
 debug(CDE.nColor('#aabbcc'));
 debug(CDE.nColor('aabbcc'));
 debug(CDE.nColor('#11aabbcc'));
 debug(CDE.nColor('11aabbcc'));
 debug(CDE.nColor('rgb(100,200,256)'));
 debug(CDE.nColor('rgb(100,200,13)'));
 
 * @param string color Should be any result from the browser when checking the applied style, colornames are restricted (but you can extend that to support any in the source)
 * @param bool noHash=false Prefix the hash on return?
 * @return string
 */
CDE.nColor = function(str,noHash){
	var r,m,obj,hash=(noHash?'':'#');
	str = (str+'').toLowerCase();

	// [#]xxxxxx
	r = /^#?([0-9a-f]{6})$/;
	if (m = r.exec(str)) return hash+m[1];

	// [#]xxx
	r = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/;
	if (m = r.exec(str)) return hash+m[1]+m[1]+m[2]+m[2]+m[3]+m[3];

	// #aarrggbb (with alpha, is IE only), normalize to #rrggbb
	r = /^#?[0-9a-f]{2}([0-9a-f]{6})$/;
	if (m = r.exec(str)) return hash+m[1];

	// rgb(xxx, xxx, xxx)
	r = /^rgb\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)$/;
	m = r.exec(str);
	if (m && m.index == 0) {
		return hash +
			(m[1]%256 < 16?'0':'')+(parseInt(m[1], 10)%256).toString(16) +
			(m[2]%256 < 16?'0':'')+(parseInt(m[2], 10)%256).toString(16) +
			(m[3]%256 < 16?'0':'')+(parseInt(m[3], 10)%256).toString(16);
	}

	// named color (common)
	obj = {
		black:'000000',
		blue:'0000ff',
		brown:'a52a2a',
		cyan:'00ffff',
		gray:'808080',
		green:'008000',
		lime:'00ff00',
		magenta:'ff00ff',
		orange:'ffa500',
		pink:'ffc0cb',
		purple:'800080',
		red:'ff0000',
		turquoise:'40e0d0',
		violet:'ee82ee',
		white:'ffffff',
		yellow:'ffff00'
	};
	if (obj[str]) return hash+obj[str];

/*
	// http://www.w3schools.com/html/html_colornames.asp	
	var obj = {
		aliceblue:'#f0f8ff',
		antiquewhite:'#faebd7',
		aqua:'#00ffff',
		aquamarine:'#7fffd4',
		azure:'#f0ffff',
		beige:'#f5f5dc',
		bisque:'#ffe4c4',
		black:'#000000',
		blanchedalmond:'#ffebcd',
		blue:'#0000ff',
		blueviolet:'#8a2be2',
		brown:'#a52a2a',
		burlywood:'#deb887',
		cadetblue:'#5f9ea0',
		chartreuse:'#7fff00',
		chocolate:'#d2691e',
		coral:'#ff7f50',
		cornflowerblue:'#6495ed',
		cornsilk:'#fff8dc',
		crimson:'#dc143c',
		cyan:'#00ffff',
		darkblue:'#00008b',
		darkcyan:'#008b8b',
		darkgoldenrod:'#b8860b',
		darkgray:'#a9a9a9',
		darkgreen:'#006400',
		darkkhaki:'#bdb76b',
		darkmagenta:'#8b008b',
		darkolivegreen:'#556b2f',
		darkorange:'#ff8c00',
		darkorchid:'#9932cc',
		darkred:'#8b0000',
		darksalmon:'#e9967a',
		darkseagreen:'#8fbc8f',
		darkslateblue:'#483d8b',
		darkslategray:'#2f4f4f',
		darkturquoise:'#00ced1',
		darkviolet:'#9400d3',
		deeppink:'#ff1493',
		deepskyblue:'#00bfff',
		dimgray:'#696969',
		odgerblue:'#1e90ff',
		firebrick:'#b22222',
		floralwhite:'#fffaf0',
		forestgreen:'#228b22',
		fuchsia:'#ff00ff',
		gainsboro:'#dcdcdc',
		ghostwhite:'#f8f8ff',
		gold:'#ffd700',
		goldenrod:'#daa520',
		gray:'#808080',
		green:'#008000',
		greenyellow:'#adff2f',
		honeydew:'#f0fff0',
		hotpink:'#ff69b4',
		indianred:' #cd5c5c',
		indigo:' #4b0082',
		ivory:'#fffff0',
		khaki:'#f0e68c',
		lavender:'#e6e6fa',
		lavenderblush:'#fff0f5',
		lawngreen:'#7cfc00',
		lemonchiffon:'#fffacd',
		lightblue:'#add8e6',
		lightcoral:'#f08080',
		lightcyan:'#e0ffff',
		lightgoldenrodyellow:'#fafad2',
		lightgrey:'#d3d3d3',
		lightgreen:'#90ee90',
		lightpink:'#ffb6c1',
		lightsalmon:'#ffa07a',
		lightseagreen:'#20b2aa',
		lightskyblue:'#87cefa',
		lightslategray:'#778899',
		lightsteelblue:'#b0c4de',
		lightyellow:'#ffffe0',
		lime:'#00ff00',
		limegreen:'#32cd32',
		linen:'#faf0e6',
		magenta:'#ff00ff',
		maroon:'#800000',
		mediumaquamarine:'#66cdaa',
		mediumblue:'#0000cd',
		mediumorchid:'#ba55d3',
		mediumpurple:'#9370d8',
		mediumseagreen:'#3cb371',
		mediumslateblue:'#7b68ee',
		mediumspringgreen:'#00fa9a',
		mediumturquoise:'#48d1cc',
		mediumvioletred:'#c71585',
		midnightblue:'#191970',
		mintcream:'#f5fffa',
		mistyrose:'#ffe4e1',
		moccasin:'#ffe4b5',
		navajowhite:'#ffdead',
		navy:'#000080',
		oldlace:'#fdf5e6',
		olive:'#808000',
		olivedrab:'#6b8e23',
		orange:'#ffa500',
		orangered:'#ff4500',
		orchid:'#da70d6',
		palegoldenrodv#eee8aa',
		palegreen:'#98fb98',
		paleturquoise:'#afeeee',
		palevioletred:'#d87093',
		papayawhip:'#ffefd5',
		peachpuff:'#ffdab9',
		peru:'#cd853f',
		pink:'#ffc0cb',
		plum:'#dda0dd',
		powderblue:'#b0e0e6',
		purple:'#800080',
		red:'#ff0000',
		rosybrown:'#bc8f8f',
		royalblue:'#4169e1',
		saddlebrown:'#8b4513',
		salmon:'#fa8072',
		sandybrown:'#f4a460',
		seagreen:'#2e8b57',
		seashell:'#fff5ee',
		sienna:'#a0522d',
		silver:'#c0c0c0',
		skyblue:'#87ceeb',
		slateblue:'#6a5acd',
		slategray:'#708090',
		snow:'#fffafa',
		springgreen:'#00ff7f',
		steelblue:'#4682b4',
		tan:'#d2b48c',
		teal:'#008080',
		thistle:'#d8bfd8',
		tomato:'#ff6347',
		turquoise:'#40e0d0',
		violet:'#ee82ee',
		wheat:'#f5deb3',
		white:'#ffffff',
		whitesmoke:'#f5f5f5',
		yellow:'#ffff00',
		yellowgreen:'#9acd32'
	}
	if (obj[str]) return obj[str];
*/

	return hash+'ffffff';
};

/**
 * Get a color, normalize it, and return the rgb colors
 * Unless three parameters are given, in that case return a hex color with those rgb values... (yes, confusing, but whatever)

 debug(CDE.rgb('#abc'));
 debug(CDE.rgb('abc'));
 debug(CDE.rgb('#aabbcc'));
 debug(CDE.rgb('aabbcc'));
 debug(CDE.rgb('#11aabbcc'));
 debug(CDE.rgb('11aabbcc'));
 debug(CDE.rgb('rgb(100,200,256)'));
 debug(CDE.rgb('rgb(100,200,13)'));

 * @param string color (Unless g and b are also given, then this is the r value)
 * @param int g=false
 * @param int b=false
 * @param int noHash=false For rgb value, dont prefix the hash
 * @return [r,g,b]
 */
CDE.rgb = function(color, g, b, noHash){
	// if three parms are given, asume its an rgb color and return the normalized hex string of it (with hash)
	if (arguments.length >= 3) {
		return CDE.nColor("rgb("+color+","+g+","+b+")", noHash);
	}
	
	// normalize color to rrggbb
	color = CDE.nColor(color, true);
	return {
		r: parseInt(color.substring(0,2), 16), 
		g: parseInt(color.substring(2,4), 16), 
		b: parseInt(color.substring(4,6), 16)
	};
};

/**
 * Enable the document.activeElement variable for non-IE.
 * This tracks the focus and blur capture events.
 * If the window looses focus, the variable will be 'null'.
 * If the document.activeElement is not undefined when this
 * function is called, the function will do nothing.
 */
CDE.enableActiveElement = function(){
	// set focus to the body element, forcing IE to set the activeElement var
	document.body.focus();
	// check whether it is set
	if (typeof document.enableActiveElement !== 'undefined' || !document.addEventListener) return; // IE or not supporting the capture phase
	// nope, set up the two functions
	var trackOn = function(evt){
		if (evt && evt.target) {
			document.activeElement = evt.target == document ? null : evt.target;
		}
	};
	var trackOff = function(evt){
		document.activeElement = null;
	};
	// attach to root
	document.addEventListener("focus", trackOn, true);
	document.addEventListener("blur", trackOff, true);
};

/**
 * Convert css attribute name to javascript version
 * @param string str
 * @return string
 */
CDE.cssToJs = function(str){
	return str.replace(/(-.)/g, function(c){return c.substring(1,2).toUpperCase();});
};
/**
 * Convert js attribute name to css version
 * @param string str
 * @return string
 */
CDE.jsToCss = function(str){
	return str.replace(/([A-Z])/g, function(c){return '-'+c.toLowerCase();});
};

/**
 * Replace &<> by their html-entity equals
 * @param string s
 * @return string
 */
CDE.escapeHtml = function(s){
	if (typeof s == 'undefined') s = '';
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};
/**
 * Replaces all % by %25 en all & by %26
 * @param string s
 * @return string
 */
CDE.escapeUrl = function(s){
	if (typeof s !== 'string') return s;
	return s.replace(/%/g,'%25').replace(/&/g, '%26');
};


// http://stackoverflow.com/questions/235411/is-there-an-internet-explorer-approved-substitute-for-selectionstart-and-select#235582
CDE.prototype.getCaretPos = function(){
	var e = this.dom();
	if (this._boolFailProof && !e) return;
	// fx
	if ("selectionStart" in e) return e.selectionStart;
	
	// ie...
	var bookmark = document.selection.createRange().getBookmark();
	var selection = e.createTextRange();
	selection.moveToBookmark(bookmark);

	var before = e.createTextRange();
	before.collapse(true);
	before.setEndPoint("EndToStart", selection);

	return before.text.length;
};
// http://www.experts-exchange.com/Programming/Languages/Scripting/JavaScript/Q_24853195.html
CDE.prototype.setCaretPos = function(pos){
	var e = this.dom();
	if (this._boolFailProof && !e) return this;
	if (e.createTextRange) { // ie
		var range = e.createTextRange();
		range.move('character', pos);
		range.select(); // selects no chars at given pos in range
	} else if (e.selectionStart) { // fx
		e.focus();
		e.setSelectionRange(pos, pos);
  }
  // else there's little we can do...
  return this;
};
CDE.prototype.putCaretPos = function(str){
	var old, e=this.dom(), before='',after='',pos;
	if (this._boolFailProof && !e) return this;
	// to get the current caret pos we need focus
	this.focus();
	// get current caret pos of this element (should have focus...)
	pos = pos = cdeInp.getCaretPos();
	// compose the new string
	old = this.val();
	if (pos>0) before = old.substring(0,pos);
	if (pos < old.length) after = old.substring(pos);
	// replace it
	this.val(before+str+after);
	// put the caret after the tab, because replacing the text will put the caret at the back...
	cdeInp.setCaretPos(pos+1);
	
	return this;
};

/**
 * Try to parse the timestamp. 
 * Will try to parse the given timestamp to get a date.
 * Default order is strict to loose. You can change this order through
 * the arguments. Order and int values for arguments are as follows:
 * -1: Skip (if you only want to test a few)
 * 1: parseTimeYdmHis
 * 2: parseTimeRfc3999
 * 3: parseTimeLoose
 * 4: new Date()
 *
 * The function will return as soon as it was able to parse a date beyond 1970.
 * If no date was determined, unix time 1 will be returned.
 *
 * @param string strStamp The timestamp to parse
 * @param bool boolToSeconds=false Return the timestamp in unix seconds
 * @param int intHint1=1 false|1|2|3|4 Try this first
 * @param int intHint1=2 false|1|2|3|4 Try this second
 * @param int intHint1=3 false|1|2|3|4 Try this third
 * @param int intHint1=4 false|1|2|3|4 Try this last
 * @return Date
 */
CDE.parseTimestamp = function(strStamp, boolToSeconds, intHint1, intHint2, intHint3, intHint4){
	//debug("CDE.parseTimestamp("+strStamp+","+boolToSeconds+","+intHint1+","+intHint2+","+intHint3+","+intHint4+")");
	// track used types
	var free = {1:1,2:2,3:3,4:4}, parse, date;
	// set all types false which are used (if other values, the step is ignored)
	free[intHint1||1] = false;
	free[intHint2||2] = false;
	free[intHint3||3] = false;
	free[intHint4||4] = false;
	
	//debug("Free: "+free[1]+", "+free[2]+" "+free[3]+" "+free[4]);
	
	// define a function to repeat some step
	parse = function(hint){
		//debug("parse hint: "+hint);
		var date;
		// skip if -1, (~-1) = 0
		if (!~hint) return false;
		// set hint to the first available type, disabling the chosen hint afterwards
		if (!hint) hint = free[1]||free[2]||free[3]||free[4];
		// mark used
		free[hint] = false;
		// now execute parse
		try {
			switch (hint) {
				case 1: return CDE.parseTimeYdmHis(strStamp);
				case 2: return CDE.parseTimeRfc3999(strStamp);
				case 3: return CDE.parseTimeLoose(strStamp,false,true); // dont try rfc3999 again...
				case 4: return new Date(strStamp);
			}
		} catch(er){
			//debug("Time "+hint+" crashed: "+er.message);
			// something screwed up, i dont care what...
			return false;
		}
		// not a (valid) hint
		return false
	};
	// now parse all options...
	date = parse(intHint1);
	if (!date || date.getTime() <= 1) date = parse(intHint2);
	if (!date || date.getTime() <= 1) date = parse(intHint3);
	if (!date || date.getTime() <= 1) date = parse(intHint4);
	// if unixtime, return the seconds
	if (boolToSeconds) {
		if (date) return date.getTime()/1000;
		return 1;
	}
	// just return whatever we've got left
	return date;
};
/**
 * Parse a "Y-m-d H:i:s" timestamp
 * @param string stamp
 * @param bool boolToSeconds=false Return the timestamp in unix seconds
 * @return Date
 */
CDE.parseTimeYdmHis = function(stamp, boolToSeconds) { // 2009-09-02 07:35:00[p] (allows for single digit numbers except for the year, needs four, can have p appended to it for pm)
	var match, regex;
	
	//debug("stamp:"+stamp);
	
	regex = /^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2}) ([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})[ ]?([p])?.*$/;
	match = regex.exec(stamp);

	if (!match || match.length < 6) throw {message:"CDE.parseTimeYdmHis(): Invalid timestamp ["+stamp+"]"};

	if (match[7] == 'p' && parseInt(match[4],10) < 12) match[7] = 12; // for pm, we add 12 hours
	else match[7] = 0;
	// Matches magic numbers are equal to () parts in the regex (y m d h m s tz)
	// Months offset at 0, not 1 :@
	// Also, dont forget the radix for parseInt, or it will parse zero 
	// prefixed values as octal (which returns 0 for 08 and 09)
	date = new Date(parseInt(match[1], 10), parseInt(match[2], 10) -1, parseInt(match[3], 10), (parseInt(match[4], 10) + parseInt(match[7], 10)), parseInt(match[5], 10), parseInt(match[6], 10));

	if (boolToSeconds) return date.getTime()/1000;
	return date;
}
/**
 * Parse an XML timestamp
 * 
 * @param string stamp 2009-09-02T07:35:00+00:00
 * @param bool boolToSeconds=false Return the timestamp in unix seconds
 * @return Date
 */
CDE.parseTimeRfc3999 = function(stamp, boolToSeconds) { // 2009-09-02T07:35:00+00:00
	var date, tz, regex, match;
	
	// extract ydmhis and timezone
	regex = /(\d{4}-\d{2}-\d{2}[ T]{1}\d{2}:\d{2}:\d{2})(.*)/;
	match = regex.exec(stamp);
	
	// dont accept crap
	if (!match) throw {message:"CDE.parseTimeRfc3999 was unable to parse stamp ["+stamp+"]"};

	// parse ydmhis (remove the T!)
	date = CDE.parseTimeYdmHis(match[1].replace(/T/,' '));

	// adjust for timezone (timezone can be +xx:xx, -xx:xx and Z)
	if (tz = parseInt(match[2])) date.setTime(date.getTime()+(tz*60*60*1000));
	
	if (boolToSeconds) return date.getTime()/1000;
	return date;
}
/**
 * Parse a KML timestamp. Will call CDE.parseTimeRfc3999 first.
 * Kml timestamps are tricky, they can be other than just a xml (rfc3999) timestamp
 * - gYear (YYYY) 
 * - gYearMonth (YYYY-MM) 
 * - date (YYYY-MM-DD) 
 * - dateTime (YYYY-MM-DDThh:mm:ssZ) (rfc3999 in UTC)
 * - dateTime (YYYY-MM-DDThh:mm:sszzzzzz) (rfc3999)
 * @param string stamp
 * @param bool boolToSeconds=false Return the timestamp in unix seconds
 * @param bool boolSkip3999=false Dont try to parse 3999 timestamp (most likely already tried that)
 * @return Date
 */
CDE.parseTimeLoose = function(stamp, boolToSeconds, boolSkip3999) {
	var time, regex, match, date;
	if (!stamp || stamp == '') return 0;
	try {
		date = parseTimeRfc3999(stamp);
	} catch(er) {
		// catch one of the three alternatives with an optional regex, allows single digits for month/day but that should be ok
		regex = /^([0-9]{4})[-]?([0-9]{0,2})[-]?([0-9]{0,2})$/;
		match = regex.exec(stamp);
		// i cant parse this
		if (!match) throw {message:"CDE.parseTimeLoose: bad timestamp ["+stamp+"]"};
		// return the date
		date = new Date(parseInt(match[1], 10), parseInt(match[2], 10) -1, parseInt(match[3], 10)); // months-1 because months offset at 0
	}
	
	if (boolToSeconds) return date.getTime()/1000;
	return date;
}
/**
 * Convert a Date object to a YdmHis timestamp
 * @param Date|int date
 * @param bool boolNoDate=false
 * @param bool boolNoTime=false
 * @param bool boolIsUnix=false Date is a unix timestamp (in seconds!)
 * @return string
 */
CDE.toYdmHis = function(dt, boolNoDate, boolNoTime, boolIsUnix){
	var date='', time='', tmp;
	// normalize
	if (boolIsUnix) dt = new Date(dt*1000);
	// create date, with padded 0's
	if (!boolNoDate) date = dt.getFullYear()+'-'+(dt.getMonth()<9?'0':'')+(dt.getMonth()+1)+'-'+(dt.getDate()<10?'0':'')+dt.getDate();
	// create time, with padded 0's
	if (!boolNoTime) time = (dt.getHours()<10?'0':'')+dt.getHours()+':'+(dt.getMinutes()<10?'0':'')+dt.getMinutes()+':'+(dt.getSeconds()<10?'0':'')+dt.getSeconds();
	// return the combination, with a space in between. if either part was not requested, the space will be removed by trim.
	return CDE.trim(date+' '+time);
};
/**
 * Return the current unix timestamp in seconds.
 * Altered by parameters.
 * @param int sec=0 Added to now (give negative to subtract)
 * @param int min=0 Multiplied by 60 and added to now (give negative to subtract)
 * @param int hour=0 Multiplied by 60*60 and added to now (give negative to subtract)
 * @param int day=0 Multiplied by 24*60*60 and added to now (give negative to subtract)
 * @param int week=0 Multiplied by 7*24*60*60 and added to now (give negative to subtract)
 * @param int month=0 Multiplied by 30*24*60*60 and added to now (give negative to subtract)
 * @param int year=0 Multiplied by 365*24*60*60 and added to now (give negative to subtract)
 * @return int
 */
CDE.now = function(sec, min, hour, day, week, month, year){
	var t = (new Date()).getTime()/1000;
	if (arguments.length == 0) return t; // shortcut :)
	t += parseInt(sec)||0;
	t += (parseInt(min)||0)*60;
	t += (parseInt(hour)||0)*3600; // 60*60
	t += (parseInt(day)||0)*86400; // 24*60*60
	t += (parseInt(week)||0)*604800; // 7*24*60*60
	t += (parseInt(month)||0)*2592000; // 30*24*60*60
	t += (parseInt(year)||0)*31536000; // 365*24*60*60
	return t;
};

/**
 * Cache an object from the internets using Image
 */
CDE.preload = function(url){
	setTimeout(function(){ (new Image()).src = url; },1);
};

/**
 * Trim whitespace of a string
 * @param string
 * @return string
 */
CDE.trim = function(str){
	return str.replace(/^\s+|\s+$/g,'');
};

// ###################################
// #   Internal helper functions     #
// ###################################

// a hackytacky method of creating a crossbrowser custom file input :)
// worked on ie7,8, fx2,3, o9.5, s4b, and c1
// will stop to function (properly) when a new browser does it yet another way or with yet another measurement.
/*
CDE.customFile = function(strName, boolAsArray, strId, onValueChangeCallback){ // returns {input:objElement,output:objElement}
	var cdeButton, cdeInput, cdeOutput, strLastValue;
	
	// check whether file input value changed, act uppon such event
	var checkValueChange = function() {
		if (cdeInput) {
			if (strLastValue != cdeInput.dom().value) {
				strLastValue = cdeInput.dom().value;
				if (onValueChangeCallback) onValueChangeCallback(strLastValue);
				if (cdeOutput) cdeOutput.dom().value = strLastValue;
			}
		}
	};
	var buttonDown = function(){
		cdeButton.dom().style.backgroundPosition = '0 19px';
		checkValueChange();
	};
	var buttonUp = function(){
		cdeButton.dom().style.backgroundPosition = '0 0';
		checkValueChange();
	};
	
	// create the button and file input
	var createButton = function(){
		return (
			CDE.div({backgroundImage: 'url(img/choosefile2.png)', marginBottom: "2px", marginTop: '5px', cursor: 'pointer', overflow: 'hidden', width: '67px', height: '19px'}).add(
				cdeInput = CDE.inp(
					'file',
					{margin: 0, marginLeft: "-150px", width: '218px', border: 0, padding: 0, opacity: 0, filter: 'alpha(opacity: 0)', cursor: 'pointer', zIndex: 20}, 
					{name: strName, id: strId, onmousedown: buttonDown, onmouseout: buttonUp, onmouseup: buttonUp}
				)
			)
		);
	};
	
	// get/create elements (for closures, not useless!)
	cdeButton = createButton(); // custom button
	cdeOutput = CDE.inp('text',{marginBottom: "5px", width: '140px'},{disabled: true}); // shows you the filename
	
	// return as array (for cde.add())
	if (boolAsArray) return [ cdeButton, cdeOutput ];
	
	// return as objlit
	return {
		input: cdeButton,
		output: cdeOutput
	};
};
*/

// debug control.
// <div id='_dbg_'></div>
window.debugId = '_dbg_';
window.debug = function(str2, boolNoReturn2, boolHtmlEncode2){
	var objDebug = document.getElementById(window.debugId), cde, cdeTmp;
	window.debugId = undefined;
	// if not exists, replace debug function by empty function to speedup future calls
	if (!objDebug) {
		window.debug = function(str){return str;};
	} else {
		// create debug window
		CDE.wrap(objDebug).abs(-5,5,300).css('minHeight','200px').bgc('white').c('black').css('border', '2px solid black').z(5000).add(
			cdeTmp = CDE.div().bb(1,'black','solid').add(
				CDE.span().fr().id('__CDE_cache__').fs(10).c('black').gc(),
				CDE.txt('Debug | ').c('black').gc(),
				CDE.span().txt('Clear').cp().c('black').on('click', function(){ cde.txt(''); }),
				CDE.txt(' | ').c('black').gc(),
				CDE.span().txt('Close').cp().c('black').on('click', function(){ CDE.wrap(cde.dom().parentNode).del(); }),
				CDE.txt(' | ').c('black').gc(),
				CDE.span().txt('Hide').cp().c('black').on('click', function(){ CDE.wrap(cde.dom().parentNode).dn(); }),
				CDE.txt(' | ').c('black').gc(),
				CDE.span().txt('Cache').cp().c('black').on('click', function(){ CDE.debug('cache', true); })
			).gc(),
			cde = CDE.div().p(2).c('black').fs(10)
		).gc();
		
		// no need to cache most of these
		CDE.gc();

		// clear refernece to dom
		objDebug = null;

		// create new debug function with cached output object
		window.debug = function(str, boolNoReturn, boolHtmlEncode){
			// in case the user clicked close
			if (!cde) {
				window.debug = function(str){return str;};
				return str;
			}
			// html encode the string if parameter (escapes &<>)
			if (boolHtmlEncode) str = (typeof(str)!=='string'?str:CDE._htmlEscape(str));
			// just add the string (dont use innerHTML, this is much faster
			CDE.txt(str+(boolNoReturn?"":"<br />")).addTo(cde).uncache();
			// show debug in case it was hidden
			cde.dom().parentNode.style.display = 'block';
			return str;
		};
	}
	// call the new debug, whichever version it may be
	return window.debug(str2, boolNoReturn2, boolHtmlEncode2);
};

/**
 * Output internal information... This is put on a timer to prevent straining the DOM too much
 * @param string strType Any of: cacheSize
 */
CDE.debug = function(strType, arg1){
	var i, s, f;
	if (strType == 'cacheSize') {
		f = function(){
			CDE._intCacheDebugTimer = false;
			var e = document.getElementById('__CDE_cache__');
			if (e) e.innerHTML = CDE._cacheSize;
		};
		// if no timer set, set it now
		if (!CDE._intCacheDebugTimer) CDE._intCacheDebugTimer = setTimeout(f, 20);
		// if arg, force it to be now
		if (arg1) f();
	} else if (strType == 'cache') {
		i = 0;
		s = '';
		while (++i < CDE._doms.length) {
			// arg1 = bool: dont show if falsy
			if (CDE._doms[i] || !arg1) {
		 		s += "<div style='color:black;' title='"+CDE._htmlEscape((CDE._doms[i].innerHTML+'').substring(0,300))+"'>"+i+" = ["+CDE._doms[i]+"]"+(CDE._doms[i]?" ("+CDE._doms[i].id+")":"")+"</div>";
		 	}
		}
		debug(s,true);
	}
};

/**
 * Completely unload all DOM elements... :)
 */
CDE._unload = function(){
	CDE._doms = null;
};
/**
 * attach this event to the window unload event
 * it will remove all references to dom elements and detach all event handlers
 */
CDE.wrap(window).on('unload', CDE._unload);

// minor change to CDE.a
// added CDE.escapeHtml which will escape <>& to &lt; &gt; &amp; respectifully
// added CDE.escapeUrl which will escape % and & by %25 and %26 respectfully and in that order.
// added ov (overflow:visible)
// added timestamp parsing methods: parseTimeYdmHis, parseTimeRfc3999, CDE.parseTimeLoose, CDE.parseTime
// added timestamp converting method: toYdmHis to return a Date in Y-m-d H:i:s
// added CDE.now to return the current unix timestamp in seconds (new Date()).getTime()/1000
// added CDE.trim to trim whitespace
// fixed ins which was not quite inserting the correct elements >:(
// changed bt,br,bb,bl (borders) to map to _setBorder and if one of their parameters is boolean false, the parameter is defaulted (1px solid black). You can still pass on null or undefined to skip.
