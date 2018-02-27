/*
 * hpgl2Format
 *
 * 2018 (c) yo16
 */

var Instructions = {
//	settings : {'BP':null, 'IN':null, 'LT':null, 'NP':null, 'PS':null, 'RO':null, 'SD':null, 'SS':null, 'PW':null, 'PG':null},
	settings : {'BP':null, 'IN':null, 'LT':null, 'NP':null, 'PS':null, 'RO':null, 'SD':null, 'SS':null,            'PG':null},
//	drawings : {'AA':null, 'CI':null, 'PA':null, 'PD':null, 'PU':null, 'SP':null}
	drawings : {'AA':null, 'CI':null, 'PA':null, 'PD':null, 'PU':null, 'PW':null, 'SP':null}
};
var AutoPDCommandList = {
	"CI":null,"EA":null,"EP":null,"ER":null,"EW":null,
	"FP":null,"LB":null,"PE":null,"RA":null,"RR":null,
	"SM":null,"WG":null
};
var Hpgl2Format = {
	/*
	AA, Arc Absolute
	
	Purpose
		To draw an arc, using absolute coordinates, which starts at the current pen location and pivots
		around the specified center point.
	Syntax
		AA Xcenter,Ycenter,sweep_angle[,chord_angle][;]
	
	p.100
	*/
	AA : function(p, ctx, curState, matrix){
		if( p.length < 3 ){
			console.log("AA Parameter error!");
		}else{
			// 中心
			var posCenter = {
				x : p[0] - 0,
				y : p[1] - 0
			};
			// 回転する角度
			var sweepAngle = p[2] - 0;
			
			// 半径
			var radius = Math.sqrt(Math.pow(curState.curPos.x - posCenter.x, 2)
				+ Math.pow(curState.curPos.y - posCenter.y, 2));
			
			// 画面内にある場合のみ、描画する
			var doWrite = false;
			var lefttopPos = getCanvasPos(
				{x:posCenter.x-radius, y:posCenter.y-radius},
				matrix
			);
			var rightbottomPos = getCanvasPos(
				{x:posCenter.x+radius, y:posCenter.y+radius},
				matrix
			);
			if( isInCanvas( lefttopPos, rightbottomPos, ctx.canvas )){
				doWrite = true;
			}
			
			// 弦角度＝近似円を直線で描く角度
			var chordAngle = 5.0;
			if( p.length > 3 ){
				chordAngle = p[3] - 0;
			}
			
			// 開始位置
			var posStart = {
				x : curState.curPos.x,
				y : curState.curPos.y
			};
			
			// 円上の点を取得
			var aryPoints = getCirclePoints(posCenter, radius, posStart, sweepAngle, chordAngle);
			
			if( doWrite ){
				// 点の分、線を描画
				ctx.beginPath();
				var tmpPos = getCanvasPos(aryPoints[0], matrix);
				ctx.moveTo(tmpPos.x, tmpPos.y);
				for( var i=1; i<aryPoints.length; i++ ){
					// i→i+1
					tmpPos = getCanvasPos(aryPoints[i], matrix);
					ctx.lineTo(tmpPos.x, tmpPos.y);
				}
				ctx.stroke();
			}
			
			// 最後の点の位置にカレント位置を移動する
			curState.curPos.x = aryPoints[aryPoints.length-1].x;
			curState.curPos.y = aryPoints[aryPoints.length-1].y;
		}
	},
	
	/*
	BP,Begin Plot
	Syntax
		BP kind,value...[,kind,value][;]
			or
		BP[;]
	p.113
	
	kind,valueの指定は、不要と判断し、未実装。
	※ kind:
		1:PictureName
		2:Number of copies
		3:File-disposition code
		4:Render last plot if unfinished
		5:Autorotation
	指定があっても無視する。
	*/
	BP : function(p, ctx, curState){
		// 今のところ実装なし
	},
	
	/*
	CI, Circle
	
	Purpose
		To draw the circumference of a circle using the specified radius and chord angle. If you want a
		filled circle, refer to the WG (Fill Wedge) instruction on page 324 or Drawing Circles in Polygon
		Mode on page 52.
	Syntax
		CI radius[,chord_angle][;]
	
	p.123
	
	*/
	CI : function(p, ctx, curState, matrix){
		if( p.length == 0 ){
			console.log("CI no-parameter!");
		}else{
			// 中心
			var posCenter = {
				x : curState.curPos.x - 0,
				y : curState.curPos.y - 0
			};
			// 半径
			var radius = p[0]-0;
			
			// 弦角度＝近似円を直線で描く角度
			var chordAngle = 5.0;
			if( p.length > 1 ){
				chordAngle = p[1] - 0;
			}
			
			// 画面内にある場合のみ、描画する
			var doWrite = false;
			var lefttopPos = getCanvasPos(
				{x:posCenter.x-radius, y:posCenter.y-radius},
				matrix
			);
			var rightbottomPos = getCanvasPos(
				{x:posCenter.x+radius, y:posCenter.y+radius},
				matrix
			);
			if( isInCanvas( lefttopPos, rightbottomPos, ctx.canvas )){
				doWrite = true;
			}
			
			// 現在のplot位置は円の中心なので、そこから開始位置を算出（X方向へ移動するだけ）
			var posStart = {
				x : curState.curPos.x + radius,
				y : curState.curPos.y
			};
			
			// 円上の点を取得
			var aryPoints = getCirclePoints(curState.curPos, radius, posStart, 360, chordAngle);
			
			if( doWrite ){
				// 点の分、線を描画
				ctx.beginPath();
				var tmpPos = getCanvasPos(aryPoints[0], matrix);
				ctx.moveTo(tmpPos.x, tmpPos.y);
				for( var i=1; i<aryPoints.length; i++ ){
					// i→i+1
					tmpPos = getCanvasPos(aryPoints[i], matrix);
					ctx.lineTo(tmpPos.x, tmpPos.y);
				}
				ctx.stroke();
			}
			
			// 最後の点の位置にカレント位置を移動する
			curState.curPos.x = aryPoints[aryPoints.length-1].x;
			curState.curPos.y = aryPoints[aryPoints.length-1].y;
		}
	},
	
	/*
	IN,Initialize
	Syntax
		IN n[;]
			or
		IN [;]
	p.189
	
	nの指定は、不要と判断し、実装。
	※ n:プロッタに設定したセット番号。
	指定があっても無視する。
	*/
	IN : function(p, ctx, curState){
		// 実装なし
	},
	
	/*
	LT, Line Type
	
	Purpose
		To specify the line pattern to be used when drawing lines. Use LT to vary lines and enhance
		your plot. Note that the ends of dashed line segments in a line pattern are affected by current
		line attributes (refer to the LA instruction on page 200).
	Syntax
		LT line_type[,pattern_length[,mode]][;]
			or
		LT [;]
			or
		LT 99 [;]
	
	p.215
	
	線種。E2では、基本実線のみ。
	*/
	LT : function(p, ctx, curState){
		if( p.length > 0 ){
			_curLineType = p[0];
		}
		if( p.length > 1 ){
			_curLineTypePatternLength = p[1] - 0;
		}
		if( p.length > 2 ){
			_curLineTypeMode = p[2];
		}
	},
	
	/*
	NP, Number of Pens

	Purpose
		To establish the size (the number of pens) of the HP-GL/2 palette.
	Syntax
		NP n[;]
			or
		NP [;]
	*/
	NP : function(p, ctx, curState, matrix){
		if( p.length > 0 ){
			if( !("NP" in curState) ){
				curState["NP"] = {};
			}
			
			var n = p[0] - 0;
			if( n % 2 == 0 ){	// Parameter must be a power of two.（２のべき乗のラフチェック）
				curState["NP"]["numberOfPens"] = n;
			}
			
			// PWを初期化しておく
			this.PW([0.25,1], ctx, curState, matrix);
			this.PW([0.35,2], ctx, curState, matrix);
			this.PW([0.5,3], ctx, curState, matrix);
			this.PW([1,4], ctx, curState, matrix);
		}
	},
	
	/*
	PA, Plot Absolute
	
	Purpose
		To establish absolute plotting and moves the pen to the specified absolute coordinates from the
		current pen position.
	Syntax
		PA X,Y [,...][;]
			or
		PA [;]
	*/
	PA : function(p, ctx, curState, matrix, spup){
		if( p.length > 0 ){
//console.log("PA");
			// 高速化因子がある場合は、最大値/最小値を使って、
			// canvas内にあるかどうか判断する。
			// ない場合は、位置だけ移動する。
			var doDraw = true;
			if( spup != null ){
				// 最大/最小値に今の位置も加えて、更新の必要があれば更新する
				if( curState.curPos.x < spup.minx ){
					spup.minx = curState.curPos.x;
				}
				if( curState.curPos.y < spup.miny ){
					spup.miny = curState.curPos.y;
				}
				if( curState.curPos.x > spup.maxx ){
					spup.maxx = curState.curPos.x;
				}
				if( curState.curPos.y > spup.maxy ){
					spup.maxy = curState.curPos.y;
				}
				
				// 今のcanvasの位置座標へ変換
				var minpos = getCanvasPos(
					{x:spup.minx, y:spup.miny},
					matrix
				);
				var maxpos = getCanvasPos(
					{x:spup.maxx, y:spup.maxy},
					matrix
				);
				
				// canvas内にあるかないか判断して
				// ない場合は描画しない
				if( !isInCanvas(minpos, maxpos, ctx.canvas) ){
					doDraw = false;
				}
			}
			
			// penUpの場合は、描画は不要なので、位置だけ移動する
			if( !curState.penDown ){
				doDraw = false;
			}
			
			if( doDraw ){
				// 最初の点
				var initialPos_cvs = getCanvasPos(
					curState.curPos,
					matrix
				);
//console.log("pos0:"+initialPos_cvs.x+","+initialPos_cvs.y);
				
				// 描画
				ctx.beginPath();
//console.log(ctx);
				ctx.moveTo(initialPos_cvs.x, initialPos_cvs.y);
				var prevPos = {x:initialPos_cvs.x, y:initialPos_cvs.y};
				var newPos0 = {x:0, y:0};
				var newPos = {x:0, y:0};
				var doDraw = false;
				for( var i=0; i<p.length; i+=2 )
				{
					newPos0 = {x:p[i]-0, y:p[i+1]-0};
					newPos = getCanvasPos(
						newPos0,
						matrix
					);
					ctx.lineTo(newPos.x, newPos.y);
					prevPos.x = newPos.x;
					prevPos.y = newPos.y;
				}
				ctx.stroke();
				
				curState.curPos.x = newPos0.x;
				curState.curPos.y = newPos0.y;
			}else{
				// 描画しない場合は、位置移動のみ
				ctx.moveTo(p[p.length-2], p[p.length-1]);
				curState.curPos.x = p[p.length-2];
				curState.curPos.y = p[p.length-1];
			}
		}
	},
	
	/*
	PD, Pen Down
	
	Purpose
		To lower the device’s logical pen and draw subsequent graphics instructions.
	
	Syntax
		PD X,Y[,...][;]
		or
		PD [;]	
	*/
	PD : function(p, ctx, curState){
		curState.penDown = true;
	},
	
	/*
	PG, Advance Full Page

	Purpose
		For devices with page advance capability: to terminate the plot being sent, to draw it, and to
		advance the page.
		For devices without page advance capability: If the media has been plotted on, to perform the
		function of the NR (Not Ready) instruction (see page 227).
		On PCL devices with HP-GL/2 capability, this instruction is ignored (see Using PG in a PCL
		Dual-Context Environment below).
	Syntax
		PG n[;]
			or
		PG [;]

	*/
	PG : function(p, ctx, curState){
		// 実装なし
	},
	
	/*
	PS,Plot Size
	Syntax
		PS length[,width][;]
			or
		PS [;]
	p.259
	*/
	PS : function(p, ctx, curState){
		if( p.length > 0 ){
			if( !("PS" in curState) ){
				curState["PS"] = {};
			}
			var l = p[0];
			if( l > 0 ){
				curState["PS"]["length"] = l - 0;
				console.log("  PS.length:"+l);
			}
		}
		if( p.length > 1 ){
			var w = p[1];
			if( w > 0 ){
				curState["PS"]["width"] = w - 0;
				console.log("  PS.width:"+w);
			}
		}
	},
	
	/*
	PU, Pen Up
	
	Purpose
		To move to subsequent points without drawing. Use PU to move to another location without
		drawing a connecting line.
	
	Syntax
		PU X,Y[,...;]
		or
		PU [;]
	*/
	PU : function(p, ctx, curState){
		curState.penDown = false;
	},
	
	/*
	PW, Pen Width
	
	Purpose
		To specify a new width for the logical pen. Subsequent lines are drawn in this new width. Use
		PW to vary your lines and enhance your drawings. Pen width can be specified as a fixed value
		or relative to the distance between P1 and P2. The pen width units are selected using the WU
		instruction (the default is metric—millimeters).
	Syntax
		PW width[,pen][;]
			or
		PW [;]
	
	p.264
	*/
	PW : function(p, ctx, curState){
		// 下記の文章の意味がわからない
		// all pensでなく、both pens??
		// If the pen parameter is not specified, the device applies the width to both pens.
		// とりあえず、allと解釈しておく
//console.log("PW");
//console.log(p);
		var defaultPenWidth = 0.35;
		var penWidth = defaultPenWidth;
		var penNumber = -1;
		if( p.length > 0 ){
			penWidth = p[0]-0;
		}
		if( p.length > 1 ){
			penNumber = p[1];
		}
		
		// ペン数を取得
		var numberOfPens = 0;
		if( "NP" in curState ){
			if( "numberOfPens" in curState["NP"] ){
				numberOfPens = curState["NP"]["numberOfPens"];
			}
		}
//console.log("numberOfPens:"+numberOfPens);
		
		// pen-width配列を定義する
		// 配列のindex＝ペン番号
		// index＝０は空き番
		if( !("PW" in curState) ){
			curState["PW"] = {};
		}
		if( !("penWidth" in curState["PW"]) ){
			curState["PW"]["penWidth"] = new Array(numberOfPens+1);
			for( var i=0; i<numberOfPens+1; i++ ){
				curState["PW"]["penWidth"][i] = defaultPenWidth;
			}
		}
		
//console.log("penNumber:"+penNumber);
		// 指定されたペン番号の幅を設定する
		for( var i=0; i<numberOfPens; i++ ){
			if( (penNumber == -1) || (penNumber == i) ){	// ペン番号の指定がない場合は、全部
				curState["PW"]["penWidth"][i] = penWidth*30;	// *30は、これくらいにするとちょうどよかった。
//console.log("pen-width("+i+"):" + penWidth*30);
			}
		}
	},
	
	/*
	RO, Rotate Coordinate System
	
	Syntax
		RO angle[;]
			or
		RO [;]
	p.275
	
	反時計回りに回転。
	デフォルト0。
	*/
	RO : function(p, ctx, curState){
// いまのところ、使わないかも？
/*
		if( p.length > 0 ){
			if(
				( p[0] ==   0 )	||
				( p[0] ==  90 )	||
				( p[0] == 120 )	||
				( p[0] == 270 )
			){
				if( !("RO" in curState) ){
					curState["RO"] = {};
				}
				var rot = p[0] - 0;
				
				// radianへ変更しておく
				rot = Math.PI * rot / 180.0;
				curState["RO"]["rotate"] = rot;
				console.log("  rotate:"+Math.round(rot*100)/100);
				// sin、cosを計算しておく
				curState["RO"]["sin"] = Math.sin(rot);
				curState["RO"]["cos"] = Math.cos(rot);
				console.log("  sin:" + Math.round(curState["RO"]["sin"]*10)/10);
				console.log("  cos:" + Math.round(curState["RO"]["cos"]*10)/10);
			}
		}
*/
	},
	
	/*
	SD, Standard Font Definition
	
	Syntax
		SD kind,value...[,kind,value] [;]
			or
		SD [;]
	
	p.296
	
	Kind    Attribute       Range of Values         Default Value       Description
	------- --------------- ----------------------- ------------------- ---------------------
	1       Character set   device-dependent        277                 Roman-8
	2       Font Spacing    0 (fixed),              device-dependent    fixed spacing
	                        1 (proportional)
	3       Pitch           >0 to 32 767 (valid to  device-dependent    characters per inch
	                        2 decimal places)
	4       Height          0 to 32 767             device-dependent    font point size
	5       Posture         0 to 32 767             device-dependent    upright or italic
	6       Stroke Weight   -7 to 7, 9999           0                   normal
	7       Typeface        device-dependent        device-dependent    scalable font

	メモ
	RelatedInstructions
		AD Alternate Font Definition
		DT Define Label Terminator
		FI Select Primary Font
		FN Select Secondary Font
		LB Label
		SA Select Alternate Font
		SB Scalable or Bitmap Fonts
		SI Absolute Character Size
		SR Relative Character Size
		SS Select Standard Font
		TD Transparent Data
	
	*/
	SD : function(p, ctx, curState){
		if( !("SD" in curState) ){
			curState["SD"] = {};
		}
		
		for( var i=0; i<p.length; i+=2 ){
			if( p[i]==1 ){
				// Kind=1:Character set
				curState["SD"]["charactorSet"] = p[i+1];
			}else if( p[i]==2 ){
				// Kind=2:Font Spacing
				curState["SD"]["fontSpacing"] = p[i+1];
			}else if( p[i]==3 ){
				// Kind=3:Pitch
				curState["SD"]["pitch"] = p[i+1];
			}else if( p[i]==4 ){
				// Kind=4:Height
				curState["SD"]["fontHeight"] = p[i+1];
			}else if( p[i]==5 ){
				// Kind=5:Posture
				curState["SD"]["fontPosture"] = p[i+1];
			}else if( p[i]==6 ){
				// Kind=6:Stroke Weight
				curState["SD"]["strokeWeight"] = p[i+1];
			}else if( p[i]==7 ){
				// Kind=7:Typeface
				curState["SD"]["typeface"] = p[i+1];
			}
		}
	},
	
	/*
	SP, Select Pen
	
	Purpose
		To select the device’s logical pen for subsequent plotting. An SP instruction must be included
		at the beginning of each instruction sequence to enable the device to draw.
	Syntax
		SP pen_number[;]
			or
		SP [;]
	*/
	SP : function(p, ctx, curState, matrix){
		var pn = 0;
		if( p.length > 0 ){
			pn = p[0]-0;
		}
		
		// current pen noを登録
		if( !("SP" in curState) ){
			curState["SP"] = {};
		}
		curState["SP"]["curPenNo"] = pn;
		
		// current pen noに対するペン太さを取得
		// ない場合は、適当
		var penWidth = 0.35;
		if( "PW" in curState ){
			if( "penWidth" in curState["PW"] ){
				if( pn <= curState["PW"]["penWidth"].length ){
					penWidth = curState["PW"]["penWidth"][pn];
//console.log("found pen["+pn+"]! width="+penWidth);
				}
			}
		}
//console.log("penWidth:"+penWidth);
		
		// [penWidth, 0]のベクトルを、matrixに掛けて
		// その結果の長さを太さとする
		var matrixNoMove = matrixlib.copy(matrix);
		matrixNoMove[0][2] = 0; matrixNoMove[1][2] = 0;	// 平行移動成分を除く
		var newPenVec = matrixlib.apply3x1(matrixNoMove, [penWidth,0,0]);
		var newLineWidth = Math.sqrt( newPenVec[0]*newPenVec[0] + newPenVec[1]*newPenVec[1] );
		// 細い場合に適当に太くする
		if( newLineWidth < 0.5 ){
			newLineWidth = 0.5;
		}
		ctx.lineWidth = newLineWidth;
//console.log("lineWidth:"+ctx.lineWidth);
	},
	
	/*
	SS, Select Standard Font
	
	Syntax
		SS [;]
	
	p.311
	*/
	SS : function(p, ctx, curState){
		// 実装なし
	}
	
	
	/*
	雛形
	AA : function(p, ctx, curState){
	*/
};


function getCanvasPos( vec, mtx0 )
{
	return {
		x : mtx0[0][0]*vec.x + mtx0[0][1]*vec.y + mtx0[0][2],
		y : mtx0[1][0]*vec.x + mtx0[1][1]*vec.y + mtx0[1][2]
	};
}

// pos1とpos2で構成する長方形がcvsに入るかどうかを返す
function isInCanvas(pos1, pos2, cvs)
{
	if(
		( (pos1.x<0) && (pos2.x<0) ) ||
		( (cvs.width<pos1.x) && (cvs.width<pos2.x) ) ||
		( (pos1.y<0) && (pos2.y<0) ) ||
		( (cvs.height<pos1.y) && (cvs.height<pos2.y) )
	){
		return false;
	}
	return true;

}

// getCirclePoints
// 中心、半径、開始位置、角度、弦角度から、描画点群を得る。
// 円弧を、円弧で描かず線群で描くときに利用する。
function getCirclePoints(posCenter, r, posBegin, a, chord)
{
/*
console.log(posCenter);
console.log(r);
console.log(posBegin);
console.log(a);
console.log(chord);
*/
	var points = new Array();
	points.push(posBegin);
	
	chord = chord - 0;
	var cos = Math.cos(Math.PI*chord/180);
	var sin = Math.sin(Math.PI*chord/180);
	
	var curAngle = 0.0;
	var prevPos = {x:posBegin.x, y:posBegin.y};
	while(curAngle <= a)
	{
		var curPos = {x:0.0, y:0.0};
		curPos.x = prevPos.x;
		curPos.y = prevPos.y;
		
		// 回転中心を原点へ変更移動
		curPos.x -= posCenter.x;
		curPos.y -= posCenter.y;
		
		// chord分回転
		var tmpx = curPos.x;
		var tmpy = curPos.y;
		curPos.x = tmpx * cos - tmpy * sin;
		curPos.y = tmpx * sin + tmpy * cos;
		
		// 原点から回転中心へ平行移動
		curPos.x += posCenter.x;
		curPos.y += posCenter.y;
		
		// pointsへ登録
		points.push( curPos );
		
		prevPos.x = curPos.x;
		prevPos.y = curPos.y;
		
		curAngle += chord;
	}
	
	return points;
}


// 高速化情報を取得
function getSpeedupElement(hpgl2Mnemonic, hpgl2Parameters)
{
	if( hpgl2Mnemonic == "PA" ){
		var minx = Number.MAX_VALUE;
		var miny = Number.MAX_VALUE;
		var maxx = (-1)*Number.MAX_VALUE;
		var maxy = (-1)*Number.MAX_VALUE;
		
		for( var i=0; i<hpgl2Parameters.length; i++ ){
			var n = hpgl2Parameters[i] - 0;
//console.log(n);
			if( i%2==0 ){
				// 偶数の場合はx
				if( n < minx ){
					minx = n;
				}
				if( n > maxx ){
					maxx = n;
				}
			}else{
				// 奇数の場合はy
				if( n < miny ){
					miny = n;
				}
				if( n > maxy ){
					maxy = n;
				}
			}
		}
		
//console.log("minx"+minx+ "miny"+miny+ "maxx"+maxx+ "maxy"+maxy);
		return {"minx":minx, "miny":miny, "maxx":maxx, "maxy":maxy};
	}else{
		return null;
	}
}

