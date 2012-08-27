// http://math.rice.edu/~lanius/frac/code.html
(function(){
var r = 0;

// prevent start after restarting browser
//if (!confirm("start?")) throw ("no");

// -5 to prevent scrollbars
var vpw = CDE.viewportSize().w-5;
var vph = CDE.viewportSize().h-5;

var canvas = window.canvas = CDE.dom('canvas').wh(vpw, vph).dba().dom();

canvas.width = vpw;
canvas.height = vph;

CDE.div('<a href="http://en.wikipedia.org/wiki/Dragon_curve" target="_blank">Dragon / Jurassic Park fractal</a> (half ;) by Peter van der Zee, June 2010. See blog post <a href="http://qfox.nl/notes/105" target="_blank">here</a>.').id('msg').dba();
var toglnk = CDE.lnk('', function(){ toggle(); }).id('toglnk').dba();

var distance = 1; // line length
var step = 200; // paints per step
var skip = 10; // folds per paint

// positional cache (closed by draw)
var x = vpw-350;
var y = vph-750;
var a = 90;
x = vpw/2;
y = vph/2;

var tctx = canvas.getContext('2d');
tctx.strokeStyle = 'red'; // use red color
tctx.fillStyle = 'black';
tctx.fillRect(0,0,vpw,vph); // clear

/**
 * Actually draw the next few folds. Draws paths on canvas.
 * @param s string String of zeros and ones.
 */
var draw = function(s){
	var ctx = tctx;

	var resized = true; // force resize on first iteration

	var c = parseInt(position.slice().reverse().join(''),8);
	var d = CDE.rgb((c>>>8)&255, (c>>>16)&255, c&255);
	ctx.strokeStyle = d;

	// we are going to create a path
	ctx.beginPath();
	// set xy now, because it will change
	ctx.moveTo(x, y);
	for (var i=0, n=s.length; i<n; ++i) {

		// first iteration or window resized (in that case path was closed)
		if (resized) {
			// we are going to create a path
			ctx.beginPath();
			// set xy now, because it will change
			ctx.moveTo(x, y);
		}

		// next direction
		if (+s[i]) a = (a+90)%360||360; // Right
		else a = (a-90||360); // Left
		// new target
		if (a==0 || a==360) y -= distance;
		else if (a==90) x += distance;
		else if (a==180) y += distance;
		else if (a==270) x -= distance;

		// if a fold would exceed bounds, the viewport is zoomed 5% in that direction here
		resized = copyAndMove();
		// move
		ctx.lineTo(x, y);
	}
	// resize will close path
	if (!resized) {
		ctx.stroke();
		ctx.closePath();
	}
};

// closed variables for getNext
var pattern = [1,1,0,2,1,0,0,3];
var position = [0];
var toggle = [0];
/**
 * Step generator. Will produce the next step from the current state.
 * @param n int Always supply 0, used internally for recursion
 * @return '0'|'1'
 */
var getNext = function(n) {
	if (position[n] == 7) {
		var r = getNext(n+1);
		position[n] = 0;
	} else {
		switch (pattern[position[n]||0]) {
			case 0:
				var r = '0';
				break;
			case 1:
				var r = '1';
				break;
			case 2:
				if (!toggle[n]) var r = '1';
				else var r = '0';
				toggle[n] = !toggle[n];
				break;
			default:
				debug('impossible');
		}
		position[n] = (position[n]+1)||1; // if undefined, undefined+1=NaN, so ||1 will still produce 1 :)
	}
	return r;
}

/**
 * Get n next steps from generator
 * @param n int
 */
var getS = function(n){
	var s = '';
	while (n--) s += getNext(0);
	return s;
};

/**
 * Zoom when the coordinate will be out of bounds.
 * Will copy and replace the current canvas. This
 * canvas will be copied scaled onto the new canvas.
 */
var copyAndMove = function(){
	var count = 0;
	var moved = false;
	while (x < 0 || x > vpw || y < 0 || y > vph) {
		// we need to close the path because we are changing the dimensions...
		if (!moved) {
			var ctx = canvas.getContext('2d');
			ctx.stroke();
			ctx.closePath();
		}

		var dsW = vpw * 0.05;
		var dsH = vph * 0.05;

		var targetX = 0;
		var targetY = 0;

		if (x < 0) {
			// give enough space horizontally left
			targetX = dsW;
			x = dsW + (x*0.95);
			// center vertically, with added space
			targetY = dsH/2;
			y = targetY + (y*0.95);
		} else if (y < 0) {
			targetY = dsH;
			y = dsH + (y*0.95);
			targetX = dsW/2;
			x = targetX + (x*0.95);
		} else if (x > vpw) {
			x *= 0.95;
			targetY = dsH/2;
			y = targetY + (y*0.95);
		} else {
			y *= 0.95;
			targetX = dsW/2;
			x = targetX + (x*0.95);
		}

		distance *= 0.95;

		var canvas2 = window.canvas = CDE.dom('canvas').wh(vpw, vph).dba().dom();
		canvas2.width = vpw;
		canvas2.height = vph;

		tctx = canvas2.getContext('2d');
		tctx.fillStyle = 'black';
		tctx.fillRect(0,0,vpw,vph);
		tctx.strokeStyle = 'red'; // use red color
		tctx.lineWidth = distance;
		tctx.drawImage(canvas, targetX, targetY, vpw*0.95, vph*0.95);
		CDE(canvas).del();
		canvas = canvas2;
	}

	return moved;
};

var t; // timer cache
var start = function(){
	setInterval(function(){
		if (t) return;

		var n = step;
		while (--n) {
			var s = getS(skip);
			draw(s);
		}
		if (position.length == 20) clearInterval(t);

		var c = parseInt(position.join(''),8)%(256*256*256);
		var d = CDE.rgb((c>>>16)&255, (c>>>8)&255, c&255);
	}, 1);
};
var stop = function(){
	clearInterval(t);
	t=0;
};
var toggle = function(){
	if (t) {
		stop();
		toglnk.html('Click here to continue');
	} else {
		start();
		toglnk.html('Click here to stop');
	}
};

// go
toggle();

})();
