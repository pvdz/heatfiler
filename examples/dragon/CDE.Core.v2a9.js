// #### Core ####
/**
###################################################
#            CDE class
#              v2a9
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

/**
 * Overloaded constructor/function to create new CDE elements.
 * When used as a function, it does what the old CDE.wrap did.
 * It will try to convert the parameter to a dom element and 
 * wrap that element. If string, it applies document.getElementById,
 * CDE elements are returned as they are and otherwise a new 
 * CDE element is created and returned.
 * If called as constructor (new CDE(...)), the element is 
 * assumed to be a dom element and returned.
 * 
 * @param {Object} mix For new CDE, dom is assumed. Otherwise dom,cde or string (id)
 * @param {Object} boolPlaceholder=false Only for function, returns a blank CDE element even if the argument doesn't resolve
 * @return CDE
 */
var CDE = function(mix, boolPlaceholder){
	var bool;
	
	if (this instanceof CDE) { // new CDE
		
		// save element (we actually save the element 
		// so the CDE element can be safely included 
		// in closures, without leaking the dom elements)
		if (mix) {
			this._id = CDE._getId(mix);
			// put the id in the dom element to make the next wrap(s) faster.
			if (mix.nodeType == 3) {
				// textnodes cannot get properties in IE...
				try { mix._id = this._id;
				} catch (e) {} // caching is optional anyways
			} else {
				// no try catch is faster...
				mix._id = this._id;
			}
		}
	
	} else { // CDE.wrap
		
		// will we return something?
		bool = true;
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
		
	}
};

/**
 * String representation of this object, used by Javascript
 * @return string
 */
CDE.prototype.toString = function(){
	return "[CDE "+this._id+" ("+this._strId+")]";
};

/**
 * Extend this CDE or a target object with the properties given in the first object.
 * If no second object is given, obj becomes target and target becomes CDE... 
 * This uses a "blind" for in so do not pass on host objects...
 * (eg. no testing for hasownproperty is done!)
 * 
 * @param Object target
 * @param Object obj=false If false, obj becomes target and target becomes CDE
 * @return obj
 */
CDE.extend = function(target, obj){
	var key;
	if (!obj) {
		obj = target;
		target = CDE;
	}
	for (key in obj) target[key] = obj[key];
	
	return obj;
};

/**
 * Add all properties of the object to the prototype of the target...
 * If no second object is given, obj becomes target and target becomes CDE... 
 * This uses a "blind" for in so do not pass on host objects...
 * (eg. no testing for hasownproperty is done!)
 * 
 * @param Object target
 * @param Object obj=false If false, obj becomes target and target becomes CDE
 * @return obj
 */
CDE.proto = function(target, obj){
	var key;
	if (!obj) {
		obj = target;
		target = CDE;
	}
	for (key in obj) target.prototype[key] = obj[key];

	return obj;
};

// ################################
// #          Inner Core          #
// ################################

CDE.extend({<!--
	
	/**
	 * This used to be the core wrapper of CDE :)
	 * @depricated in favor of CDE()
	 * @return CDE
	 */
	wrap: function(mix, boolPlaceholder){
		if (window.debug) debug("CDE.wrap: method is depricated in favor of CDE()");
		return new CDE(mix, boolPlaceholder);
	},

	/**
	 * Extract a dom element from the parameter.
	 * @param mix mix If string, id is assumed
	 * @return dom
	 */
	toDom: function(mix){
		if (!mix) return null;
		if (typeof(mix) == 'string') return document.getElementById(mix);
		if (mix.isCde) return mix.dom();
		return mix;
	},

	/**
	 * Use ID's to prevent closure leaks of dom elements.
	 * Basically, by storing the dom's inside this array,
	 * IE won't leak dom elements when closing down...
	 * @param dom dom
	 * @return int
	 */
	_getId: function(dom){
		var id;
		
		if (!dom) {
			if (window.debug) debug("CDE._getId: element is falsy");
			return 0;
		}
		if (!CDE._doms) {
			CDE._doms = [0]; // cache always contains one item (dont ask)
			CDE._cacheSize = 0; // counter
		}
		id = dom._id;
		// if no id or current id is not found, add it to the cache and return a fresh id
		if (!id || !CDE._doms[id]) {
			CDE._doms[id = CDE._doms.length] = dom;
			++CDE._cacheSize;
			CDE.debug('cacheSize');
		}
		return id;
	},

	/**
	 * Remove given node from the cache. Optionally remove all of it's childeren.
	 * Used when removing some panel which you know will be permanently removed.
	 * Warning: This renders any CDE tied to them useless! Fresh instances should be safe.
	 *
	 * @param dom dom
	 * @param bool boolAndChilderen=false Walk through all the childNodes (and their childNodes) and remove them from cache as well.
	 * @param bool boolSkipDom=false Do not delete the parent (it's already been deleted more efficient. this saves a search through the cache)
	 * @return null
	 */
	uncache: function(dom, boolAndChilderen, boolSkipDom){
		var i;
		if (!dom) return;
		// first remove this element from the cache
		if (!boolSkipDom) CDE._uncache(dom, true); // passed on dom
		
		if (boolAndChilderen) {
			// now remove it's childeren, recursively
			i = dom.childNodes.length;
			while (i--) CDE.uncache(dom.childNodes[i], true); // recursive
		}
		
		return null;
	},
	
	/**
	 * Uncache one element, if found
	 * @param dom dom
	 */
	_uncache: function(id, boolIdIsDom){
		if (boolIdIsDom && id) id = id._id;
		if (id && CDE._doms && CDE._doms[id]) {
			delete CDE._doms[id];
			--CDE._cacheSize;
			CDE.debug('cacheSize');
		}
	},
	
	/**
	 * Add an element to the gc.
	 * @param cde cde
	 * @param target=default Specific bin to put object into.
	 * @return cde
	 */
	_gcAdd: function(cde,target){
		if (!target) target = 'standard';
		if (!CDE._arrGc) CDE._arrGc = {};
		if (!CDE._arrGc[target]) CDE._arrGc[target] = [cde];
		else CDE._arrGc[target].push(cde);
		return cde;
	},
	
	/**
	 * Cleanup garbage. Uncache all elements in the gc.
	 * @param string target=false Only delete elements in this group
	 */
	gc: function(target){
		var cde,a;
		if (CDE._arrGc) {
			if (target) {
				a = CDE._arrGc[target];
			} else {
				a = CDE._arrGc.standard;
			}
			try {
	
				// now uncache all
				if (a) {
					while (cde = a.pop()) {
						cde.uncache();
					}
				}
			
			} catch(er) { if (window.debug) debug("CDE.gc("+target+") error:"+target+":"+er.message); }
		}
	}

});

// ################################
// #      Object attributes       #
// ################################

CDE.proto({ <!--
	/**
	 * Helps to identify CDE objects
	 */
	isCde: true,
	
	/**
	 * @see CDE.prototype.ifDom
	 * @var bool _boolFailProof=false Prevent errors if element does not exist. 
	 */
	_boolFailProof: false
});

// ################################
// #      Object methods          #
// ################################

CDE.proto({	<!--

	/**
	 * The actual element
	 * @return dom
	 */
	dom: function(){ // return dom
		var e = CDE._doms[this._id];
		if (!e) if (window.debug) debug("Error: CDE.prototype.dom("+this._id+") "+(this._strId?"["+this._strId+"] ":"")+"is empty. Most likely it was deleted (from another object?)...");
		return e;
	},
	
	/**
	 * Add multiple childeren to an element. If an array is passed 
	 * on, every element of the array is added. Every element is
	 * wrapped, then added. empty arguments are ignored.
	 * @param mix any number of arguments is accepted. Additionally, array parameters will be walked through and every element gets added (recursively)
	 * @return CDE this
	 */
	add: function(){
		var i, e = this.dom();
		if (arguments.length == 0 || (this._boolFailProof && !e)) return this;
		// check all arguments
		for (i=0; i<arguments.length; ++i) {
			// ignore falsy args and empty arrays/textnodes
			if (!arguments[i] || arguments[i].length === 0) continue;
			// strings mean DOM id's, fetch them, add them
			if (typeof arguments[i] === 'string') e.appendChild(CDE.toDom(arguments[i]));
			// if specified argument is an array, process each element in the array (textnodes also have a length property, so be sure to skip them)
			else if (typeof arguments[i].length == 'number' && !arguments[i].nodeType) this.add.apply(this, Array.prototype.slice.call(arguments[i]));
			// if single CDE element, append it's element
			else if (arguments[i].isCde) e.appendChild(arguments[i].dom());
			// otherwise asume DOM element, append it
			else e.appendChild(arguments[i]);
		}
		return this;
	},
	
	/**
	 * Map for mix.add(this)
	 * @param CDE mixParent Add this to the argument CDE object
	 * @param DOM mixParent Add this to the argument DOM element
	 * @param string mixParent Fetch DOM element and add this to it
	 * @return CDE this
	 */
	addTo: function(mix){ // cde.add(this)
		if (this._boolFailProof && !this.dom()) return this;
		CDE.toDom(mix).appendChild(this.dom());
		return this;
	},
	
	/**
	 * Insert this element before mixTarget.
	 * Takes this element and makes it the child of the parent of mix, before mix, using 
	 * mix as argument to insertBefore.
	 * @todo: make the optional behavior default instead and add cde.before for the currently default behavior (and also add an after...)
	 * @param mix mixTarget Argument to CDE(), must be part of dom, <this> will be added before mix.
	 * @param bool boolStart=false Insert as first child of this element
	 * @return CDE (this)
	 */
	ins: function(mixTarget, boolAsFirstChildOfThis){ // insertBefore target before this
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
	},
	
	/**
	* Replace this by cde. Deletes and uncaches <this>. Returns argument! Not this!
	* @param CDE cde
	* @return CDE <argument!>
	*/
	replace: function(cde){
		cde.ins(this);
		this.del();
		return cde;
	},
	
	/**
	 * Remove this element from parent element
	 * After invocation, the returned element will not be part of the dom
	 * @param bool boolAlsoCache=false Also remove dom element from CDE cache.
	 * @param bool boolAndAllChildNodes=false In conjunction with boolAlsoCache, also removes all childnodes from the cache.
	 * @return CDE <this>
	 */
	del: function(boolAlsoFromCache, boolAndAllChildNodes){ // remove from DOM
		var e = this.dom();
		if (this._boolFailProof && !e) return this;
		if (e.parentNode) e.parentNode.removeChild(e);
		// remove from cache. Be carefull!
		if (boolAlsoFromCache) this.uncache(boolAndAllChildNodes);
		return this;
	},
	
	/**
	 * Remove this element from the internal CDE cache. Only do this when certain you wont use it anymore!
	 * Dont use this on elements to which .on is applied! Or the event fails.
	 * For fresh cde instances, running animations are not stopped! This could cause a problem at some point.
	 * @param bool boolChilderenToo=false Recursively remove also all the childNodes this element has.
	 * @param bool boolAndAllChildNodes=false In conjunction with boolAlsoCache, also removes all childnodes from the cache.
	 * @return null;
	 */
	uncache: function(boolChilderenToo){
		var arr,i;
		if (this._boolFailProof && !this.dom()) return this;
		
		//debug("uncaching: "+this+"["+this.dom()+"]"); // turn off internal uncaching of debugged items when turning this on
		// stop all running ease timers
		if ((arr = this.dom().arrEaseObjects) && (i = arr.length) > 0) {
			while (i--) {
				if (arr[i]) clearInterval(arr[i].timer);
			}
		}
		// remove the element
		CDE.uncache(this.dom(), boolChilderenToo);
		
		return null;
	},
	
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
	gc: function(target){
		return CDE._gcAdd(this, target);
	},
	
	/**
	 * Set attributes of this CDE. Every attribute of given object is set on <this>.dom().
	 * If the parameter is a string, it is asumed to be the css class
	 * @param mixed mix When the second parameter is set, this is the attribute for that value. Otherwise, if this is a string, it's asumed to be the className, otherwise every attribute from this object is copied to the element.
	 * @param mixed mixValue=false When set, this.dom()[mix] = mixValue is executed.
	 * @return CDE <this>
	 */
	atr: function(mix, mixValue){
		var key, e = this.dom(); // cache

		if (!mix || (this._boolFailProof && !e)) return this;
		
		// if two arguments, assume name:value pair
		if (arguments.length == 2) this._atr(e, mix, mixValue);
		// strings are assumed to be the class for this object
		else if (typeof mix === 'string') this._atr(e, 'className', mix);
		// assume object literal, process each element
		else for (key in mix) this._atr(e, key, mix[key]);
		
		return this;
	},

	/**
	 * Inner function to set one property on object.
	 * If the name is 'id', the value will be saved to this._strId for debugging statements
	 * @param object obj Target object
	 * @param string name
	 * @param mixed value
	 */
	_atr: function(obj, name, value){
		// copy the id to CDE for debugging purposes
		if (name == 'id') this._strId = value;
		// try to set the property
		try { obj[name] = value;
		} catch(er){
			if (window.debug) debug('CDE._atr fail: obj:['+obj+'], key:['+name+'], val:['+value+'], err:['+er.description+']');
		}
	},

	/**
	 * Set attributes of the style object of this CDE. Every attribute of given object is set on <this>.dom().style
	 * If the parameter is a string, it is asumed to be the CSS class name
	 * @param mixed mix If object, all name:value pairs are copied to this.dom().style. When string and second parameter undefined, mix is asumed to be the classname. Otherwise arguments are asumed to be name:value pair and set accordingly.
	 * @param mixed mixValue=false When true, first parameter should be a string and its the same as calling this.css({mix, mixValue})
	 * @return CDE <this>
	 */
	css: function(mix, mixValue){
		var s, key;
		
		if (!mix || (this._boolFailProof && !this.dom())) return this;
		
		if (this._boolTextNode) {
			if (window.debug) debug("Error: Unable to apply .css to a text node... "+this+".css("+mix+","+mixValue+")");
			return this;
		}
		
		// cache the style object
		s = this.dom().style;
		
		// first check whether two args were given. if so, assume them to be a name:value pair
		if (arguments.length == 2) this._css(mix, arguments[1], s);
		// now check for string. if mix is a string, the classname was passed on instead (because the second parameter is empty)
		else if (typeof mix === 'string') this.atr('className', mix);
		// otherwise it should be an array with name:value pairs for the style object
		else for (key in mix) this._css(key, mix[key], s);
	
		return this;
	},
	
	/**
	 * Inner function to set one style on this
	 * @param string name
	 * @param mix value
	 * @param object s style object to set on
	 */
	_css: function(name, value, s){ // s=style
		// common error fixes (name = requested value, key will actually be set)
		var key = name;
		// float is reserved, should be cssFloat
		if (name == 'float') key = 'cssFloat';
		// opacity is a subject on its own
		if (name == 'opacity') {
			if (typeof value !== 'number') {
				if (window.debug) window.debug("cde._css("+name+","+value+","+s+"): Error: invalid opacity value: "+value+" (not a number)");
				return;
			}
			if (value < 0 || value > 1) {
				if (window.debug) window.debug("cde._css("+name+","+value+","+s+"): Error: Invalid value for opacity: use 0..1 ("+value+")");
				if (value < 0) value = 0;
				if (value > 1) value = 1;
			}
		}
		try {
			if (key == 'opacity') {
				// set opacity in IE (actually setting "opacity" causes an error...)
				if (typeof(s.filter) != 'undefined') s.filter = "alpha(opacity="+Math.round(value*100)+")"; // works in IE6+, but also succeeds in opera...
				// set for all other browsers (causes problem in IE, but since Opera "supports" filters, we have to set it anyways)
				try { s[key] = value; } catch(er2){ if (window.debug) window.debug("cde._css("+name+","+value+","+s+"): "+er2.message); }
			} 
			// except in IE, cssFloat is styleFloat (just set both, otherwise we have to do browser detection)
			else if (key == 'cssFloat' && document.all) s.styleFloat = value;
			// other values can be set, i think
			else s[key] = value;
		} catch (er) {
			if (key == 'overflow' && value == '-moz-scrollbars-vertical') { // ie borks this
			} else if (window.debug) debug('<span style="color:red;">CDE._css fail</span>: Tried setting ['+key+'] to ['+value+'] on ['+s+']. '+er);
		}
	},
	
	/**
	 * This function, inspired by thomas fuchs, accepts some css arguments and slowly updates
	 * the properties of this to become what's given. The change will be gradual, in a certain
	 * timeframe with certain time steps. It allows for simple transitions and effects.
	 * This will be a work in progress for a little while...
	 * This function uses timeout to accomplish what it does.
	 * Several special exceptions have been made, like fading (because that relies on other 
	 * properties like display and visibility) and margin,padding and borderWidth/Height/Style 
	 * (but not border itself).
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
	CDE.div() .bgc('red') .abs(10,300,200,300) .html("moo") .dba() .ease({padding:30},{callback: function(){debug("done!");}})
	 
	 * @return this
	 */
	ease: function(targets, options){
		var that, atr, stepTime, easeTime, startTime, currentDisplay, currentVis, obj, arr, oldTargets, i, cb, bool, _;
	
		//debug("CDE.ease: ["+targets+"]["+options+"]");
		if (this._boolFailProof && !this.dom()) return this;
		// ignore empty args
		if (!targets) return this;
		// ensure this obj exists
		if (!options) options = {};
		// reference to this object
		that = this;
	
		// preprocessing
		// @todo: allow percentages? parse border shortcut?
		for (atr in targets) {
			if (atr == 'margin' || atr == 'padding') {
				targets[atr+'Top'] = targets[atr];
				targets[atr+'Right'] = targets[atr];
				targets[atr+'Bottom'] = targets[atr];
				targets[atr+'Left'] = targets[atr];
				delete targets[atr];
			} else if (atr == 'borderWidth') {
				targets.borderWidthTop = targets[atr];
				targets.borderWidthRight = targets[atr];
				targets.borderWidthBottom = targets[atr];
				targets.borderWidthLeft = targets[atr];
				delete targets[atr];
			} else if (atr == 'borderColor') {
				targets.borderColorTop = targets[atr];
				targets.borderColorRight = targets[atr];
				targets.borderColorBottom = targets[atr];
				targets.borderColorLeft = targets[atr];
				delete targets[atr];
			} else if (atr == 'borderStyle') {
				targets.borderStyleTop = targets[atr];
				targets.borderStyleRight = targets[atr];
				targets.borderStyleBottom = targets[atr];
				targets.borderStyleLeft = targets[atr];
				delete targets[atr];
			}
		}
	
		// Now if a certain effect is busy, we want to make sure it stops, while not 
		// affecting the other effects. Like when we're fading and changing color, and
		// we want to fade again, the second fade should only stop the first fade but
		// let the color change continue. Cue complex situation.
		if (!options.boolIgnoreRunningEase && (arr = this.dom().arrEaseObjects) && (i = arr.length)) {
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
				for (_ in oldTargets) { 
					bool = true; 
					break; 
				}
				if (bool) continue;
				// at this point, there are no more properties
				// stop timer
				clearInterval(arr[i].timer);
				// remember callback
				cb = arr[i].options.callback;
				// cleanup trash, do not splice because a reference is kept through indices
				oldTargets = arr[i] = arr[i].options = arr[i].targets = arr[i].timer = null;
				// call the callback, unless canceled
				if (!options.boolCancelOldCallback && cb) {
					if (cb.constructor == Function) cb();
					else if (window.debug) debug("CDE.ease(): old callback was not a function... ["+cb+"]");
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
				currentDisplay = this.getStl('display');
				currentVis = this.getStl('visibility');
				// if not visible, the current opacity is 0, regardless of the true value
				obj.current = parseFloat(currentDisplay === 'none' || currentVis === 'hidden' ? 0 : this.getStl('opacity') ) || 0; // if NaN, use 0
				// make sure the element is visible
				if (currentDisplay === 'none') {
					this.o(0);
					if (options.boolDisplayInline) this.di();
					else this.db();
				}
				if (currentVis === 'hidden') this.o(0).vv();
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
					obj.current = CDE.color(obj.current);
					obj.currentRgb = CDE.rgb(obj.current);
					obj.target = CDE.color(obj.target); // hex color WITH hash prefix
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
			var timeNow, pos, newValue;
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
					else if (window.debug) debug("CDE.ease(): options.callback was not a function...["+options.callback+"]");
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
		if (!this.dom().arrEaseObjects) this.dom().arrEaseObjects = [];
		// note that i will be remembered under closure. so the inner function will still be able to refer to it, 
		// and reference the correct array value accordingly
		i = this.dom().arrEaseObjects.length;
		this.dom().arrEaseObjects[i] = obj;
		
		return this;
	},
	
	/**
	 * Get absolute position of the element in the document body. Walks the entire tree.
	 * Use opos if you just want the offset values to the parent.
	 * You need this function when you want to compute onmouse coordinates relative to element.
	 * Margins, border and padding might wonk this up...
	 * @param to=body Stops at this element. If falsy=body, boolean true=parent, otherwise dom element is assumed.
	 * @param boolInner=false Retrieve width of element excluding margin, border and padding?
	 * @return object {w,h[,x,y]}
	 */
	pos: function(to, boolInner){ // absolute position relative to document
		var w, h, e=this.dom(), intTotalTop=0, intTotalLeft=0;
		if (this._boolFailProof && !e) return {x:0,y:0,w:0,h:0};
		
		if (to === false) to = document.body;
		else if (to === true) to = e.offsetParent;
		
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
		} while(e && e != to); //  && e.nodeName && e.nodeName.toUpperCase() != 'BODY'
		
		return {x: intTotalLeft, y: intTotalTop, w: w, h: h};
	},
	
	/**
	 * Return the four offset*** or client*** vales of this element
	 * @todo: rename this function to something more proper...
	 * @param bool boolInner=false Return client (otherwise returns offset)
	 * @return object {x,y,w,h}
	 */
	qpos: function(boolInner){ // boolInner=client positions, else offset positions
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
	},
	
	/** 
	 * Append <this>.dom() to the body by document.body.appendChild
	 * Dont call before creation of body element (like in the head)
	 * @return CDE <this>
	 */
	dba: function(){ // document.appendChild
		if (this._boolFailProof && !this.dom()) return this;
		return CDE.dba(this);
	},
	
	/**
	 * Crossbrowser events. Fixes context, argument, mousecoordinates, mousebutton.
	 * For explorer, the context of the event will be the same as with addEventListener 
	 * and the event argument is supplied as well (but also available in "event" global).
	 * As an added bonus, for mouse events (with mixType), the fifth parameter on the 
	 * callback will always contain the correct button (ie and the others) where
	 * left=1,middle=2,right=3. But only if your browser allows it.
	 * Check out the link for more details on the coordinates and mouse buttons.
	 * @todo: change parameter order for mouse/keyboard event callbacks...
	 * @todo: maybe change the context of the callbacks to this CDE, instead of this dom
	 * @see http://unixpapa.com/js/mouse.html
	 * @param string strEvent Should be the event without 'on' prefixed (click, load, etc)
	 * @param function func The function to execute when the event fires. It's (optional) arguments are: callback(evt, x, y, domOrg). x and y can be bogus/empty/crap. `this` is equal to domOrg. Note that this function is wrapped and cannot be unregistered as given. See boolReturnFunction for that.
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
	 * @param bool boolReturnFunction=false Return the function instead (so you can pass it on to cde.un), but you can't chain this ;)
	 * @return CDE <this>
	 */
	on: function(strEvent, func, mixType, boolReturnFunction){ // mixType: 'screen', 'viewport', 'body', 'element', 'keyboard', cde, dom

		var cdeTarget, f, e = this.dom();
		if (this._boolFailProof && !e) return this;
		
		// fix cde / dom (string is special, not id!). if not string, its the element object, either cde or dom
		if (mixType && typeof mixType != 'string') {
			// set the target element to the requested target
			// note that if the passed on target was cde, that instance is used.
			// in that case you are responsible for not uncaching that object (.on will never uncache anything)
			// you can use that to prevent trashing up the cache with event objects that share the same target
			cdeTarget = mixType;
			// now act as if domTarget is the element and use the element type
			mixType = 'element';
		}
		// if not set, use <this> instance as the target
		if (!cdeTarget) cdeTarget = this;
	
		// note that actual event callbacks are created by factories below
		// to prevent leaks, we dont pass on dom elements, but their CDE wrapped
		// elements. These don't reference the dom element directly, but indirectly
		// through a number. Because of that, their event handlers will not cause 
		// leakage when closing the document...
		
		if (!func && window.debug) debug("CDE.on: no function passed on...");
		if (!func) return;
		
		// all except ie
		if (e.addEventListener) e.addEventListener(strEvent, f = CDE._onFx(mixType, func, cdeTarget, this), false);
		// ie, call the func parameter in the context of this (attachEvent normally binds to window)
		else e.attachEvent('on'+strEvent, f = CDE._onIe(mixType, func, cdeTarget, this));

		if (boolReturnFunction) return f;
		f = null;
		
		return this;
	},

	/**
	 * Remove an event listener from this object. 
	 * You have to supply the callback yourself. Should be the same as you registered with on.
	 *
	 * @param string strEvent Without the "on"-prefix
	 * @param function func
	 * @return CDE <this>
	 */
	un: function(strEvent, func){
		var e = this.dom();
		if (this._boolFailProof && !e) return this;
		// all except ie
		if (e.removeEventListener) e.removeEventListener(strEvent, func, false);
		// ie, call the func parameter in the context of this (attachEvent normally binds to window)
		else e.detachEvent('on'+strEvent, func);
		
		return this;
	},

	/**
	 * Remove all childeren from this element
	 * @todo is it faster to delete lastChild instead?
	 * @todo is it in fact faster to clear the element using innerHTML = '' ?
	 * @todo rename this to clear? or make an alias at least?
	 * @return CDE <this>
	 */
	empty: function(){ // del all childeren
		var f, e = this.dom();
		if (this._boolFailProof && !e) return this;
		// clear very fast by using innerHTML ;)
		this.html('');
		// now remove remaining text nodes
		while (f = e.firstChild) e.removeChild(f);
		return this;
	},
	
	/**
	 * Get the current style for this object.
	 * You can pass on camelcased javascript names, or dashed css names for each style.
	 * The names are fixed for each browsertype (IE expects camel, the rest dashed)
	 * For transparency, use 'opacity'. All three versions of float are accepted.
	 * Use CDE.color() to normalize the results to a hex string
	 * @param string strName Style name (css dashed and javascript camelcased are both accepted)
	 * @param bool boolNormColor=false Normalize the returned color value (only use for colors, will default to #ffffff if unparsable)
	 * @return mix
	 */
	getStl: function(strName, boolNormColor){ // get computed style
		var a,b,e = this.dom();
		if (this._boolFailProof && !e) return this;
		if (window.getComputedStyle) { // FX et al
			// convert camelcase to dashed css syntax
			strName = CDE.jsToCss(strName);
			// float is reserved and should be cssFloat when not in IE
			if (strName == 'float' || strName == 'styleFloat') strName = 'cssFloat';
			
			if ((a = document.defaultView) && (b = a.getComputedStyle(e,null))) {
				if (boolNormColor) return CDE.color(b.getPropertyValue(strName));
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
						// if not found, opacity was most likely not set and defaults to 1
						return 1;
					}
				}
			} else { // still ie :)
				// convert dashed css syntex to camelcase
				strName = CDE.cssToJs(strName);
				// float is reserved and should be styleFloat in IE
				if (strName == 'float' || strName == 'cssFloat') strName = 'styleFloat';
	
				if (boolNormColor) return CDE.color(e.currentStyle[strName]);
				return e.currentStyle[strName];
			}
		}
		if (window.debug) debug("CDE.getStl: Did not know what to do... [strName]");
		return NaN; // unknown...
	},
	
	/**
	 * Add a new stylesheet (!).
	 * This sheet is added to the cde so it will disappear when the element is removed...
	 * When added to body, this stylesheet will override all other stylesheets...
	 * At this point, you cannot edit stylesheets with CDE while on IE...
	 * @param string str The css for the stylsheet
	 * @return CDE <this>
	 */
	addCss: function(str){ // add stylesheet 
		return this.add(CDE.css(str));
	},
	
	/**
	 * Obsoleted in favour of ifDom
	 * @see ifDom
	 * @obsolete
	 * @return cde <this>
	 */
	ifExists: function(){
		this._boolFailProof = true; // its ok for an obect not to exist?
		return this;
	},
	
	/**
	 * Since CDE objects are shared and based on the dom object they wrap, we cant have one object with and another
	 * object without optional existence. So we use the ifDom ... endIf methods to to this for us. Whenever you
	 * want to use a CDE you know might not exist, use the cde.ifDom()...endIf() pattern to ensure no erros occur.
	 * It's best not to rely on this option unless you explicitly know the element might not exist. This will help
	 * you to spot problems faster...
	 * @return cde <this>
	 */
	ifDom: function(){
		this._boolFailProof = true; // its ok for an obect not to exist?
		return this;
	},
	
	/**
	 * Set the optional existence to off.
	 * @see CDE.prototype.ifDom
	 * @return cde <this>
	 */
	endIf: function(){
		this._boolFailProof = false;
		return this;
	},
	
	/**
	 * Set focus to this element
	 * @return CDE <this>
	 */
	focus: function(){
		if (this._boolFailProof && !this.dom()) return this;
		this.dom().focus();
		return this;
	},
	
	/**
	 * Remove focus from this element (blur)
	 * @return CDE <this>
	 */
	blur: function(){
		if (this._boolFailProof && !this.dom()) return this;
		this.dom().blur();
		return this;
	},
	
	/**
	 * Select the text in this input (probably only works for inputs with selectable text...)
	 * @return CDE <this>
	 */
	select: function(){
		this.dom().select();
		return this;
	},
	
	/**
	* Call dom().cloneNode() and return the new CDE with new node.
	* Main reason for this is that the internal CDE property
	* on the DOM (._id) should be cleared after the clone.
	* Note that the id itself is also cleared (to prevent dupes).
	* @param bool boolDeep=false
	* @return CDE <this>
	*/
	clone: function(boolDeep){
		// create a clone
		var dom = this.dom().cloneNode(boolDeep||false);
		// make sure we can distinguish this node from the original
		delete(dom._id);
		// make sure the id does not occur twice
		dom.id = '';
		// return as cde
		return CDE(dom);
	}

});

// static methods used by CDE.prototype.on
CDE.extend({ <!--
	// constants to determine mouse button
	BUTTON_LEFT: 1,
	BUTTON_MIDDLE: 2,
	BUTTON_RIGHT: 3,

	// common keys
	KEY_UP: 38,
	KEY_RIGHT: 39,
	KEY_DOWN: 40,
	KEY_LEFT: 37,
	KEY_ESC: 27,
	KEY_RETURN: 13,
	KEY_SPACE: 32,
	KEY_SHIFT: 16,
	KEY_CTRL: 17,
	KEY_TAB: 9,
	KEY_BSP: 8,
	KEY_CAPS: 20,
		
	/**
	 * Firefox factory for cde.on()
	 * @param mixed mixType
	 * @param function func
	 * @param CDE cdeTarget
	 * @param CDE cdeOrg
	 * @return function
	 */
	_onFx: function(mixType, func, cdeTarget, cdeOrg){
		return function(evt){
			// fix button (left=1,middle=2,right=3)
			var pos, intButton = (evt.which < 2) ? CDE.BUTTON_LEFT : ((evt.which == 2) ? CDE.BUTTON_MIDDLE : CDE.BUTTON_RIGHT); // others
			// call callback depending on mousetype
			switch (mixType) {
				case 'screen':
					func.call(cdeTarget.dom(), evt, evt.screenX, evt.screenY, cdeOrg.dom(), intButton);
					break;
				case 'viewport':
					func.call(cdeTarget.dom(), evt, evt.clientX, evt.clientY, cdeOrg.dom(), intButton);
					break;
				case 'element':
					pos = cdeTarget.pos();
					func.call(cdeTarget.dom(), evt, evt.pageX-pos.x, evt.pageY-pos.y, cdeOrg.dom(), intButton);
					break;
				case 'body':
					func.call(cdeTarget.dom(), evt, evt.pageX, evt.pageY, cdeOrg.dom(), intButton);
					break;
				case 'keyboard':
					func.call(cdeTarget.dom(), evt, evt.keyCode, cdeOrg.dom());
					break;
				default:
					func.call(cdeTarget.dom(), evt, cdeOrg.dom());
			}
		};
	},
	
	/**
	 * InternetExplorer factory for cde.on()
	 * @param mixed mixType
	 * @param function func
	 * @param CDE cdeTarget
	 * @param CDE cdeOrg
	 * @return function
	 */ 
	_onIe: function(mixType, func, cdeTarget, cdeOrg){
		return function(){
			// fix button (left=1,middle=2,right=3)
			var d, pageX, pageY, pos, intButton;
			
			intButton = (event.button < 2) ? CDE.BUTTON_LEFT : ((event.button == 4) ? CDE.BUTTON_MIDDLE : CDE.BUTTON_RIGHT); // ie
			// call callback depending on mousetype
			switch (mixType) {
				case 'screen':
					func.call(cdeTarget.dom(), event, event.screenX, event.screenY, cdeOrg.dom(), intButton);
					break;
				case 'viewport':
					func.call(cdeTarget.dom(), event, event.clientX, event.clientY, cdeOrg.dom(), intButton);
					break;
				case 'element': // for element and browser, we first need to compute event.pageX/Y
				case 'body':
					// "document" to get scroll data
					d = (document.documentElement && document.documentElement.scrollLeft != null) ? document.documentElement : document.body;
					// mouse position relative to firing element
					pageX = event.clientX + d.scrollLeft;
					pageY = event.clientY + d.scrollTop;
					if (mixType == 'element') {
						pos = cdeTarget.pos();
						//debug("on "+pageX+"-"+pos.x+" "+pageY+" "+pos.y);
						func.call(cdeTarget.dom(), event, pageX-pos.x, pageY-pos.y, cdeOrg.dom(), intButton); 
					} else { // browser
						func.call(cdeTarget.dom(), event, pageX, pageY, cdeOrg.dom(), intButton); 
					}
					break;
				case 'keyboard':
					func.call(cdeTarget.dom(), event, event.keyCode, cdeOrg.dom());
					break;
				default:
					func.call(cdeTarget.dom(), event, cdeOrg.dom());
			}
		};
	}
});

// ################################
// #    Creating Dom Elements     #
// ################################

CDE.extend({ <!--
	
	/**
	 * Create new DOM element.
	 * @param string strType Name of DOM element to create
	 * @return CDE
	 */
	dom: function(strType) {
		return CDE(document.createElement(strType));
	},
	
	/**
	 * Creates a span with their innerHTML set to the first param
	 * @param string str value for innerHTML
	 * @return CDE
	 */
	html: function(str) { // span
		// a simple mapping to create textnodes through innerHTML
		return CDE.span(str);
	},
	
	/**
	 * @depricated in favor of CDE.html
	 */
	txt: function(str) {
		if (window.debug) debug("CDE.txt is depricated. Use CDE.html instead.");
		// a simple mapping to create textnodes through innerHTML
		return CDE.span(str);
	},
	
	/**
	 * Create a textnode (instance is marked by _boolTextNode)
	 * @param string str
	 * @return CDE
	 */
	text: function(str){ // text node
		var cde = CDE(document.createTextNode(str));
		cde._boolTextNode = true;
		return cde;
	},
	
	/**
	 * Create a div
	 * @param string str=undefined Set to innerHTML
	 * @return CDE
	 */
	div: function(str){
		var cde = CDE.dom('div');
		if (arguments.length > 0) cde.html(str);
		return cde;
	},
	
	/**
	 * Create a span
	 * @param string str=undefined Set to innerHTML
	 * @return CDE
	 */
	span: function(str){
		var cde = CDE.dom('span');
		if (arguments.length > 0) cde.html(str);
		return cde;
	},
	
	/**
	 * Create an img
	 * @param string src='' The url for the image ('' if not string)
	 * @param string alt='' The value for this.dom().title and alt
	 * @return CDE
	 */
	img: function(src, alt){
		if (typeof src != 'string') src = '';
		return CDE.dom('img').atr({src:src,alt:alt||'',title:alt||''});
	},
	
	/**
	 * Create an input of given type
	 * Radio buttons can be safely created in IE using this function.
	 * @param string strType
	 * @param string name=false
	 * @param string value=false
	 * @param bool bool=false Select or check this input? This parameter allows you to set the value for a radio/checkbox and still un/check it.
	 * @return CDE
	 */
	inp: function(strType, name, value, bool) {
		var cde,e;
	
		// type defaults to text
		if (!strType) strType = 'text';
		
		// radio buttons cannot normally be created dynamically in explorer...
		// since it's hard to detect and the overhead is little, just create
		// it using this hack for all browsers
		if (strType == 'radio') {
			// create a radio button inline (this works fine in explorer...)
			cde = CDE.html('<input type="radio" />');
			// get the child element
			e = cde.dom().firstChild;
			while (e && e.nextSibling) e = e.nextSibling; // in fx the first childNode will be a textNode. the last will always be the input node
			cde = CDE(e);
		} else {
			cde = CDE.dom('input').atr({type:strType});
		}
		// set name
		if (typeof name != 'undefined') cde.name(name);
		// set value
		if (typeof value != 'undefined') cde.val(value);
		// check or select element
		if (bool && strType == 'option') cde.sel(true);
		else if (bool) cde.chk(true);
	
		return cde;
	},

	/**
	* Create a label
	* @param string htmlFor=false An id...
	* @return CDE <this>
	*/
	label: function(htmlFor){
		var cde = CDE.dom('label');
		if (htmlFor) cde.atr('htmlFor',htmlFor);
		return cde;
	},
	
	/**
	 * Create a textarea
	 * @param string value
	 * @return CDE
	 */
	textarea: function(value){
		var cde = CDE.dom('textarea');
		if (arguments.length) cde.val(value);
		return cde;
	},

	/**
	 * Create dynamic javascript link (not anchor). Link will have cursor:pointer and hover: underline
	 * @param string str Text of link
	 * @param function funcOnClick The callback
	 * @param bool boolNoLine=false Do not add the on hover text-decoration=underline
	 * @return CDE
	 */
	lnk: function(txt, funcOnclick, boolNoLine) {
		if (typeof txt == 'undefined') txt = '';
		var cde = CDE.span(txt).ns().css('cursor','pointer');
		if (funcOnclick) cde.on('click', funcOnclick);
		if (!boolNoLine) cde.on('mouseover', CDE._tdu).on('mouseout', CDE._tdn);
		return cde;
	},

	/**
	 * Text-Decoration: Underline
	 * The function executed when hovering over a cde.lnk
	 */
	_tdu: function(){ this.style.textDecoration = 'underline'; }, // can this leak?
	
	/**
	 * Text-Decoration: None
	 * The function executed when no longer hovering over a cde.lnk
	 */
	_tdn: function(){ this.style.textDecoration = 'none'; },
	
	/**
	 * Create dynamic javascript button
	 * @param string str Text of button
	 * @param function funcOnClick The callback
	 * @return CDE
	 */
	btn: function(txt, funcOnclick) {
		if (typeof txt == 'undefined') txt = '';
		if (!funcOnclick) funcOnclick = function(){};
		return CDE.dom("button").on('click', funcOnclick).html(txt);
	},
	
	/**
	 * Create an anchor
	 * @param string url Url of the anchor
	 * @param string str Html of the anchor
	 * @param boolean boolTB=false Target=_blank ?
	 * @return CDE
	 */
	a: function(txt, url, boolTb) {
		if (typeof txt == 'undefined') txt = '';
		var obj = {href: url};
		if (boolTb) obj.target = '_blank';
		return CDE.dom('a').html(txt).atr(obj);
	},
	
	/**
	 * Create line breaks. Note: this does not return a CDE but a plain dom element.
	 * @param int n=1 Number of line breaks to return (in an array)
	 * @return dom or array if n>1
	 */
	br: function(n) {
		var i, brs;
		// return one BR element if none or one is requested
		// return an array of n BR elements, if a higher number is given
		if (typeof n !== 'number' || n <= 0) n = 1;
		if (n === 1) return CDE.dom('br');
		brs = [];
		for (i=0; i<n; ++i) brs.push(CDE.dom('br'));
	
		return brs;
	},
	
	/**
	 * Create a table header (TH) element
	 * @param string txt=undefined Contents of the element
	 * @return CDE
	 */
	th: function(txt) {
		if (typeof txt == 'undefined') txt = '';
		return CDE.dom('th').html(txt);
	},
	
	/**
	 * Create a table data (TH) element
	 * @param string txt=undefined Contents of the element
	 * @return CDE
	 */
	td: function(txt) {
		if (typeof txt == 'undefined') txt = '';
		return CDE.dom('td').html(txt);
	},
	
	/**
	 * Create a table. The first parameter is used to create the contents of the table (if present).
	 * Every element of the parameter should be an array and represents a table row (TR).
	 * Every sub-element is considered table data (TD). The first row is considered the table header (TH).
	 * @param array arrArrMix=false Double array for table data. These elements (wrapped by CDE) are added to the table, row by row.
	 * @param mix stl The css applied to the table
	 * @param mix atr The atr applied to the table
	 * @param mix tdStl The css applied to td's
	 * @param mix tdAtr The atr applied to td's
	 * @param mix thStl The css applied to th's
	 * @param mix thAtr The atr applied to th's
	 * @see CDE.css and CDE.atr for all the stl and atr parameters
	 * @return CDE
	 */
	table: function(arrArrMix, stl, atr, tdStl, tdAtr, thStl, thAtr){
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
					if (typeof arrArrMix[i][j] === 'string') th.html(arrArrMix[i][j]);
					// else add the CDE wrapped element
					else th.add(CDE(arrArrMix[i][j]));
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
					if (typeof arrArrMix[i][j] === 'string' || typeof arrArrMix[i][j] === 'number') td.html(arrArrMix[i][j]);
					// else add the CDE wrapped element
					else td.add(CDE(arrArrMix[i][j]));
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
	},
	
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
	select: function(arrDesc, arrValue, objOpts){ // stl, atr, intSelectedIndex, boolSelectByValue, optionStl, optionAtr, boolUseDescAsValue
		var cde, val, i;
		
		// ensure the object exists
		if (!objOpts) objOpts = {};
		
		// create actual select
		cde = CDE.dom('select').css(objOpts.stl).atr(objOpts.atr);
		// add options
		for (i=0; i<arrDesc.length; ++i) {
			// set value to corresponding value in value array, or to same value as description or to index
			val = arrValue?arrValue[i]:(objOpts.boolUseDescAsValue?arrDesc[i]:i);
			CDE.dom('option')
				.css(objOpts.optionStl) // apply style from options
				.atr(objOpts.optionAtr) // apply attributes from options
				.val(val)               // set value
				.html(arrDesc[i])       // set text
				.sel((objOpts.boolSelectByValue?val:i) == objOpts.intSelectedIndex) // select if passed on value is equal to index or value
				.addTo(cde);
		}
		return cde;
	},
	
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
	 * Use CDE.prototype.spriteTo to change this sprite.
	 * @see CDE.prototype.spriteTo
	 * @param int x Position of target image in sprite
	 * @param int y Position of target image in sprite
	 * @param int tw Dimension of result image (of sprite map)
	 * @param int th Dimension of result image (of sprite map)
	 * @param int ow Dimension of original image (in sprite map)
	 * @param int oh Dimension of original image (in sprite map)
	 * @param string alt='' The title/alt text for the image
	 * @return CDE
	 */
	sprite: function(src, x, y, tw, th, ow, oh, alt){
		var img, cde;
		// create the container (no overflow, relative and target size
		// this acts as the viewport
		cde = CDE.div().css({overflow: 'hidden', position: 'reative', width: tw+'px', height: th+'px'});
		// create an image, create onload callback and load the image
		// the callback will add the image to the container, which is
		// returned immediately
		img = new Image();
		// set onload first to prevent race condition.. (yes, IE sometimes fires synchronously :s)
		img.onload = function(){
			var w,h ,dw,dh;
			
			// scale factor
			dw = tw/ow;
			dh = th/oh;
			// new size of entire sprite map
			w = img.width * dw;
			h = img.height * dh;
			// new coordinate locations
			x *= dw;
			y *= dh;
			
			img = null;
			
			// add the image to the container
			CDE.img(src, alt).css({
				position: 'absolute', 
				left: -Math.round(x)+'px', 
				top: -Math.round(y)+'px', 
				width: ~~w+'px', 
				height: ~~h+'px'
			}).ns().addTo(cde).uncache();
		};
		// setting the source forces the browser to start downloading the file (or fetch it from cache)
		img.src = src;
		// return container, the image will be set onload
		return cde;
	}

});

// other core functions

CDE.extend({ <!--
	
	/**
	 * Add <this> to document.body
	 * Dont call before body is created.
	 * @param mixed _args Variable number of arguments (DOM, CDE, Array or string), which are all added to the body
	 * @return mix the first argument
	 */
	dba: function(_args) { // Document.Body.AppendChild(arguments)
		CDE(document.body).add(Array.prototype.slice.call(arguments));
		return arguments[0];
	},
	
	/**
	 * Load an external javascript (random number appended automatically, unless specified otherwise).
	 * Nothing happens when the load fails... (it can't be detected safely crossbrowser without polling).
	 * @param string url Target url
	 * @param function funcOnload=false Called when script is loaded
	 * @param boolean boolNoAntiCache=false Do not add random number (allows caching)
	 * @param boolean boolSilent=false Do not debug loading and loaded events
	 */
	ljs: function(url, funcOnload, boolNoAntiCache, boolSilent) {
		var funcCallback, funcDebugDone, cde, boolLoaded=false, strUrl;
		
		if (!boolNoAntiCache) {
			if (url.indexOf('?') >= 0) url += '&'+Math.random();
			else url += '?'+Math.random();
		}
		
		if (window.debug && !boolSilent) {
			strUrl = url.substring(0,20);
			if (window.debug) debug('Importing '+strUrl+"...");
			funcDebugDone = function() { window.debug("Imported "+strUrl+"..."); };
		}
	
		funcCallback = function(){
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
			cde.del(true);
			cde = null;
		};
		
		// add the script to the body
		cde = CDE.dom('script').on('load', funcCallback).on('readystatechange', function(){
			// loaded = fresh, complete = cached. silly ms
			if (this.readyState === 'loaded' || this.readyState === 'complete') funcCallback();
		}).atr({type: 'text/javascript', language: 'javascript', src: url}).dba();
	},
	
	/**
	 * Create a stylesheet
	 * Note that after creating, you can add styles through 
	 * cde.text(), except on explorer, which can only replace the current
	 * text...
	 * @param string str=false The contents of the stylesheet
	 * @return CDE
	 */
	css: function(str){
		var cde = CDE.dom('style').atr({type: 'text/css'});
		
		cde._boolStyleSheet = true; // mark as stylesheet so text() will take note of it...
		
		if (str) cde.text(str);
	
		return cde;
	},

	/**
	 * Convert css attribute name to javascript version. Used by cde.css
	 * @param string str
	 * @return string
	 */
	cssToJs: function(str){
		return str.replace(/(-.)/g, function(c){return c.substring(1,2).toUpperCase();});
	},

	/**
	 * Convert js attribute name to css version. Used by cde.css
	 * @param string str
	 * @return string
	 */
	jsToCss: function(str){
		return str.replace(/([A-Z])/g, function(c){return '-'+c.toLowerCase();});
	},

	/**
	* Stop an event dead in its tracks.
	* Just return CDE.prevent(evt) to cancel an event (or die trying :)
	* @param object evt The event object. In windows this would be the global event, in other browsers it's the argument passed on to the event handler
	* @return false
	*/
	stopEvent: function(evt){
		if (evt.stopPropagation) evt.stopPropagation(); // fx
		if (evt.preventDefault) evt.preventDefault(); // fx
		evt.cancelBubble = true; // ie: http://msdn.microsoft.com/en-us/library/ms533545%28VS.85%29.aspx
		evt.returnValue = false; // ie: http://msdn.microsoft.com/en-us/library/ms534372%28VS.85%29.aspx
		return false; // opera
	},

	/**
	 * Return the argument as hex color.
	 * If the color is a name, these are supported by default build: beige, black, blue, brown, cyan, gold, gray, green,
	 * indigo, ivory, khaki, lavender, lime, linen, magenta, maroon, moccasin, navy, olive, orange, orchid, peru, pink,
	 * plum, purple, red, salmon, sienna, silver, snow, tan, teal, thistle, tomato, turquoise, violet, wheat, white, yellow
	 * You can find all the colors as well, just decomment them to get their support (adds about 3.5kb to the size of CDE)
	 
	 debug(CDE.color('#abc'));
	 debug(CDE.color('abc'));
	 debug(CDE.color('#aabbcc'));
	 debug(CDE.color('aabbcc'));
	 debug(CDE.color('#11aabbcc'));
	 debug(CDE.color('11aabbcc'));
	 debug(CDE.color('rgb(100,200,256)'));
	 debug(CDE.color('rgb(100,200,13)'));
	 
	 * @param string color Should be any result from the browser when checking the applied style, colornames are restricted (but you can extend that to support any in the source)
	 * @param bool noHash=false Prefix the hash on return?
	 * @return string
	 */
	color: function(str,noHash){
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
	
		// rgba(xxx, xxx, xxx, 0.xxx) (with alpha, as decimal 0..1)
		// lots of non-capturing groups, but for alpha i only want to accept 1 or 0 or 0.d*
		r = /^rgba\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3}), ?(?:1|(?:0(?:\.\d*)))\)$/;
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
	},
	
	/**
	 * Get a color, normalize it, and return the rgb colors
	 * Unless three parameters are given, in that case return a hex color with those rgb values... (yes, confusing, but whatever)
	 * If not and the first parameter is a number, bitwise operators are used to extract r, g and b :)
	
	 debug(CDE.rgb('#abc'));
	 debug(CDE.rgb('abc'));
	 debug(CDE.rgb('#aabbcc'));
	 debug(CDE.rgb('aabbcc'));
	 debug(CDE.rgb('#11aabbcc'));
	 debug(CDE.rgb('11aabbcc'));
	 debug(CDE.rgb('rgb(100,200,256)'));
	 debug(CDE.rgb('rgb(100,200,13)'));
	
	 * @param string color Either: string:the [#]r[r]g[g]b[b] color, number: if g and b are numbers this is r, else this contains all three (use binary operators to extract them)
	 * @param int g=false
	 * @param int b=false
	 * @param int noHash=false For rgb value, dont prefix the hash
	 * @return [r,g,b]
	 */
	rgb: function(color, g, b, noHash){
		// if three parms are given, asume its an rgb color and return the normalized hex string of it (with hash)
		if (typeof color == 'number' && typeof g == 'number' && typeof b == 'number') {
			return CDE.color("rgb("+color+","+g+","+b+")", noHash);
		}

		// if color is a number, extract the value
		if (typeof color == 'number') {
			return CDE.color((color>>16)&255, (color>>8)&255, color&255, noHash);
		}

		
		// normalize color to rrggbb
		color = CDE.color(color, true);
		return {
			r: parseInt(color.substring(0,2), 16), 
			g: parseInt(color.substring(2,4), 16), 
			b: parseInt(color.substring(4,6), 16)
		};
	}
	
});

// ################################
// #     Set/get atr methods      #
// ################################

CDE.proto({ <!--

	/**
	 * Sets innerHTML to str
	 * If no argument is given, the current value of innerHTML is 
	 * returned (Warning, this can give different results, depending 
	 * on your browser. take care with html-entities).
	 * Note: every time you read innerHTML, it has to deserialize the
	 * entire dom starting at <this> element. It will do this every 
	 * time you read from it and it's (relatively) slowww.
	 * @param string str=undefined When no argument is passed on, the current innerHTML is returned.
	 * @param bool boolAppend=false Append the string to innerHTML rather than replacing it
	 * @param bool boolPrepend=false Prepend the string to innerHTML rather than replacing it
	 * @return CDE <this> or current innerHTML when called without arguments
	 */
	html: function(str, boolAppend, boolPrepend){ // innerHTML: str
		if (this._boolFailProof && !this.dom()) return this;
		if (arguments.length == 0) return this.dom().innerHTML;
		if (boolAppend) this.dom().innerHTML += str;
		else if (boolPrepend) this.dom().innerHTML = str + this.dom().innerHTML;
		else this.dom().innerHTML = str;
		return this;
	},
	
	/**
	 * @depricated in favor of CDE.prototype.html
	 */
	txt: function(str, boolAppend, boolPrepend){ // innerHTML: str
		if (window.debug) debug("cde.txt: This function is depricated, please use CDE.html");
		if (this._boolFailProof && !this.dom()) return this;
		if (arguments.length == 0) return this.dom().innerHTML;
		if (boolAppend) this.dom().innerHTML += str;
		else if (boolPrepend) this.dom().innerHTML = str + this.dom().innerHTML;
		else this.dom().innerHTML = str;
		return this;
	},
	
	/**
	 * Add a textnode (does not clear parent, adds document.createTextNode, unless specified otherwise).
	 * If this is a stylesheet, the text can only be replaced
	 * @param string str
	 * @param bool boolClear=false Clear this first
	 * @param bool boolPrepend=false Prepend the text node instead
	 * @return CDE <this>
	 */
	text: function(str, boolClear, boolPrepend){  // add textNODE
		var dom;
		if (this._boolFailProof && !this.dom()) return this;

		// for stylesheets, simply replace them for now
		if (this._boolStyleSheet) {
			if (this.dom().styleSheet) this.dom().styleSheet.cssText = str;
			else this.html(str);
		} else {
			// create the node
			dom = document.createTextNode(str);
			// clear if requested
			if (boolClear) this.empty();
			
			// actually pend node
			if (boolPrepend) this.dom().insertBefore(dom, this.dom().firstChild);
			else this.add(dom);
		}
		return this;
	},
	
	/**
	 * @depricated in favor of CDE.prototype.text
	 */
	txtn: function(str){
		if (window.debug) debug("CDE.txtn: depricated in favor of CDE.text");
		return this.text(str);
	},
	
	/**
	 * Set or get the text value of this element. Used on input elements.
	 * When no argument is supplied, the current value is returned (and unchanged)
	 * @param string str=undefined
	 * @return mix|CDE <this>
	 */
	val: function(str){ // value: str
		if (this._boolFailProof && !this.dom()) return this;
		if (arguments.length == 0) return this.dom().value;
		return this.atr('value', str);
	},
	
	/**
	 * Either return the value of the selected index of a select input or, if argument is supplied, set or unset the selected state based on the parameter.
	 * Note: this should be a select input if no argument is passed on. It should be an option element if the parameter is supplied.
	 * @param bool boolState=undefined When supplied (not undefined..) it will set this.dom().selected = boolState and return the element
	 * @param bool boolTxt=false Return the innerHTML of the selected option, rather than the value
	 * @return mixed
	 */
	sel: function(boolState, boolTxt){ // get/set selected option
		var e = this.dom();
		if (this._boolFailProof && !e) return this;
		// if undefined, get current selected value of select element
		if (typeof boolState == 'undefined') {
			if (boolTxt) return e.options[e.selectedIndex].innerHTML;
			return e.options[e.selectedIndex].value;
		}
		// select this option element and return `this`
		return this.atr('selected', boolState);
	},
	
	/**
	 * Set this.checked to the value of bool. If no argument, return the current value instead.
	 * @param bool bool=undefined
	 * @return bool|CDE <this>
	 */
	chk: function(bool){ // get/set checked
		if (this._boolFailProof && !this.dom()) return this;
		if (arguments.length == 0) return this.dom().checked;
		return this.atr('checked', !!bool);
	},
	
	/**
	 * Change the id (and name) of the element. When no argument is given, the current id is returned instead.
	 * @param str strId=undefined
	 * @return this <CDE>
	 */
	id: function(strId){ // id: id
		if (arguments.length == 0) return this.dom().id;
		return this.atr('id',strId);
	},
	
	/**
	 * Set the name of this element
	 * Mostly used for radio buttons in the context of CDE, or to style
	 * generic submitting forms.
	 * When no argument is given, it returns the current value for name.
	 * @param string strName=undefined
	 * @return CDE <this>
	 */
	name: function(strName){ // name: name
		if (arguments.length == 0) return this.dom().name;
		return this.atr('name', strName);
	},
	
	/**
	* Set or get the src attribute of this element
	* @param string str If given, the value is changed, otherwise the current value is returned
	* @return CDE|string <this> or the src value if no arg is given
	*/
	src: function(src){ // this.src = src
		if (this._boolFailProof && !this.dom()) return this;
		if (arguments.length == 0) return this.dom().src;
		return this.atr('src', src);
	}

});

// common macro's

CDE.proto({ <!--
	
	/**
	 * Fade the element out and remove it from dom after the fade completes...
	 * Note that any callback supplied through the options are overwritten,
	 * use the cb parameter for that. The options are passed on to ease, with
	 * a custom callback (wrapping the cb parameter).
	 * @param function cb=false Callback executed after del
	 * @param object options=false The options parameter for ease for the fade
	 * @return cde <this>
	 */
	fadeDel: function(cb, options){ // fade out and then remove from dom
		if (!options) options = {};
		options.boolAfterFadeDelete = true;
		options.callback = cb;
		return this.ease({opacity: 0}, options);
	},
	
	/**
	 * Same as fadeDel except it also removes it and its childeren from cache
	 * @param function cb=false Callback executed after del
	 * @param object options=false The options parameter for ease for the fade
	 * @return cde <this>
	 */
	fadeDelUncache: function(cb, options){ // fade out. remove from dom and uncache completely
		if (!options) options = {};
		options.boolAfterEaseUncacheCompletely = true;
		return this.fadeDel(cb, options);
	},
	
	/**
	 * Simple map to ease for fading an element in
	 * @param function=false func callback after fadein
	 * @param object=false options for ease (callback will be overwritten by func, if present)
	 * @param float max=1 Max value for opacity
	 * @return cde <this>
	 */
	fadeIn: function(func, options, max){
		if (!options) options = {};
		if (func) options.callback = func;
		return this.ease({opacity: max||1},options);
	},
	
	/**
	 * Simple map to ease for fading an element out
	 * @param function=false func callback after fadein
	 * @param object=false options for ease (callback will be overwritten by func, if present)
	 * @param float min=0 Min value for opacity
	 * @return cde <this>
	 */
	fadeOut: function(func, options, min){
		if (!options) options = {};
		if (func) options.callback = func;
		return this.ease({opacity: min>0?min:0},options);
	},
	
	/**
	 * Set opacity to zero, add to body, center and fade in.
	 * It's a common thing to do for popups.
	 * @param object options=false For the fadeIn call.
	 * @param float max For the fadeIn call.
	 * @param bool centerHor=true Center horizontal?
	 * @param bool centerVert=true Center vertical?
	 * @return cde <this>
	 */
	centerFade: function(options, max, centerHor, centerVert){
		return this.o(0).dba().center(centerHor, centerVert).fadeIn(false,options, max);
	},
	
	/**
	 * Add this to given element, set opacity to 0 before doing so and
	 * fade the element in afterwards. Just a shorthand for those steps.
	 * @param cde cde element to add this to
	 * @param object options Passed on to ease directly
	 * @return cde <this>
	 */
	addToFading: function(cde, options, max){ // .o(0).addTo(cde).fadeIn()
		return this.o(0).addTo(cde).fadeIn(false, options, max);
	},
	
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
	ns: function(){ // noselect
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
	},
	
	/**
	 * Center this element in the viewport.
	 * This sets the element absolute... Unless both parameters are true, then nothing happens.
	 * @param bool boolNotHor=false Dont change horizontal
	 * @param bool boolNotVer=false Dont change vertical
	 * @return CDE <this>
	 */
	center: function(boolNotHor, boolNotVer){
		var cp, vp, pos;
		if (boolNotHor && boolNotVer) return this;
		cp = CDE.scrollPos();
		vp = CDE.viewportSize();
		this.abs();
		pos = this.pos();
		if (!boolNotHor) this.x(Math.round((cp.x+(vp.w/2))-(pos.w/2)));
		if (!boolNotVer) this.y(Math.round((cp.y+(vp.h/2))-(pos.h/2)));
		return this;
	},
	
	/**
	 * Allow an element to be dragged around...
	 * If you dont supply a parent, body will be used instead (usually safe, but body might not be 100% high/wide).
	 * You can supply ondragstart, ondragging and ondragend events by argument (dont use .on for them!).
	 * The drag callback is called with the current x/y of the mouse and the total distance moved from start cb(x,y,dx,dy).
	 * You can find the remaining information about the drag in CDE.move, but note that this object is used by CDE internally to drag.
	 * This also sets .ns()
	 * This function tries to be generic, but I'm sure untested edge cases might fail...
	 *
	 * @param object parent=document.body The parent element which should listen for the drag events. If boolean true, <this> is used. You are responsible for tracking the reference. This method will not uncache the parent.
	 * @param object options=false The options are as follows:
	 * - function onstart=false Called as: onstart(x,y,button), context will be this cde, button is the mouse button that caused this event. return false here to cancel the drag entirely.
	 * - function ondrag=false Called as: ondrag(x,y,dx,dy,tx,ty); dxy: distance since start, txy: target of element (if would moved), context will be CDE.move.cde (which is this cde, unless you change it)
	 * - function onstop=false Called as: onstop(x,y), context will be CDE.move.cde (which is this cde, unless you change it)
	 * - bool boolNoMove=false Do not move the element when dragging (maybe you dont want to actually drag but alter something through the callback)
	 * - int intMaxX=false If number, this acts as a bound for the element
	 * - int intMaxY=false If number, this acts as a bound for the element
	 * - int intMinX=false If number, this acts as a bound for the element
	 * - int intMinY=false If number, this acts as a bound for the element
	 * - CDE cdeDragTarget=false If not false and !boolNoMove, this element is moved instead
	 * - int intOffsetX=false If number, when the object is moved, it will be moved this many pixels from the actual position, can be negative
	 * - int intOffsetY=false If number, when the object is moved, it will be moved this many pixels from the actual position, can be negative
	 * @return CDE <this>
	 */
	draggable: function(parent, options){ // onstart, ondrag, onstop, intMaxX, intMaxY, intMinX, intMinY, boolNoMove, cdeDragTarget, intOffsetX, intOffsetY
		var that = this;
		// make sure this exists
		if (!options) options = {};
		// use body by default
		if (!parent) parent = document.body;
		// if the parent is boolean true, use this instead
		if (parent === true) parent = this;
		// otherwise use the argument
		else parent = CDE(parent);
		// set mousedown for the draggable element
		this.ns().on('mousedown', function(evt,x,y,__,btn){
			var bool, pos = that.pos(true); // to parent
			// we save "state" in the CDE.move object. this includes the custom event callbacks
			// the position of the element is determined by the difference between the current
			// mouse, the expected parent, the expected target to move and new mouse point.
			CDE.move = { cde: that, cdeToMove: options.cdeDragTarget||that, options: options, parent: parent, cdeX: pos.x, cdeY: pos.y, mouseX: x, mouseY: y, ondrag: options.ondrag, onstop: options.onstop };
			if (options.onstart) {
				// this also fires for a regular click...
				bool = options.onstart.call(that, x, y, btn);
				// if the onstart callback returns false, cancel the drag!
				if (bool === false) CDE.move = false;
			}
			return CDE.stopEvent(evt);
		}, parent);
		// if not yet set up, set up the generic drag/up events for the parent
	
		if (!parent.dom()._boolDraggable) {
			// add move and up events (once)
			CDE(parent).on('mousemove', function(evt, x, y){
				var dx, dy, tx, ty;
				// if there is no move object, we're not dragging
				if (!CDE.move) return;
				// if we are expecting a different parent, bail out
				// note, we determine which parent to expect at mousedown, not at calltime of .draggable. This is because at calltime, parent is remembered through closure and always the same, no matter why it fires.
				if (this != CDE.move.parent.dom()) return;
				// determine difference between start and current
				dx = x - CDE.move.mouseX;
				dy = y - CDE.move.mouseY;
				// targets
				tx = CDE.move.cdeX + dx;
				ty = CDE.move.cdeY + dy;
				// apply bounds
				if ((typeof options.intMinX) == 'number') tx = Math.max(tx, options.intMinX);
				if ((typeof options.intMinY) == 'number') ty = Math.max(ty, options.intMinY);
				if ((typeof options.intMaxX) == 'number') tx = Math.min(tx, options.intMaxX);
				if ((typeof options.intMaxY) == 'number') ty = Math.min(ty, options.intMaxY);
				// move object the same distance as the mouse moved (unless you want to do this yourself..)
				if (!options.boolNoMove) CDE.move.cdeToMove.xy(tx+(options.intOffsetX||0)+"px", ty+(options.intOffsetY||0)+"px");
				// call custom callback
				if (CDE.move.ondrag) CDE.move.ondrag.call(CDE.move.cde, x,y,dx,dy,tx,ty);
				
				return CDE.stopEvent(evt);
			}, parent).on('mouseup', function(evt,x,y){
				// if this doesnt exist, we're not dragging
				if (!CDE.move) return;
				// if we are expecting a different parent, bail out
				// note, we determine which parent to expect at mousedown, not at calltime of .draggable. This is because at calltime, parent is remembered through closure and always the same, no matter why it fires.
				if (this != CDE.move.parent.dom()) return;
				// call the custom callback
				if (CDE.move.onstop) CDE.move.onstop.call(CDE.move.cde, x, y);
				// release the information...
				CDE.move = false;
	
				return CDE.stopEvent(evt);
			}, parent);
			
			// mark this element as being set up for dragging
			parent.dom()._boolDraggable = true;
		}
		
		return this;
	}

});

// ###################################
// #   Internal helper functions     #
// ###################################

/**
 * Output internal information... This is put on a timer to prevent straining the DOM too much
 * @param string strType Any of: cacheSize, cache
 * @param mix arg1 depends on strType
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
				s += "<div style='color:black;' title='"+CDE.escapeHtml((CDE._doms[i].innerHTML+'').substring(0,300))+"'>"+i+" = ["+CDE._doms[i]+"]"+(CDE._doms[i]?" ("+CDE._doms[i].id+")":"")+"</div>";
			}
		}
		if (window.debug) debug(s,true);
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
CDE(window).on('unload', CDE._unload);


// Added CDE.label
// Added cde.select to select all text
// Changed cde.centerFade to accept two parameters to control centering and updated the documentation.
// Changed CDE.rgb to also accept a single number and extract rgb from that number using bitwise operators

// #### Ajax ####
// CDE.Ajax
// Source: My Ajax script, v1.08, starting at CDE v2a9
// Will add CDE.get and CDE.post to make Ajax calls

// Note: this file does not _need_ CDE, but if you are going to load
// the core, make sure you do it BEFORE this file...
if (!CDE) window.CDE = {};

(function(){<!--

var _send, // generic send function, used by both get and post
		_getXhr, // generic XHR object factory
		_antiCache, // add cache buster
		_toPostdata, // serialize an object to an HTTP POST body payload
		xdebug = function(s){return s;}; // prevent errors on calling debug (if no debug is available) by creating a local function

/**
 * Internal function to handle the posts and gets.
 *
 * @see ajax.get
 * @see ajax.post
 * @param bool boolGet Make GET or POST request
 * @param string strUrl Target URL, unescaped
 * @param function funcCallback=false Function to call when request completes
 * @param string strData=false Payload for POSTs, ignored for GETs
 * @param object objOptions=false Addional options
 * - boolNoAntiCache: when true, does not append a random string to the URL to prevent caching
 * - boolNoAntiCachePost: when true, does not send anti-cache headers for posts (they are usually unique). this is not same as the cache buster!
 * - boolReturnXML: when true, also returns XML (as second parameter of callback). For this, the content-type needs to be XML in certain browsers...
 * - boolBlocking: when true, the call will block javascript untill the request is complete.
 * - boolSurpressDebug: do not debug the url when fetching
 */
_send = function(boolGet, strUrl, funcCallback, strData, objOptions){
	if (!strUrl) return (window.debug||xdebug)("Ajax._send: No url found...");
	
	// prevent caching, unless you dont want to
	if (!objOptions.boolNoAntiCache) strUrl = _antiCache(strUrl);
	// show the url, unless prevented
	if (!objOptions.boolSurpressDebug) (window.debug||xdebug)((boolGet?"Get":"Post")+": "+strUrl);

	// get generic XMLHttpRequest object
	var xhr = _getXhr(funcCallback, objOptions.boolReturnXML);
	if (!xhr) {
		// @todo: maybe replace this by your own gracefull handle function..
		alert("Browser does not support ajax Requests. Unable to process request.");
		return;
	}

	xhr.open(boolGet?"GET":"POST", strUrl, !objOptions.boolBlocking);
	xhr.setRequestHeader("Connection", "close"); // prevent IE7 problem
	
	if (boolGet) {
		xhr.send(null); // GET's have no payload
	} else {
		// empty is empty
		if (typeof strData == 'undefined') strData = '';
		// POST's need some extra parameters...
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded;"); 
		xhr.setRequestHeader("Content-length", strData.length);
		//if (!objOptions.boolNoAntiCachePost) xhr.setRequestHeader("Pragma", "no-cache");
		//else xhr.setRequestHeader("Pragma", "cache");
		//if (!objOptions.boolNoAntiCachePost) xhr.setRequestHeader("Cache-Control", "no-cache");
		//else xhr.setRequestHeader("Cache-Control", "cache");
		
		xhr.send(strData);
	}
};

/**
 * Create a crossbrowser XHR object
 * @param function callback=false Called on success (impossible to do failure xb)
 * @param bool boolReturnXML=false When true, first param is xml, second is txt
 * @return xhr
 */
_getXhr = function(callback, boolReturnXML){
	var xhr = null;
	if (window.XMLHttpRequest) {
	   xhr = new XMLHttpRequest();
	}
	else if (window.ActiveXObject) {
	  xhr = new ActiveXObject("Microsoft.XMLHTTP");
	}
	xhr.onreadystatechange = function () {
		if (xhr.readyState == 4 || xhr.readyState=='complete') {
			try { xhr.status; // we're just "touching" the value to trigger an exception if one has been thrown. This saves us having to trap the entire parsereply function
			} catch (errrr) {
				// just do it for anything. this will also cause the error to show for 401 errors (unknown location), but it should never happen when not manipulating the script manually
				throw("Warning: Unknown error with server request (timeout?).");
			}
			if (xhr.status == 200) {
				if (callback) {
					if (boolReturnXML) callback(xhr.responseXML, xhr.responseText);
					else callback(xhr.responseText);
				}
			} 
			else {
				throw("File request problem (code: "+xhr.status+")!"); // most likely file not found...
			}
		}
	};

	return xhr;
};

/**
 * Append a string to the URL to prevent caching.
 * Ajax requests notoriously cache their requests, especially on IE.
 * This function appends a unix timestamp to the URL as an empty PHP argument.
 * It checks whether a question mark exists, if so and it is the last char,
 * it will only append the unix timestamp. Else it will append "&timestamp". If
 * no question mark is found at all, it will append "?timestamp".
 *
 * @param string strURL
 * @return string
 */
_antiCache = function(strUrl){
	// "random" string (unixtime, surprised?)
	var q,r = (new Date()).getTime();
	
	if (strUrl.indexOf('?') >= 0) {
		// if questionmark is suffixed, no need to append anything else
		q = (strUrl.indexOf('?') != (strUrl.length-1));
		return strUrl+(q?'&':'')+r;
	}
	return strUrl+"?"+r;
};

/**
 * Create query string from associated array
 * This already and only urlencodes ampersands and percentages
 * because they are the only of the characters that could cause
 * problems with sending requests. Takes care of arrays of any
 * depth and converts them properly.
 *
 * @param object obj Any own property of the object is converted to name=pair& strings, xml escaped
 * @param bool boolAnyProperty=false Include own properties
 * @return string
 */
_toPostdata = function(obj, boolAny, n){
	var s='', tmp, key, i;
	if (obj instanceof Object) {
		for (key in obj) {
			if (boolAny || obj.hasOwnProperty(key)) {
				if (obj[key] instanceof Array) {
					for (i=0; i<obj[key].length; ++i) {
						tmp = {};
						tmp[key+'['+i+']'] = obj[key][i];
						s += _toPostdata(tmp, boolAny);
					}
				} else {
					s += key+'='+_toPostdata(obj[key])+'&';
				}
			}
		}
		return s;
	}
	
	if (obj === undefined) return 'undefined';
	if (obj === null) return 'null';
	return obj.toString().replace(/%/g,'%25').replace(/&/g,'%26');
};

/**
 * Send a GET request to the URL. A random suffix will be appended to the URL to prevent caching. You can prevent this by using an optional parameter.
 * The suffix is a php argument, unix timestamp as the name, without a value.
 *
 * @param string strUrl Target url, not escaped in any way...
 * @param function funcCallback=false Callback to be called when request returns. Callback will be called with the content-string as first parameter. XML is second parameter, if requested.
 * @param object objOptions=false Several optional parameters:
 * - boolNoAntiCache: when true, does not append a random string to the URL to prevent caching
 * - boolReturnXML: when true, also returns XML (as second parameter of callback). For this, the content-type needs to be XML in certain browsers...
 * - boolBlocking: when true, the call will block javascript untill the request is complete.
 * - boolSurpressDebug: do not debug the url when fetching
 */
CDE.get = function(strUrl, funcCallback, objOptions){ // boolNoAntiCache, boolReturnXML, boolBlocking, boolSurpressDebug
	var o = objOptions||{};
	if (!o.boolSurpressDebug) (window.debug||xdebug)(strUrl);
	_send(true, strUrl, funcCallback, false, o);
};

/**
 * Send a GET request to the URL. A random suffix will be appended to the URL to prevent caching. You can prevent this by using an optional parameter.
 * The suffix is a php argument, unix timestamp as the name, without a value. The data object literal is converted to name:value pairs, unless specified not to.
 *
 * @param string strUrl Target url, not escaped in any way...
 * @param object objData=false Target data. Object literal which is converted to name:value pairs. When empty, the payload is empty (like a GET would be...). No escaping of data necessary unless you use the boolNoConvert=true option.
 * @param function funcCallback=false Callback to be called when request returns. Callback will be called with the content-string as first parameter. XML is second parameter, if requested.
 * @param object objOptions=false Several optional parameters:
 * - boolNoAntiCache: when true, does not append a random string to the URL to prevent caching
 * - boolNoAntiCachePost: when true, does not send anti-cache headers for posts (they are usually unique). this is not same as the cache buster!
 * - boolReturnXML: when true, also returns XML (as second parameter of callback). For this, the content-type needs to be XML in certain browsers...
 * - boolBlocking: when true, the call will block javascript untill the request is complete.
 * - boolNoConvert: when true, will not convert objData but asume it's toString() method to do this
 * - boolSurpressDebug: do not debug the url when fetching
 */
CDE.post = function(strUrl, objData, funcCallback, objOptions){ // boolNoConvert, boolNoAntiCache, boolReturnXML, boolBlocking, boolSurpressDebug, boolNoAntiCachePost
	var o = objOptions||{};
	if (!o.boolSurpressDebug) (window.debug||xdebug)(strUrl);
	if (!o.boolNoConvert && objData) objData = _toPostdata(objData);
	_send(false, strUrl, funcCallback, objData, o);
};

})();

// todo: add hooks to hook into the get, post or send event, onsend and onrecieve
// fixed: bug where get and post would be inversely debugged

// #### CSS ####
// ################################
// #       Set css methods        #
// ################################

// positional methods

CDE.proto({ <!--

	/**
	 * Set position to absolute and map the args to .x(x).y(y).w(w).h(h)
	 * Undefined/false values are not changed. Numbers get 'px' appended.
	 * @param int/string x
	 * @param int/string y
	 * @param int/string w
	 * @param int/string h
	 * @return CDE <this>
	 */
	abs: function(x, y, w, h){ // position: absolute; left: left; top: top; width: width; height: height;
		return this.css({position: 'absolute'}).x(x).y(y).w(w).h(h);
	},
	
	/**
	 * Set position:relative
	 * You need this to get absolute positioned childs to be positioned relative to their parent, if parents are not abs.
	 * @param int/string x
	 * @param int/string y
	 * @param int/string w
	 * @param int/string h
	 * @return CDE <this>
	 */
	rel: function(x, y, w, h){ // position: relative
		return this.css('position', 'relative').x(x).y(y).w(w).h(h);
	},
	
	/**
	 * Set width and height for element. Maps to this.w(w).h(h); 
	 * If parameters are numbers, 'px' is appended to them. Undefined/false parameters are not changed.
	 * @param mix width
	 * @param mix height
	 * @return this <CDE>
	 */
	wh: function(w, h){ // width/height
		return this.w(w).h(h);
	},
	
	/**
	 * Set width of element in px
	 * If parameter is number, 'px' is appended to it. If undefined/false paramete, nothing changes.
	 * @param int w
	 * @return CDE <this>
	 */
	w: function(w){ // width
		if (typeof(w) !== 'undefined' && w !== false) this.css('width', w+(typeof w == 'number'?'px':''));
		return this;
	},
	
	/**
	 * Set height of element in px
	 * If parameter is number, 'px' is appended to it. If undefined/false paramete, nothing changes.
	 * @param int h
	 * @return CDE <this>
	 */
	h: function(h){ // height
		if (typeof(h) !== 'undefined' && h !== false) this.css('height', h+(typeof h == 'number'?'px':''));
		return this;
	},
	
	/**
	 * Map to this.x(x).y(y)
	 * If parameters are numbers, 'px' is appended to them. Undefined/false parameters are not changed.
	 * @param mix x
	 * @param mix y
	 * @return CDE <this>
	 */
	xy: function(x,y){ // left, top
		return this.x(x).y(y);
	},
	
	/**
	 * Set left of element. If x is negative and a number, right is set instead. If x is undefined or false, nothing changes.
	 * If parameter is number, 'px' is appended to it. If undefined/false paramete, nothing changes.
	 * @param int x
	 * @return CDE <this>
	 */
	x: function(x){ // left
		if (typeof(x) == 'number' && x < 0) return this.r(-x);
		if (typeof(x) != 'undefined' && x !== false) this.css('left',x+((typeof x == 'number')?'px':''));
		return this;
	},
	
	/**
	 * Set top of element. If y is negative, bottom is set instead. 
	 * If parameter is number, 'px' is appended to it. If undefined/false paramete, nothing changes.
	 * @param int y
	 * @return CDE <this>
	 */
	y: function(y){ // top
		if (typeof(y) == 'number' && y < 0) return this.b(-y);
		if (typeof(y) != 'undefined' && y !== false) this.css('top',y+((typeof y == 'number')?'px':''));
		return this; 
	},
	
	/**
	 * Set right. If negative, left is set instead. 
	 * If parameter is number, 'px' is appended to it. If undefined/false paramete, nothing changes.
	 * @param mix r
	 * @return CDE <this>
	 */
	r: function(r){ // right
		if (typeof(r) == 'number' && r < 0) return this.x(-r);
		if (typeof(r) != 'undefined' && r !== false) this.css('right',r+((typeof r == 'number')?'px':''));
		return this;
	},
	
	/**
	 * Set bottom. If negative, top is set instead.
	 * If parameter is number, 'px' is appended to it. If undefined/false paramete, nothing changes.
	 * @param mix b If number, 'px' is appended to it
	 * @return CDE <this>
	 */
	b: function(b){ // bottom
		if (typeof(b) == 'number' && b < 0) return this.y(-b);
		if (typeof(b) != 'undefined' && b !== false) this.css('bottom', b+((typeof b == 'number')?'px':''));
		return this;
	}

});

// other css methods

CDE.proto({ <!--
	
	/**
	 * Set the background of this element. Optionally set repeat and position
	 * @param string strUrl Path to image (doh)
	 * @param int strRepeat=repeat
	 * @param int intPosX=0 Sets background-position. If neither x nor y is supplied, they dont change.
	 * @param int intPosY=0 Sets background-position. If neither x nor y is supplied, it doesnt change.
	 * @return this
	 */
	bg: function(strUrl, strRepeat, intPosX, intPosY){ // background-image. no-repeat, repeat-x, repeat-y, repeat
		var obj = {backgroundImage: 'url('+strUrl+')'};
		obj.backgroundRepeat = strRepeat || 'repeat';
		if (arguments.length >= 2) obj.backgroundPosition = (intPosX||0)+'px '+(intPosY||0)+'px';
		return this.css(obj);
	},
	
	/**
	* Set the background-position property. Requires (and updates) both parameters...
	* @param int intPosX
	* @param int intPosY
	* @return CDE <this>
	*/
	bgpos: function(intPosX, intPosY){
		return this.css('backgroundPosition', '-'+(intPosX||0)+'px -'+(intPosY||0)+'px');
	},
	
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
	sprite: function(sprite, x, y){
		return this.bg(sprite, 'no-repeat', -x||0, -y||0);
	},
	
	/**
	 * This function changes a sprite created with CDE.sprite
	 * @param int x Position of target image in sprite
	 * @param int y Position of target image in sprite
	 * @param int tw Dimension of result image (of sprite map)
	 * @param int th Dimension of result image (of sprite map)
	 * @param int ow Dimension of original image (in sprite map)
	 * @param int oh Dimension of original image (in sprite map)
	 * @return CDE
	 */
	spriteTo: function(x, y, tw, th, ow, oh){
		//debug('spriteto('+x+","+y+","+tw+","+th+","+ow+","+oh+")");
		var w,h, dw,dh, img, dom;
		
		// get the current image of the sprite (should only be one)
		dom = this.dom().getElementsByTagName('img')[0];
	
		// get the (by now cached) image to get the width/height (impossible from dom)
		img = new Image();
		img.src = dom.src;
		
		// rest is basically same as in CDE.sprite....
	
		// scale factor
		dw = tw/ow;
		dh = th/oh;
		// new size of entire sprite map
		w = img.width * dw;
		h = img.height * dh;
		// new coordinate location (of the inside image that shows the sprite!)
		x *= dw;
		y *= dh;
		
		//debug("result: "+x+","+y+","+w+","+h);
	
		// change the position and size of the shown image...
		// ~~ is same as Math.round
		CDE(dom).abs(-(~~x)+'px',-(~~y)+'px',~~w,~~h);
	},
	
	/**
	 * Set the background-color for this element
	 * @param string strColor html-color
	 * @return this <CDE>
	 */
	bgc: function(strColor){ // background-color
		return this.css('backgroundColor', strColor);
	},
	
	/**
	 * @depricated in favor of .fwb
	 */
	bold: function(){ // font-weight: bold
		if (window.debug) debug("cde.bold is depricated. Please use cde.fwb");
		return this.css('fontWeight', 'bolder');
	},
	
	/**
	 * @depricated in favor of .fwn
	 */
	unbold: function(){ // font-weight: normal
		if (window.debug) debug("cde.unbold is depricated. Please use cde.fwn");
		return this.css('fontWeight', 'normal');
	},
	
	/**
	 * Set border: 1px solid <strColor>
	 * @param string strColor='black' HTML color
	 * @param int px=1 Width of border
	 * @param string style=solid
	 * @return CDE <this>
	 */
	sb: function(strColor, px, style){ // border: 1px solid
		return this._setBorder('', (px||1), strColor||'black', style||'solid');
	},
	
	/**
	 * Set border bottom. Undefined parameters are skipped. False parameters are defaulted (1,black,sold).
	 * @param mix w=undefined Width
	 * @param string c=undefined Color
	 * @param string s=undefined Style (solid, dotted, etc)
	 * @return CDE <this>
	 */
	bb: function(w, c, s){
		return this._setBorder('Bottom', w, c, s);
	},
	
	/**
	 * Set border left. Undefined parameters are skipped. False parameters are defaulted (1,black,sold).
	 * @param mix w=undefined Width
	 * @param string c=undefined Color
	 * @param string s=undefined Style (solid, dotted, etc)
	 * @return CDE <this>
	 */
	bl: function(w, c, s){
		return this._setBorder('Left', w, c, s);
	},
	
	/**
	 * Set border right. Undefined parameters are skipped. False parameters are defaulted (1,black,sold).
	 * @param mix w=undefined Width
	 * @param string c=undefined Color
	 * @param string s=undefined Style (solid, dotted, etc)
	 * @return CDE <this>
	 */
	br: function(w, c, s){
		return this._setBorder('Right', w, c, s);
	},
	
	/**
	 * Set border top. Undefined parameters are skipped. False parameters are defaulted (1,black,sold).
	 * @param mix w=undefined Width
	 * @param string c=undefined Color
	 * @param string s=undefined Style (solid, dotted, etc)
	 * @return CDE <this>
	 */
	bt: function(w, c, s){
		return this._setBorder('Top', w, c, s);
	},
	
	/**
	 * Set the border on one edge. Undefined parameters are skipped. False parameters are defaulted (1,black,sold).
	 * @param string d Direction (Top, Right, Bottom, Left), first char uppercase
	 * @param int w width
	 * @param string c color
	 * @param string s style (solid, dotted, etc)
	 * @return CDE <this>
	 */
	_setBorder: function(d, w, c, s){
		if (w === false) w = 1;
		if (c === false) c = 'black';
		if (s === false) s = 'solid';
		if (typeof w != 'undefined') this.css('border'+d+'Width', w+(typeof w == 'number'?'px':''));
		if (typeof c != 'undefined') this.css('border'+d+'Color', c);
		if (typeof s != 'undefined') this.css('border'+d+'Style', s);
		return this;
	},
	
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
	b3d: function(strColorTopLeft, strColorBottomRight, px){ // border: 1px solid <color1>, border-right: 1px solid <color2>, border-bottom: 1px solid <color2>
		return this.sb(strColorTopLeft, px).css({borderRight: (px||1)+'px solid '+strColorBottomRight, borderBottom: (px||1)+'px solid '+strColorBottomRight});
	},
	
	/**
	 * Set text color
	 * @param string str The color
	 * @return CDE <this>
	 */
	c: function(str){ // color
		return this.css('color',str);
	},
	
	/**
	 * Set clear: left
	 * @return CDE <this>
	 */
	cl: function(){ // clear: left
		return this.css('clear', 'left');
	},
	
	/**
	 * Set clear: right
	 * @return CDE <this>
	 */
	cr: function(){ // clear: right
		return this.css('clear', 'right');
	},
	
	/**
	 * Set clear: both
	 * @return CDE <this>
	 */
	cb: function(){ // clear: both
		return this.css('clear', 'both');
	},
	
	/**
	 * Set cursor:cross
	 * @return CDE <this>
	 */
	cc: function(){ // cursor:cross
		return this.css('cursor', 'crosshair');
	},
	
	/**
	 * Set cursor:default
	 * @return CDE <this>
	 */
	cd: function(){ // cursor:default
		return this.css('cursor', 'default');
	},
	
	/**
	 * Set cursor:pointer
	 * @return CDE <this>
	 */
	cp: function(){ // cursor:pointer
		return this.css('cursor', 'pointer');
	},
	
	/**
	 * Set cursor:move
	 * @return CDE <this>
	 */
	cm: function(){ // cursor: move
		return this.css('cursor', 'move');
	},
	
	/**
	 * Set display: none
	 * @return CDE <this>
	 */
	dn: function(){ // display: none
		return this.css('display', 'none');
	},
	
	/**
	 * Set display: inline
	 * @return CDE <this>
	 */
	di: function(){ // display: inline
		return this.css('display', 'inline');
	},
	
	/**
	 * Set display: block
	 * @return CDE <this>
	 */
	db: function(){ // display: block
		return this.css('display', 'block');
	},
	
	/**
	 * Float left (ie version is caught and fixed at css())
	 * @return CDE <this>
	 */
	fl: function(){ // float:left
		return this.css('cssFloat', 'left');
	},
	
	/**
	 * Float right (ie version is caught and fixed at css())
	 * @return CDE <this>
	 */
	fr: function(){ // float:right
		return this.css('cssFloat', 'right');
	},
	
	/**
	 * Set font family
	 * @return CDE <this>
	 */
	ff: function(f){ // font-family: f
		return this.css('fontFamily', f);
	},
	
	/**
	 * Set font size in px
	 * @param int px=1
	 * @return CDE <this>
	 */
	fs: function(px){ // font-size
		return this.css('fontSize', (px||1)+'px');
	},
	
	/**
	 * Set text bold
	 * @return CDE <this>
	 */
	fwb: function(){ // font-weight: bold
		return this.css('fontWeight', 'bolder');
	},
	
	/**
	 * The inverse of fwb()
	 * @return CDE <this>
	 */
	fwn: function(){ // font-weight: normal
		return this.css('fontWeight', 'normal');
	},
	
	/**
	 * Create a hover effect by applying the on styles onmouseover and the offstyle onmouseout
	 * @param obj on An objlit containing the styles to assign on mouseover
	 * @param obj off An objlit containing the styles to assign on mouseout
	 * @return cde <this>
	 */
	hover: function(on, off){
		var that = this;
		return CDE.on('mouseover', function(){ that.css(on); }).on('mouseout', function(){ that.css(off); });
	},
	
	/**
	 * Set line-height
	 * @param int px=1 Line-height in px
	 * @return CDE <this>
	 */
	lh: function(px){ // line-height
		return this.css('lineHeight', (px||1)+'px');
	},
	
	/**
	 * Set margin to all sides, in px. If string, px is not appended.
	 * 
	 * @param int|string px
	 * @return CDE <this>
	 */
	m: function(px){ // margin
		return this.css('margin', px+(typeof px == 'number'?'px':''));
	},
	
	/**
	 * Set margin-top
	 * @param int px
	 * @return CDE <this>
	 */
	mt: function(px){ // margin-top
		return this.css('marginTop', px+(typeof px!='string'?'px':''));
	},
	
	/**
	 * Set margin-right
	 * @param int px
	 * @return CDE <this>
	 */
	mr: function(px){ // margin-right
		return this.css('marginRight', px+(typeof px!='string'?'px':''));
	},
	
	/**
	 * Set margin-bottom
	 * @param int px
	 * @return CDE <this>
	 */
	mb: function(px){ // margin-bottom
		return this.css('marginBottom', px+(typeof px!='string'?'px':''));
	},
	
	/**
	 * Set margin-left
	 * @param int px
	 * @return CDE <this>
	 */
	ml: function(px){ // margin-left
		return this.css('marginLeft', px+(typeof px!='string'?'px':''));
	},

	/**
	 * Set min-width
	 * @param int px
	 * @return CDE <this>
	 */
	minw: function(px){ // min-width
		return this.css('minWidth',px+(typeof px=='number'?"px":''));
	},
	
	/**
	 * Set min-height
	 * @param int px
	 * @return CDE <this>
	 */
	minh: function(px){ // min-height
		return this.css('minHeight',px+(typeof px=='number'?"px":''));
	},

	/**
	 * Set max-width
	 * @param int px
	 * @return CDE <this>
	 */
	maxw: function(px){ // max-width
		return this.css('maxWidth',px+(typeof px=='number'?"px":''));
	},

	/**
	 * Set max-height
	 * @param int px
	 * @return CDE <this>
	 */
	maxh: function(px){ // max-height
		return this.css('maxHeight',px+(typeof px=='number'?"px":''));
	},

	/**
	 * Set the opacity of this element. A lot of magic happens at cde.css
	 * @param int value 1 is completely opaque, 0 is completely transparent
	 */
	o: function(value){ // opacity: value
		return this.css('opacity', value);
	},
	
	/**
	 * Set overflow:auto
	 * @return CDE <this>
	 */
	oa: function(){ // overflow: auto
		return this.css('overflow','auto');
	},
	
	/**
	 * Set overflow hidden
	 * @return CDE <this>
	 */
	oh: function(){ // overflow: hidden
		return this.css('overflow', 'hidden');
	},
	
	/**
	 * Set overflow visible
	 * @return CDE <this>
	 */
	ov: function(){ // overflow: visible
		return this.css('overflow', 'visible');
	},
	
	/**
	 * Set padding to all sides, in px. If string, px is not appended.
	 * 
	 * @param int|string px
	 * @return CDE <this>
	 */
	p: function(px){ // padding
		return this.css('padding', px+(typeof px == 'number'?'px':''));
	},
	
	/**
	 * Set padding-top
	 * @param int px
	 * @return CDE <this>
	 */
	pt: function(px){ // padding-top
		return this.css('paddingTop', px+(typeof px!='string'?'px':''));
	},
	
	/**
	 * Set padding-right
	 * @param int px
	 * @return CDE <this>
	 */
	pr: function(px){ // padding-right
		return this.css('paddingRight', px+(typeof px!='string'?'px':''));
	},
	
	/**
	 * Set padding-bottom
	 * @param int px
	 * @return CDE <this>
	 */
	pb: function(px){ // padding-bottom
		return this.css('paddingBottom', px+(typeof px!='string'?'px':''));
	},
	
	/**
	 * Set padding-left
	 * @param int px
	 * @return CDE <this>
	 */
	pl: function(px){ // padding-left
		return this.css('paddingLeft', px+(typeof px!='string'?'px':''));
	},
	
	/**
	 * Causes a strike through-ed text effect. Replaces the current text-decoration (for now).
	 * @todo Make it add this setting, rather than replace the current setting.
	 * @see tdn
	 * @return CDE <this>
	 */
	strike: function(){ // text-decoration: line-through
		return this.css('textDecoration', 'line-through');
	},
	
	/**
	 * Set text-align: center
	 * @return CDE <this>
	 */
	tac: function(){ // text-align: center
		return this.css('textAlign', 'center');
	},
	
	/**
	 * Set text-align: left
	 * @return CDE <this>
	 */
	tal: function(){ // text-align: left
		return this.css('textAlign', 'left');
	},
	
	/**
	 * Set text-align: right
	 * @return CDE <this>
	 */
	tar: function(){ // text-align: right
		return this.css('textAlign', 'right');
	},
	
	/**
	 * Set text-align: justify
	 * @return CDE <this>
	 */
	taj: function(){ // text-align: justify
		return this.css('textAlign', 'justify');
	},
	
	/**
	 * Set text-decoration to none
	 * @return cde <this>
	 */
	tdn: function(){ // text-decoration: none;
		return this.css('textDecoration','none');
	},
	
	/**
	 * Set visibility to hidden
	 * @return CDE <this>
	 */
	vh: function(){ // visibility: hidden
		return this.css('visibility', 'hidden');
	},
	
	/**
	 * Set visibility to visible
	 * @return CDE <this>
	 */
	vv: function(){ // visibility: visible
		return this.css('visibility', 'visible');
	},
	
	/**
	 * Set vertical align to middle
	 * @return CDE <this>
	 */
	vam: function(){ // vertical-align: middle
		return this.css('verticalAlign', 'middle');
	},
	
	/**
	 * Set white-space to normal
	 * @return cde <this>
	 */
	wsn: function(){ // default
		return this.css('whiteSpace', 'normal');
	},
	
	/**
	 * Set white-space to nowrap
	 * @return cde <this>
	 */
	wsnw: function(){ // white-space: nowrap (pre without ws)
		return this.css('whiteSpace', 'nowrap');
	},
	
	/**
	 * Set white-space to pre
	 * @return cde <this>
	 */
	wsp: function(){ // white-space: pre (<pre>)
		return this.css('whiteSpace', 'pre');
	},
	
	/**
	 * Set white-space to pre-line
	 * @return cde <this>
	 */
	wspl: function(){ // white-space: pre-line (also break on \n)
		return this.css('whiteSpace', 'pre-line');
	},
	
	/**
	 * Set white-space to pre-wrap
	 * @return cde <this>
	 */
	wspw: function(){ // pre with wrapping
		return this.css('whiteSpace', 'pre-wrap');
	},
	
	/**
	 * Set z-index
	 * @param int z
	 * @return CDE <this>
	 */
	z: function(z){ // z-index 
		return this.css('zIndex', z);
	}

});
CDE.extend({ <!--

	/**
	 * Add div to clear left floating elements
	 * @return CDE
	 */
	clearLeft: function(){
		return CDE.div().cl();
	},

	/**
	 * Add div to clear right floating elements
	 * @return CDE
	 */
	clearRight: function(){
		return CDE.div().cr();
	},

	/**
	 * Add div to clear floating elements on both sides
	 * @return CDE
	 */
	clearBoth: function(){
		return CDE.div().cb();
	}

});

// added cde.ff for font-family
// changed sb to accept a style and make use of the internal cde._setBorder method

// #### Aux ####
// ###################################
// #        Auxiliary methods        #
// ###################################

CDE.extend({ <!--
	
	/**
	 * Return an object literal with the width and height of the document 
	 * (not the window, not the browser, not the viewport but the entire 
	 * document including the parts hidden by scrollbars)
	 * @see http://unixpapa.com/js/mouse.html for some 
	 *
	 * @return {w:int, h:int}
	 */
	docSize: function(){
		return {
			w: document.documentElement.scrollWidth,
			h: document.documentElement.scrollHeight
		};
	},
	
	/**
	 * Return the size of the viewport (the actual content area of the browser, not hidden by scrollbars).
	 * See CDE.docSize for total area of content area
	 * Untested in IE6
	 * @return {w:int, h:int}
	 */
	viewportSize: function(){
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
	},
	
	/**
	 * Get the scroll position of the browser
	 * @return {x:int,y:int}
	 */
	scrollPos: function(){
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
	},
	
	/**
	 * Disable the page.
	 * Puts a black semi-transparent div over the entire document.
	 * The div catches all the events effectively rendering the
	 * page disabled. In IE6 you'll need to hide any comboboxes...
	 * Note that this will not work well with other (semi)transparent
	 * content in the page, as well as flash-objects (which is a
	 * particular impossible problem in fx, you can fix it in ie by
	 * setting the wmode of the flash object to transparent).
	 * @depen cde.z, cde.bgc, cde.id, cde.abs, cde.o, cde.dba, cde.ease, CDE.docSize
	 * @param string id=false The id for the element
	 * @param int trans=0.5
	 * @param int z=1000 z-index for div (in case you use z-indexes beyond 1000 or need to put the div between certain z-indices)
	 * @return CDE (the div)
	 */
	disablePage: function(id, trans, z){
		var size = CDE.docSize();
		//return CDE.div().css({zIndex:z||1000,backgroundColor:'black',position:'absolute',left:0,top:0,width:size.w+'px',height:size.h+'px',opacity:trans||0.5}).atr('id',id);
		return CDE.div().z(z||1000).bgc('black').id(id).abs(0,0,size.w,size.h).o(0).dba().ease({opacity: trans||0.5});
	},
	
	/**
	 * Show a popup, centered on screen.
	 * You probably want to specify a max width or height in objPopupStyles...
	 * The styles, optional, are applied after the default styles, so you can override anything with them.
	 * The function returns a function to control the popup, like recentering it in case some dimension change...
	 *
	 * @depen CDE.CSS, CDE.center
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
	 *       bool boolNoButtons: do not use any of the buttons (also hides the cross!). You are responsible for getting rid of the popup using the callbacks...
	 *       bool boolNoCancel: do not show the cancel button (if you want certain behavior by the ok button)
	 *       bool boolNoFocus: do not set focus to ok or cancel link (cancel is set by default, unless it doesn't exist or is overridden, in which case the ok link is focussed)
	 *       function funcAfterFade: Called after the panel has faded out after clicking hte ok or cancel button (to cleanup visual stuff)
	 * @return obj {reposition:func,hideButtons:func,showButtons:func,ok:func,cancel:func,show:func,hide:func,cde:cdePopup} Control functions for the popup
	 */
	popup: function(strTitle, content, funcOk, options) { // funcCancel, funcAfterFade, boolNoButtons, boolNoCancel, strOk, strCancel, objPopupStyles, objHeadStyles, objBodyStyles, boolNoDisable, boolNoFocus, boolFocusOk
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
		if (typeof content == 'string') content = CDE.html(content);
		else content = CDE(content);
	
		// only add cancel option if either callback is given and it should not be hidden in the first place
		// when true, the cross gets the innerCancel callback, else it's tied to the innerOk callback
		boolCancelButton = !!(!options.boolNoButtons && !options.boolNoCancel && (funcOk || options.funcCancel));
	
		// create a div and add content
		// get the dimensions and position it centered, depending on this position
		// to get the position, the element needs to be displayed, but right now
		// we dont know yet where because we need the dimensions first. this is a
		// vicious loop we break by first adding the div invisibly. then we get
		// it's dimensions, reposition it and fade it in. Ain't it great? ;)
		cdePopup = CDE.div().cd().z(1001).abs(0, 0).o(0).css(options.objPopupStyles).add(
			CDE.div().p(2).bgc('blue').c('white').css(options.objHeadStyles).rel().add(
				CDE.div().wh(100, 1), // artificially force a minimum width
				(!options.boolNoButtons?
					CDE.lnk('X', boolCancelButton ? funcs.cancel : funcs.ok).abs().r(5).ns() // should cancel, unless cancel button is not shown, use ok in that case
				:null),
				CDE.html(strTitle||'')
			),
			CDE.div().br(1,'black').bb(1,'black','solid').p(3).bgc('white').css(options.objBodyStyles).rel().add(
				content,
				cdeButtons = CDE.div().cb().add(
					(!options.boolNoButtons?[
						cdeOk = CDE.lnk(options.strOk||'Ok', funcs.ok).c('blue'),
						(boolCancelButton?[
							CDE.html('&nbsp;&nbsp;'),
							cdeCancel = CDE.lnk(options.strCancel||'Cancel', funcs.cancel).c('blue')
						]:null)
					]:null)
				)
			)
		).dba(); // add to body to force browser to compute dimensions (still hidden at this point)
		
		// focus the cancel link, unless specified otherwise or it doesnt exist
		if (!options.boolNoFocus && boolCancelButton && !options.boolFocusOk) cdeCancel.focus();
		// cancel was not focussed, focus ok, unless not focussing at all
		else if (!options.boolNoFocus && !options.boolNoButtons) cdeOk.focus();
		
		funcs.hideButtons = function(boolFade){
			if (!options.boolNoButtons) {
				if (boolFade) cdeButtons.fadeOut();
				else cdeButtons.dn();
			}
		};
		funcs.showButtons = function(boolFade){
			if (!options.boolNoButtons) {
				if (boolFade) cdeButtons.fadeIn();
				else cdeButtons.o(1).db();
			}
		};
		funcs.show = function(){ cdePopup.fadeIn(); };
		funcs.hide = function(){ cdePopup.fadeOut(); };
		funcs.cde = cdePopup;
		
		// now center the popup
		funcs.center();
		// and show
		funcs.show();
		
		// return the controller for this popup
		return funcs;
	},
	
	/**
	 * Replace &<> by their html-entity equals
	 * @param string s
	 * @return string
	 */
	escapeHtml: function(s){
		if (typeof s == 'undefined') s = '';
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	},
	
	/**
	 * Replaces all % by %25 en all & by %26
	 * @param string s
	 * @return string
	 */
	escapeUrl: function(s){
		if (typeof s !== 'string') return s;
		return s.replace(/%/g,'%25').replace(/&/g, '%26');
	},

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
	parseTimestamp: function(strStamp, boolToSeconds, intHint1, intHint2, intHint3, intHint4){
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
			return false;
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
	},

	/**
	 * Parse a "Y-m-d H:i:s" timestamp
	 * @param string stamp
	 * @param bool boolToSeconds=false Return the timestamp in unix seconds
	 * @return Date
	 */
	parseTimeYdmHis: function(stamp, boolToSeconds) { // 2009-09-02 07:35:00[p] (allows for single digit numbers except for the year, needs four, can have p appended to it for pm)
		var match, regex, date;
		
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
	},

	/**
	 * Parse an XML timestamp
	 * 
	 * @param string stamp 2009-09-02T07:35:00+00:00
	 * @param bool boolToSeconds=false Return the timestamp in unix seconds
	 * @return Date
	 */
	parseTimeRfc3999: function(stamp, boolToSeconds) { // 2009-09-02T07:35:00+00:00
		var date, tz, regex, match;
		
		// extract ydmhis and timezone
		regex = /(\d{4}-\d{2}-\d{2}[ T]{1}\d{2}:\d{2}:\d{2})(.*)/;
		match = regex.exec(stamp);
		
		// dont accept crap
		if (!match) throw {message:"CDE.parseTimeRfc3999 was unable to parse stamp ["+stamp+"]"};
	
		// parse ydmhis (remove the T!)
		date = CDE.parseTimeYdmHis(match[1].replace(/T/,' '));
	
		// adjust for timezone (timezone can be +xx:xx, -xx:xx and Z)
		if (tz = parseInt(match[2], 10)) date.setTime(date.getTime()+(tz*60*60*1000));
		
		if (boolToSeconds) return date.getTime()/1000;
		return date;
	},

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
	parseTimeLoose: function(stamp, boolToSeconds, boolSkip3999) {
		var regex, match, date;
		if (!stamp || stamp == '') return 0;
		try {
			date = CDE.parseTimeRfc3999(stamp);
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
	},

	/**
	 * Convert a Date object to a YdmHis timestamp
	 * @param Date|int date If number, unix timestamp is assumed and converted to Date
	 * @param bool boolNoDate=false
	 * @param bool boolNoTime=false
	 * @return string
	 */
	toYdmHis: function(dt, boolNoDate, boolNoTime){
		var date='', time='';
		// normalize
		if (typeof dt == 'number') dt = new Date(dt*1000);
		// create date, with padded 0's
		if (!boolNoDate) date = dt.getFullYear()+'-'+(dt.getMonth()<9?'0':'')+(dt.getMonth()+1)+'-'+(dt.getDate()<10?'0':'')+dt.getDate();
		// create time, with padded 0's
		if (!boolNoTime) time = (dt.getHours()<10?'0':'')+dt.getHours()+':'+(dt.getMinutes()<10?'0':'')+dt.getMinutes()+':'+(dt.getSeconds()<10?'0':'')+dt.getSeconds();
		// return the combination, with a space in between. if either part was not requested, the space will be removed by trim.
		return CDE.trim(date+' '+time);
	},

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
	now: function(sec, min, hour, day, week, month, year){
		var t = ~~((new Date()).getTime()/1000);
		if (arguments.length == 0) return t; // shortcut :)
		t += (parseInt(sec, 10)||0);
		t += ((parseInt(min, 10)||0)*60);
		t += ((parseInt(hour, 10)||0)*3600); // 60*60
		t += ((parseInt(day, 10)||0)*86400); // 24*60*60
		t += ((parseInt(week, 10)||0)*604800); // 7*24*60*60
		t += ((parseInt(month, 10)||0)*2592000); // 30*24*60*60
		t += ((parseInt(year, 10)||0)*31536000); // 365*24*60*60
		return t;
	},

	/**
	 * Cache an object from the internets using Image
	 */
	preload: function(url){
		// the timeout causes asynchronous responses. otherwise the code might still wait for it to load)
		setTimeout(function(){ (new Image()).src = url; },1);
	},

	/**
	 * Trim whitespace of a string
	 * @param string
	 * @return string
	 */
	trim: function(str){
		// ES5
		if (String.trim) return str.trim();
		// non-ES5 :)
		return str.replace(/^\s+|\s+$/g,'');
	}

});

// Dropped optional argument for CDE.toYdmHis to indicate the first parameter is a Unix timestamp. It is assumed to be so when the first parameter is of number type.
// Added boolNoButtons to popup options

// #### Debug ####
// debug control
(function(){

var debugId = '_dbg_';
var debugUp = false;
var debugInitializing = false;
var cdeDebug;
var cdeRebug;
var cdeOutput;

/**
 * Allow to select elements with your mouse and save them in CDE._lastTarget
 */
var fPos = function(){
	setTimeout(function(){ // event bubbles, so this event will still reach body, eventually. the settimeout prevents that this function fires immediately
		var f1,f2,lastWrap,lastTarget;
		f1 = CDE(document.body).on('click', f1=function(evt){
			CDE._lastTarget = CDE(evt.sourceElement||evt.target);
			debug("Selected item saved in CDE._lastTarget");
			CDE(document.body).un('click',f1).un('mousemove',f2);
			if (lastWrap && lastTarget) lastWrap.replace(CDE(lastTarget));
			lastWrap = lastTarget = f1 = f2 = null;
		}, false, true);
		f2 = CDE(document.body).on('mousemove', f2 = function(evt){
			var s = evt.sourceElement||evt.target;
			if (CDE(s).id() == 'CDE_border_wrapper') return; // wrapper, ignore (will cause error otherwise)
			if (lastWrap == s) return; // same element, ignore (redundant step)
			if (lastWrap) lastWrap.replace(CDE(lastTarget));
			lastTarget = evt.sourceElement||evt.target;
			lastWrap = CDE.span().sb('red').ins(lastTarget).add(lastTarget).id('CDE_border_wrapper');
		},false,true);
	},10); // let event bubble up
};
/**
 * When typing in the debug input field
 * @param evt Event
 * @param key int Fired the event
 */
var fInUp = function(evt,key){
	switch (key) {
		case CDE.KEY_RETURN:
			try { debug(eval(inp.val()));
			} catch(e){ debug("<span style='color: red;'>Error: "+e.message+"</span>"); }
			return CDE.stopEvent(evt);
	}
};
/**
 * When typing in the debug input field
 * @param evt Event
 * @param key int Fired the event
 */
var fInDown = function(evt,key){
	switch (key) {
		case CDE.KEY_TAB:
			if (!this.value) return CDE.stopEvent(evt);
			if (this.value.indexOf('.') != -1) {
				// get the last dot
				var pos = this.value.lastIndexOf('.');
				var x = this.value.substring(0, pos);
				var y = this.value.substr(pos+1);
				// allow global spaced dot
				if (this.value[0] == '.') {
					x = 'window'+x;
					pos += 6;
				}
					
				if (/^[a-zA-Z0-9$_]+$/.test(y) || pos > 0) {
					try { x = eval('('+x+');'); } catch(e){ debug(x+" causes an error..."); }
					if (x) {
						var s = [];
						for (var key in x) {
							if (x.hasOwnProperty(key) && ((y.length && key.indexOf(y) === 0)) || (y.length == 0 && pos > 0)) {
								s[s.length] = key;
							}
						}
						s.sort(function(a,b){return a.toLowerCase() > b.toLowerCase();});
						if (s.length) debug(s.join(' '));
						else debug("<i>(No matches...)</i>");
					} else {
						debug(x+" returned nothing");
					}
				}
			}
			return CDE.stopEvent(evt);
	}
};


/**
 * Create the debug element and show it.
 * @param bool boolShow=false Show the debug immediately (debugs the empty string)
 * @param bool dontForce=false If debug element not found, dont show it (used by debug/rebug below)
 * @return boolean Whether debug was created or not
 */
CDE.debugUp = function(boolShow, dontForce){
	if (debugUp) return; // dont create twice
	debugInitializing = true;
	// create the debug bar element if it is not part of the markup
	cdeDebug = CDE(debugId);
	if (!cdeDebug) {
		if (!dontForce) cdeDebug = CDE.div().id(debugId).dba();
		else {
			return false;
			debugInitializing = false;
		}
	}
	// create debug window
	cdeDebug.abs(-5,5,300).minh(50).maxh('100%').oa().bgc('white').c('black').sb('black',2).z(99999).add(
		CDE.div().id('CDE_menu').bb().add(
			CDE.span().fr().id('CDE_cache').fs(10).c('black').gc(),
			CDE.html('Debug | ').id('CDE_first').c('black').gc(),
			CDE.html('Clear').id('CDE_clear').cp().c('black').on('click', function(){ cdeOutput.html(''); }),
			CDE.html(' | ').id('CDE_second').c('black').gc(),
			CDE.html('Close').id('CDE_close').cp().c('black').on('click', function(){ cdeDebug.del(); cdeOutput = cdeDebug = null; }),
			CDE.html(' | ').id('CDE_third').c('black').gc(),
			CDE.html('Hide').id('CDE_hide').cp().c('black').on('click', function(){ cdeDebug.dn(); }),
			CDE.html(' | ').id('CDE_fourth').c('black').gc(),
			CDE.html('Cache').id('CDE_cache').cp().c('black').on('click', function(){ CDE.debug('cache', true); }),
			CDE.html(' | ').id('CDE_fifth').c('black').gc(),
			CDE.html('C').id('CDE_cache').cp().c('black').on('click', function(){ debug(document.compatMode); }),
			CDE.html(' | ').id('CDE_sixth').c('black').gc(),
			CDE.html('Pos').id('CDE_pos').cp().c('black').on('click', fPos)
		).gc(),
		cdeRebug = CDE.div().wsp(),
		CDE.div().add(inp = CDE.inp('text').w(290).ml(3).mt(2).on('keyup', fInUp, 'keyboard').on('keydown', fInDown,'keyboard')),
		cdeOutput = CDE.div().id('CDE_body').p(2).c('black').fs(10)
	);
		
	// no need to cache most of these
	CDE.gc();

	debugUp = true;
	debugInitializing = false;
	return true;
};

/**
 * This will be window.debug if debug was not created
 * @param str mixed
 * @return str
 */
var doNothing = function(str){return str;};
/**
 * This function will be the window.debug after initialization
 * @param str mixed
 * @return str
 */
var innerDebug = function(s){
	// in case the user clicked close or the panel was never created
	if (!cdeOutput) window.debug = doNothing;
	else {
		// just add the string (dont use innerHTML, this is much much faster)
		CDE.div(Array.prototype.slice.call(arguments).join(', ')).id("debugtext"+Math.random()).addTo(cdeOutput).uncache();
		// show debug in case it was hidden
		cdeDebug.db();
	}
	return s;
};

/**
 * Output something replacing the previous output by this function (like mouse coordinates)
 * @param mixed s
 * @return s
 */
window.rebug = function(s){
	if (!debugUp && debugInitializing) return s;
	else if (!debugUp && !CDE.debugUp(false,true)) window.rebug = doNothing;
	else if (!cdeOutput) window.rebug = doNothing;
	else cdeRebug.html(Array.prototype.slice.call(arguments).join(', '));
	return s;
};

var preDebugCache = [];
/**
 * Debug s to the debug panel. Note that the initial value of window.debug will
 * be replaced by innerDebug after initialization.
 * @param mixed s
 * @return s
 */
window.debug = function(s){
	// I need this part when debugging the debugging mechanism
	// the input will be printed after the debug function completes...
	if (debugInitializing) {
		preDebugCache.push(Array.prototype.slice.call(arguments).join(', '));
		return s;
	}

	// create the debug panel
	CDE.debugUp(false,true);

	// replace this function by a faster function
	window.debug = innerDebug;

	// call the new debug
	return window.debug(s);
};

})();

// fixed small bug causing error messages when typing in the debug textfield
// added ability to tab in the textfield, causing you to see all possible completions for whatever you're typing...
// rewrote entire debug mechanism
// changed window.debug(str,br,encode) to simply debug any arguments (so its no longer possible to not break or encode through parameters)
// added rebug, which allows you to debug a string and replace the previous string (added by rebug) if any, preventing a large dom for fast changing variables (like mouse coordinates)

