CDE.div().id('_dbg_').dba();
debug("");

(function(){

var intMinZ = 1, intMaxZ = 5, intMaxMove = 50, dblScale = 2, cdeContainer, cdeStage, cdeEvents, arrActor, objStage;

/**
 * horizon is at intMinZ, it doesnt change when you move
 * maximum movement at the front is intMaxMove
 * max movement for each z-level is intMaxMove / (intMaxZ - intMinZ)
 * an item at the front is dblScale as large as an item in the back
*/
var Stage = function(intMinZ, intMaxZ, intMaxMove, dblScale){
	this.intMinZ = intMinZ;
	this.intMaxZ = intMaxZ;
	this.intMaxMove = intMaxMove;
	this.dblScale = dblScale;
	this.intPositions = (intMaxZ-intMinZ);
	this.dblScalePerZ = ((this.dblScale-1)/(intMaxZ-intMinZ));
	this.dblStepMove = (intMaxMove/this.intPositions);
	
	debug("Back Z: "+intMinZ);
	debug("Front Z: "+intMaxZ);
	debug("Possible Z positions: "+this.intPositions);
	
	debug("Back scale: 1");
	debug("Front scale: "+this.dblScale);
	debug("Scale per Z: "+this.dblScalePerZ);
	
	debug("Back max move: "+intMaxMove);
	debug("Max move step: "+this.dblStepMove);
	debug("");
};
Stage.prototype.normalize = function(intWidth, intHeight, z){
	debug("normalize("+intWidth+","+intHeight+","+z+")");
	// assume front
	// is the current z same as front?
	if (z == this.intMaxZ) return [intWidth,intHeight];
	// difference in z-level between back and z
	var diff = z-this.intMinZ;
	debug("z diff:"+diff);
	// scale factor is 1 (back) + diff*scaleperz
	var scale = 1+(diff*this.dblScalePerZ);
	debug("scale:"+scale);
	
	// move is number of z's between back and z (including back, so +1) * move per step
	var move = ((z-this.intMinZ+1) * this.dblStepMove);
	debug("max move: "+move);
	
	// return this
	return [intWidth*scale, intHeight*scale, move];
};
Stage.prototype.maxMove = function(z){
	// max movement for given z?
	// move is number of z's between back and z (including back, so +1) * move per step
	var move = ((z-this.intMinZ+1) * this.dblStepMove);
	//debug("max move: "+move);
	return move;
};

var Actor = function(x, y, width, height, z, c){
	// initial properties
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.z = z;
	this.c = c;
	// normalized to back
	this.nWidth = (dblScale/(intMaxZ-intMinZ))*(intMaxZ-z);
};
Actor.prototype.get = function(){
	if (!this.cde) this.cde = this.create();
	return this.cde;
};
Actor.prototype.create = function(){
	return CDE.div().css('actor').abs(this.x,this.y,this.width,this.height).bgc(this.c).z(this.z);
};
Actor.prototype.lax = function(x, y){
	//debug("lax("+x+","+y+")");
	// move the actor to the given percentage of
	// its max movement to either direction. when
	// negative, it should go left/up. otherwise
	// right/down. should think of a better name.
	
	// max move for this z level (any direction)
	var dblMaxMove = objStage.maxMove(this.z);
	// max move we want based on args
	var mx = dblMaxMove*x;
	var my = dblMaxMove*y;
	
	var tx = this.x+~~mx;
	var ty = this.y+~~my;
	
	//if (this.z == 2) debug(this.z+" : "+this.x+"+"+~~mx+" = "+tx+", "+this.y+"+"+~~my+" = "+ty);
	// reposition this element based on its anchor
	this.get().xy(this.x+~~mx+"px", this.y+~~my+"px");
	
	
};

objStage = new Stage(1, 5, 100, 2.0);

var x = objStage.normalize(100,100,3);
debug(x);

// we start with zero actors
arrActor = [];

arrActor[arrActor.length] = new Actor(175,75,50,50,1,'yellow');
arrActor[arrActor.length] = new Actor(175,75,50,50,2,'red');
arrActor[arrActor.length] = new Actor(175,75,50,50,3,'blue');
arrActor[arrActor.length] = new Actor(175,75,50,50,4,'green');
arrActor[arrActor.length] = new Actor(175,75,50,50,5,'purple');

cdeContainer = CDE.div().z(intMaxZ).abs(50,50,400,200).sb('black').bgc('#ccc').add(
	cdeStage = CDE.div().css('stage').abs(0,0,'100%','100%').z(intMinZ).add(
		arrActor[0].get(),
		arrActor[1].get(),
		arrActor[2].get(),
		arrActor[3].get(),
		arrActor[4].get()
	),
	cdeEvent = CDE.div().css('event').abs(0,0,'100%','100%').z(intMaxZ+1)
).dba().center();


var vp = CDE.viewportSize();
CDE.div().abs(0,0,'100%','100%').z(objStage.intMaxZ+1).dba().on('mousemove', function(_,x,y){
	var a,b,i,actor;
	
	a = vp.w/2;
	b = vp.h/2;
	
	// to percentage (negative for top/left)
	if (x > a) x = (x-a)/a;
	else x = -(a-x)/a
	if (y > b) y = (y-b)/b;
	else y = -(b-y)/b
	
	CDE.wrap('coord').txt((x*100).toFixed(1)+"%,"+(y*100).toFixed(1)+"%");
	
	for (i=0; i<arrActor.length; ++i) {
		actor = arrActor[i];
		//objStage.maxMove();
		actor.lax(x,y);
	}
	
	
}, 'element');

/*
CDE.btn('in', function(){
	
}).mr(5).dba();
CDE.btn('out', function(){
	
}).mr(5).dba();
*/
CDE.btn('--').id('coord').dba();
	
	
})();



